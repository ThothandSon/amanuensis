use std::env;
use std::io::{Read, Write};
use std::net::TcpListener;
use std::path::PathBuf;

use amanuensis_core::ocr::{ChunkGranularity, OcrPipelineConfig};
use amanuensis_core::project::OnboardingConfig;
use amanuensis_desktop::AppState;
use serde::Deserialize;

#[derive(Deserialize)]
struct FormatOcrReq {
    raw_ocr: String,
    granularity: Option<ChunkGranularity>,
    dehyphenate_line_breaks: bool,
}

#[derive(Deserialize)]
struct TranslateReq {
    segment_index: usize,
}

#[derive(Deserialize)]
struct ConfirmReq {
    segment_index: usize,
    final_target_text: String,
}

#[derive(Deserialize)]
struct OcrReq {
    document_name: String,
    raw_pages_ocr: Option<Vec<String>>,
    dehyphenate_line_breaks: bool,
}

#[derive(Deserialize)]
struct PdfUploadReq {
    document_name: String,
    pdf_base64: String,
    dehyphenate_line_breaks: bool,
}

fn main() {
    let args: Vec<String> = env::args().collect();
    let state = AppState::new().expect("Failed to initialize Amanuensis core state");

    if args.iter().any(|a| a == "--init-harness") {
        let target_dir = args
            .windows(2)
            .find(|w| w[0] == "--init-harness")
            .map(|w| PathBuf::from(&w[1]))
            .unwrap_or_else(|| PathBuf::from("sample-project"));

        let ws = state.workspace.lock().unwrap();
        let saved_path = ws
            .harness
            .save_to_disk(&target_dir)
            .expect("Failed to write project harness to disk");
        println!(
            "Amanuensis project harness initialized at: {}",
            saved_path.display()
        );
        return;
    }

    if args.iter().any(|a| a == "--serve") {
        let dist_dir = args
            .windows(2)
            .find(|w| w[0] == "--dist-dir")
            .map(|w| PathBuf::from(&w[1]))
            .unwrap_or_else(|| PathBuf::from("dist"));
        let addr = "127.0.0.1:4173";
        let listener = TcpListener::bind(addr).expect("Failed to bind local IPC/HTTP bridge");
        println!(
            "Amanuensis Rust Core Server listening on http://{addr} (dist: {})",
            dist_dir.display()
        );
        for stream in listener.incoming().flatten() {
            handle_http_client(stream, &state, &dist_dir);
        }
        return;
    }

    let snapshot = state
        .get_workbench_snapshot()
        .expect("Failed to capture workbench snapshot");
    println!(
        "Amanuensis Core Engine Ready | Project: {} | TM Banks: {} | Active Skills: {} | Themes: {}",
        snapshot.harness.project_name,
        snapshot.tm_banks.len(),
        snapshot.harness.skills.len(),
        snapshot.themes.len()
    );
}

fn handle_http_client(
    mut stream: std::net::TcpStream,
    state: &AppState,
    dist_dir: &std::path::Path,
) {
    let _ = stream.set_read_timeout(Some(std::time::Duration::from_secs(5)));
    let mut data = Vec::with_capacity(65536);
    let mut chunk = [0u8; 32768];
    let mut header_end_idx: Option<usize> = None;
    let mut content_length: usize = 0;

    loop {
        match stream.read(&mut chunk) {
            Ok(0) => break,
            Ok(n) => {
                data.extend_from_slice(&chunk[..n]);
                if header_end_idx.is_none() {
                    if let Some(pos) = data.windows(4).position(|w| w == b"\r\n\r\n") {
                        let end = pos + 4;
                        header_end_idx = Some(end);
                        let hdr_str = String::from_utf8_lossy(&data[..end]);
                        for line in hdr_str.lines() {
                            if line.to_ascii_lowercase().starts_with("content-length:") {
                                if let Some(val) = line.split(':').nth(1) {
                                    content_length = val.trim().parse::<usize>().unwrap_or(0);
                                }
                            }
                        }
                    }
                }
                if let Some(end) = header_end_idx {
                    if data.len() >= end + content_length {
                        break;
                    }
                }
            }
            Err(_) => break,
        }
    }

    if data.is_empty() {
        return;
    }
    let req_str = String::from_utf8_lossy(&data);
    let first_line = req_str.lines().next().unwrap_or("");
    let parts: Vec<&str> = first_line.split_whitespace().collect();
    if parts.len() < 2 {
        return;
    }
    let method = parts[0];
    let path = parts[1];

    if method == "OPTIONS" {
        let _ = write_json_response(&mut stream, 200, "{}");
        return;
    }

    // Serve static frontend assets if not an /api/ route
    if method == "GET" && !path.starts_with("/api/") {
        let clean_rel = path.trim_start_matches('/').split('?').next().unwrap_or("");
        let target_file = if clean_rel.is_empty() {
            dist_dir.join("index.html")
        } else {
            dist_dir.join(clean_rel)
        };
        if let Ok(bytes) = std::fs::read(&target_file) {
            let mime = if target_file.extension().and_then(|e| e.to_str()) == Some("js") {
                "application/javascript; charset=utf-8"
            } else if target_file.extension().and_then(|e| e.to_str()) == Some("css") {
                "text/css; charset=utf-8"
            } else if target_file.extension().and_then(|e| e.to_str()) == Some("png") {
                "image/png"
            } else if target_file.extension().and_then(|e| e.to_str()) == Some("svg") {
                "image/svg+xml"
            } else {
                "text/html; charset=utf-8"
            };
            let header = format!(
                "HTTP/1.1 200 OK\r\nContent-Type: {mime}\r\nContent-Length: {}\r\nConnection: close\r\n\r\n",
                bytes.len()
            );
            let _ = stream.write_all(header.as_bytes());
            let _ = stream.write_all(&bytes);
            let _ = stream.flush();
            return;
        }
    }

    let body = if let Some(end) = header_end_idx {
        String::from_utf8_lossy(&data[end..])
            .trim_matches(char::from(0))
            .to_string()
    } else {
        String::new()
    };
    let body = body.as_str();

    let response_json = match (method, path) {
        ("GET", "/api/snapshot") => state
            .get_workbench_snapshot()
            .and_then(|s| serde_json::to_string(&s).map_err(|e| e.to_string())),
        ("POST", "/api/translate") => serde_json::from_str::<TranslateReq>(body)
            .map_err(|e| e.to_string())
            .and_then(|req| state.translate_segment_local(req.segment_index))
            .and_then(|res| serde_json::to_string(&res).map_err(|e| e.to_string())),
        ("POST", "/api/confirm") => serde_json::from_str::<ConfirmReq>(body)
            .map_err(|e| e.to_string())
            .and_then(|req| {
                let learned =
                    state.confirm_segment_translation(req.segment_index, req.final_target_text)?;
                if let Ok(ws) = state.workspace.lock() {
                    let _ = ws.harness.save_to_disk(PathBuf::from("sample-project"));
                }
                serde_json::to_string(&learned).map_err(|e| e.to_string())
            }),
        ("POST", "/api/ocr") => serde_json::from_str::<OcrReq>(body)
            .map_err(|e| e.to_string())
            .and_then(|req| {
                let cfg = OcrPipelineConfig {
                    dehyphenate_line_breaks: req.dehyphenate_line_breaks,
                    ..Default::default()
                };
                state.convert_scanned_pdf(req.document_name, req.raw_pages_ocr, cfg)
            })
            .and_then(|res| serde_json::to_string(&res).map_err(|e| e.to_string())),
        ("POST", "/api/ocr/pdf-upload") => serde_json::from_str::<PdfUploadReq>(body)
            .map_err(|e| e.to_string())
            .and_then(|req| {
                let cfg = OcrPipelineConfig {
                    dehyphenate_line_breaks: req.dehyphenate_line_breaks,
                    ..Default::default()
                };
                let pdf_bytes = base64_decode(&req.pdf_base64);
                state.convert_uploaded_pdf_bytes(req.document_name, &pdf_bytes, cfg)
            })
            .and_then(|res| serde_json::to_string(&res).map_err(|e| e.to_string())),
        ("POST", "/api/ocr/format-with-harness") => serde_json::from_str::<FormatOcrReq>(body)
            .map_err(|e| e.to_string())
            .and_then(|req| {
                state.format_ocr_with_harness(
                    req.raw_ocr,
                    req.granularity.unwrap_or_default(),
                    req.dehyphenate_line_breaks,
                )
            })
            .and_then(|res| serde_json::to_string(&res).map_err(|e| e.to_string())),
        ("POST", "/api/onboarding/complete") => serde_json::from_str::<OnboardingConfig>(body)
            .map_err(|e| e.to_string())
            .and_then(|cfg| {
                let home = env::var("HOME").unwrap_or_else(|_| ".".to_string());
                let slug: String = cfg
                    .project_name
                    .to_lowercase()
                    .chars()
                    .map(|c| if c.is_alphanumeric() { c } else { '-' })
                    .collect();
                let project_dir = PathBuf::from(home)
                    .join(".amanuensis")
                    .join("projects")
                    .join(slug.trim_matches('-'));
                state.complete_onboarding(cfg, &project_dir)
            })
            .and_then(|snap| serde_json::to_string(&snap).map_err(|e| e.to_string())),
        ("POST", "/api/onboarding/reset") => state
            .reset_onboarding()
            .and_then(|snap| serde_json::to_string(&snap).map_err(|e| e.to_string())),
        _ => Err(format!("Route not found: {method} {path}")),
    };

    match response_json {
        Ok(json) => {
            let _ = write_json_response(&mut stream, 200, &json);
        }
        Err(err) => {
            let payload = serde_json::json!({ "error": err }).to_string();
            let _ = write_json_response(&mut stream, 400, &payload);
        }
    }
}

fn write_json_response(
    stream: &mut std::net::TcpStream,
    status: u16,
    body: &str,
) -> std::io::Result<()> {
    let status_text = if status == 200 { "OK" } else { "Bad Request" };
    let header = format!(
        "HTTP/1.1 {status} {status_text}\r\n\
         Content-Type: application/json; charset=utf-8\r\n\
         Access-Control-Allow-Origin: *\r\n\
         Access-Control-Allow-Methods: GET, POST, OPTIONS\r\n\
         Access-Control-Allow-Headers: Content-Type\r\n\
         Content-Length: {}\r\n\
         Connection: close\r\n\r\n",
        body.len()
    );
    stream.write_all(header.as_bytes())?;
    stream.write_all(body.as_bytes())?;
    stream.flush()
}

fn base64_decode(input: &str) -> Vec<u8> {
    let clean = input.split(',').next_back().unwrap_or(input);
    let mut out = Vec::with_capacity(clean.len() * 3 / 4);
    let mut buf: u32 = 0;
    let mut bits: u8 = 0;
    for b in clean.bytes() {
        let val = match b {
            b'A'..=b'Z' => b - b'A',
            b'a'..=b'z' => b - b'a' + 26,
            b'0'..=b'9' => b - b'0' + 52,
            b'+' => 62,
            b'/' => 63,
            _ => continue,
        };
        buf = (buf << 6) | (val as u32);
        bits += 6;
        if bits >= 8 {
            bits -= 8;
            out.push(((buf >> bits) & 0xFF) as u8);
        }
    }
    out
}
