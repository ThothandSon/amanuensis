use serde::{Deserialize, Serialize};

use crate::harness::LearnedRule;
use crate::project::{SegmentStatus, TranslationSegment};

/// A single row in the Trados-inspired Bilingual Review Table (`.docx` Round-Trip).
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct BilingualReviewRow {
    pub segment_index: usize,
    pub segment_id: String,
    pub chapter_or_file: String,
    pub source_text: String,
    pub target_text: String,
    pub reviewer_notes: String,
}

/// Represents a detected change when re-importing a `.docx` Bilingual Review file edited by an external proofreader/editor.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BilingualReviewDiffItem {
    pub segment_index: usize,
    pub segment_id: String,
    pub source_text: String,
    pub original_target_text: String,
    pub reviewed_target_text: String,
    pub reviewer_comment: String,
    pub has_text_change: bool,
    pub suggested_harness_rule: Option<LearnedRule>,
}

/// Summary of a `.docx` Bilingual Review Round-Trip import.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BilingualReviewImportReport {
    pub total_rows_parsed: usize,
    pub modified_segments_count: usize,
    pub commented_segments_count: usize,
    pub diffs: Vec<BilingualReviewDiffItem>,
}

/// Represents a chapter inside a multi-chapter `.epub` (`Chain Files` — Wordfast style).
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct EpubChapterUnit {
    pub chapter_id: String,
    pub xhtml_href: String,
    pub toc_title: String,
    pub paragraph_sources: Vec<String>,
}

/// Subtitle cue with timing and Characters-Per-Second (`CPS`) diagnostics for `.srt` / `.vtt`.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SubtitleCueDiagnostic {
    pub cue_number: usize,
    pub timecode_raw: String,
    pub start_ms: u64,
    pub end_ms: u64,
    pub duration_secs: f32,
    pub source_text: String,
    pub target_text: String,
    pub target_char_count: usize,
    pub chars_per_second: f32,
    pub max_line_length: usize,
    pub line_count: usize,
    pub cps_status: SubtitleCpsStatus,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
pub enum SubtitleCpsStatus {
    Optimal,      // <= 17.0 CPS and <= 42 chars/line
    WarningFast,  // > 17.0 and <= 20.0 CPS
    ExceedsLimit, // > 20.0 CPS or > 42 chars/line
}

/// Engine for Issue #5:
/// 1. Bilingual `.docx` Review Table Export & Track-Changes Re-import Round-Trip (Trados-inspired, zero Tag-Soup)
/// 2. Multi-Chapter `.epub` Chain-Files & `.srt`/`.vtt` Subtitle CPS Validator/Exporter (Wordfast-inspired)
pub struct BilingualReviewAndMediaEngine;

impl BilingualReviewAndMediaEngine {
    /// Generates a Word-compatible Bilingual Review Document (HTML/DOCX table + structured markers)
    /// with columns: `[#ID | Original | Tradução | Notas/Comentários da Revisão]`.
    pub fn export_bilingual_review_document(
        project_title: &str,
        source_lang: &str,
        target_lang: &str,
        segments: &[TranslationSegment],
    ) -> String {
        let mut out = String::new();
        out.push_str("<!DOCTYPE html>\n<html><head><meta charset=\"utf-8\">\n");
        out.push_str("<title>Revisão Bilíngue Amanuensis — ");
        out.push_str(&escape_html(project_title));
        out.push_str("</title>\n");
        out.push_str("<style>\n");
        out.push_str("body { font-family: 'Georgia', 'Times New Roman', serif; margin: 24px; color: #111; }\n");
        out.push_str("h1 { font-size: 18pt; margin-bottom: 4px; }\n");
        out.push_str(
            "p.meta { font-size: 10pt; color: #444; margin-top: 0; margin-bottom: 16px; }\n",
        );
        out.push_str("table { width: 100%; border-collapse: collapse; table-layout: fixed; }\n");
        out.push_str("th, td { border: 1px solid #333; padding: 8px 10px; vertical-align: top; font-size: 10.5pt; line-height: 1.45; word-wrap: break-word; }\n");
        out.push_str("th { background: #e8eef5; font-weight: bold; text-align: left; }\n");
        out.push_str("td.col-id { width: 11%; font-family: monospace; font-size: 9pt; background: #f8f9fa; }\n");
        out.push_str("td.col-src { width: 37%; }\n");
        out.push_str("td.col-tgt { width: 37%; }\n");
        out.push_str("td.col-notes { width: 15%; font-size: 9.5pt; color: #333; }\n");
        out.push_str("</style></head><body>\n");
        out.push_str(&format!(
            "<h1>📝 Tabela de Revisão Bilíngue — {}</h1>\n",
            escape_html(project_title)
        ));
        out.push_str(&format!(
            "<p class=\"meta\">Par de Idiomas: <strong>{} → {}</strong> • Total de Segmentos: <strong>{}</strong> • Edite a coluna <em>Tradução</em> ou adicione observações em <em>Notas/Comentários</em> e reimporte no Amanuensis.</p>\n",
            escape_html(source_lang),
            escape_html(target_lang),
            segments.len()
        ));
        out.push_str("<table>\n<thead><tr><th>#ID</th><th>Original</th><th>Tradução (Editável pela Revisão)</th><th>Notas / Comentários</th></tr></thead>\n<tbody>\n");

        for (idx, seg) in segments.iter().enumerate() {
            // Structured row marker so plain-text extraction via `textutil -convert txt` or HTML parser both round-trip 100% deterministically
            out.push_str(&format!(
                "<tr data-seg-idx=\"{}\" data-seg-id=\"{}\">\n",
                idx,
                escape_html(&seg.id)
            ));
            out.push_str(&format!(
                "  <td class=\"col-id\">[[SEG:{}]]<br/>#{}</td>\n",
                idx + 1,
                idx + 1
            ));
            out.push_str(&format!(
                "  <td class=\"col-src\">{}</td>\n",
                escape_html(&seg.source_text)
            ));
            out.push_str(&format!(
                "  <td class=\"col-tgt\">[[TGT_START:{}]]{}[[TGT_END:{}]]</td>\n",
                idx + 1,
                escape_html(&seg.target_text),
                idx + 1
            ));
            out.push_str(&format!(
                "  <td class=\"col-notes\">[[NOTE_START:{}]][[NOTE_END:{}]]</td>\n",
                idx + 1,
                idx + 1
            ));
            out.push_str("</tr>\n");
        }

        out.push_str("</tbody></table>\n</body></html>\n");
        out
    }

    /// Parses a returned Bilingual Review document (either from marker format `[[TGT_START:N]]...[[TGT_END:N]]`
    /// or pipe/tab-delimited table rows `#N | Original | Tradução Revisada | Comentário`),
    /// computes diffs against the current project segments, and synthesizes candidate `LearnedRule`s for `.amanuensis/AGENT.md`.
    pub fn reimport_bilingual_review_document(
        segments: &[TranslationSegment],
        reviewed_payload: &str,
    ) -> BilingualReviewImportReport {
        let mut parsed_rows: Vec<(usize, String, String)> = Vec::new();

        // 1. Check if payload contains [[TGT_START:N]] markers
        for idx in 0..segments.len() {
            let num = idx + 1;
            let tgt_start_tag = format!("[[TGT_START:{}]]", num);
            let tgt_end_tag = format!("[[TGT_END:{}]]", num);
            if let Some(s_pos) = reviewed_payload.find(&tgt_start_tag) {
                let after_start = &reviewed_payload[s_pos + tgt_start_tag.len()..];
                if let Some(e_pos) = after_start.find(&tgt_end_tag) {
                    let raw_tgt = unescape_html(after_start[..e_pos].trim());
                    let note_start_tag = format!("[[NOTE_START:{}]]", num);
                    let note_end_tag = format!("[[NOTE_END:{}]]", num);
                    let note = if let Some(ns) = reviewed_payload.find(&note_start_tag) {
                        let after_ns = &reviewed_payload[ns + note_start_tag.len()..];
                        if let Some(ne) = after_ns.find(&note_end_tag) {
                            unescape_html(after_ns[..ne].trim())
                        } else {
                            String::new()
                        }
                    } else {
                        String::new()
                    };
                    parsed_rows.push((idx, raw_tgt, note));
                }
            }
        }

        // 2. Also support Markdown / Word plain-text table rows: `#1 | Source | Reviewed Target | Optional Note`
        if parsed_rows.is_empty() {
            for line in reviewed_payload.lines() {
                let trimmed = line.trim().trim_matches('|').trim();
                if trimmed.is_empty() || trimmed.starts_with("---") || trimmed.starts_with("#ID") {
                    continue;
                }
                let cols: Vec<&str> = line
                    .trim()
                    .trim_matches('|')
                    .split('|')
                    .map(|c| c.trim())
                    .collect();
                if cols.len() >= 3 {
                    let id_col = cols[0]
                        .trim_start_matches('#')
                        .trim_start_matches("seg-")
                        .trim();
                    if let Ok(one_based) = id_col.parse::<usize>() {
                        if one_based >= 1 && one_based <= segments.len() {
                            let idx = one_based - 1;
                            let rev_tgt = cols[2].to_string();
                            let rev_note = if cols.len() >= 4 {
                                cols[3].to_string()
                            } else {
                                String::new()
                            };
                            parsed_rows.push((idx, rev_tgt, rev_note));
                        }
                    }
                }
            }
        }

        let mut diffs = Vec::new();
        let mut modified_count = 0usize;
        let mut commented_count = 0usize;

        for (idx, rev_tgt, rev_note) in &parsed_rows {
            if let Some(seg) = segments.get(*idx) {
                let orig_tgt = seg.target_text.trim().to_string();
                let clean_rev = rev_tgt.trim().to_string();
                let clean_note = rev_note.trim().to_string();
                let has_change = !clean_rev.is_empty() && clean_rev != orig_tgt;
                let has_comment = !clean_note.is_empty();

                if has_change {
                    modified_count += 1;
                }
                if has_comment {
                    commented_count += 1;
                }

                if has_change || has_comment {
                    let suggested_rule = if has_change {
                        Some(LearnedRule {
                            id: format!("rule-docx-rev-{}", idx + 1),
                            pattern_from: if orig_tgt.is_empty() {
                                seg.source_text.chars().take(42).collect()
                            } else {
                                orig_tgt.chars().take(42).collect()
                            },
                            preferred_to: clean_rev.chars().take(42).collect(),
                            rationale: if has_comment {
                                format!(
                                    "Revisão Externa .docx (Trecho #{}): {}",
                                    idx + 1,
                                    clean_note
                                )
                            } else {
                                format!("Revisão Externa .docx aceita no Trecho #{}", idx + 1)
                            },
                            occurrences: 1,
                            active: true,
                            created_at: "2026-11-04".to_string(),
                        })
                    } else {
                        None
                    };

                    diffs.push(BilingualReviewDiffItem {
                        segment_index: *idx,
                        segment_id: seg.id.clone(),
                        source_text: seg.source_text.clone(),
                        original_target_text: orig_tgt,
                        reviewed_target_text: if clean_rev.is_empty() {
                            seg.target_text.clone()
                        } else {
                            clean_rev
                        },
                        reviewer_comment: clean_note,
                        has_text_change: has_change,
                        suggested_harness_rule: suggested_rule,
                    });
                }
            }
        }

        BilingualReviewImportReport {
            total_rows_parsed: parsed_rows.len(),
            modified_segments_count: modified_count,
            commented_segments_count: commented_count,
            diffs,
        }
    }

    /// Applies accepted `.docx` review diffs directly to the project segments and returns the new `LearnedRule`s.
    pub fn apply_accepted_review_diffs(
        segments: &mut [TranslationSegment],
        diffs: &[BilingualReviewDiffItem],
    ) -> Vec<LearnedRule> {
        let mut rules = Vec::new();
        for item in diffs {
            if let Some(seg) = segments.get_mut(item.segment_index) {
                if item.has_text_change {
                    seg.target_text = item.reviewed_target_text.clone();
                    seg.status = SegmentStatus::Approved;
                }
                if let Some(rule) = &item.suggested_harness_rule {
                    rules.push(rule.clone());
                }
            }
        }
        rules
    }

    /// Chains multiple `.epub` XHTML chapters (`OEBPS/Text/*.xhtml` + `toc.ncx`) into a unified multi-chapter
    /// sequence (`Chain Files` — Wordfast) and exports translated XHTML preserving chapter boundaries without Tag-Soup.
    pub fn chain_epub_chapters_and_export_xhtml(
        chapters: &[EpubChapterUnit],
        translated_segments: &[TranslationSegment],
    ) -> Vec<(String, String)> {
        let mut out_files = Vec::new();
        let mut seg_cursor = 0usize;

        for chap in chapters {
            let mut xhtml = String::new();
            xhtml.push_str("<?xml version=\"1.0\" encoding=\"utf-8\"?>\n");
            xhtml.push_str("<!DOCTYPE html>\n<html xmlns=\"http://www.w3.org/1999/xhtml\" xml:lang=\"pt-BR\">\n<head>\n  <meta charset=\"utf-8\"/>\n");
            xhtml.push_str(&format!(
                "  <title>{}</title>\n</head>\n<body>\n",
                escape_html(&chap.toc_title)
            ));
            xhtml.push_str(&format!(
                "  <section id=\"{}\" data-epub-href=\"{}\">\n    <h1>{}</h1>\n",
                escape_html(&chap.chapter_id),
                escape_html(&chap.xhtml_href),
                escape_html(&chap.toc_title)
            ));

            for src_p in &chap.paragraph_sources {
                let tgt_text = translated_segments
                    .get(seg_cursor)
                    .map(|s| {
                        if s.target_text.trim().is_empty() {
                            s.source_text.as_str()
                        } else {
                            s.target_text.as_str()
                        }
                    })
                    .unwrap_or(src_p.as_str());
                seg_cursor += 1;
                xhtml.push_str(&format!("    <p>{}</p>\n", escape_html(tgt_text)));
            }

            xhtml.push_str("  </section>\n</body>\n</html>\n");
            out_files.push((chap.xhtml_href.clone(), xhtml));
        }

        out_files
    }

    /// Parses `.srt` / `.vtt` subtitle blocks and computes Characters Per Second (`CPS`) and line-length diagnostics.
    pub fn analyze_and_export_subtitles_cps(
        raw_srt_or_vtt: &str,
        target_overrides: &[String],
    ) -> (Vec<SubtitleCueDiagnostic>, String) {
        let normalized = raw_srt_or_vtt.replace("\r\n", "\n");
        let blocks: Vec<&str> = normalized
            .split("\n\n")
            .map(|b| b.trim())
            .filter(|b| !b.is_empty() && !b.starts_with("WEBVTT"))
            .collect();

        let mut diagnostics = Vec::new();
        let mut exported_srt = String::new();

        for (idx, block) in blocks.iter().enumerate() {
            let lines: Vec<&str> = block.lines().map(|l| l.trim()).collect();
            if lines.is_empty() {
                continue;
            }
            let (timecode_line, text_lines) = if lines[0].contains("-->") {
                (lines[0], &lines[1..])
            } else if lines.len() >= 2 && lines[1].contains("-->") {
                (lines[1], &lines[2..])
            } else {
                continue;
            };

            let (start_ms, end_ms) = parse_timecode_range_ms(timecode_line);
            let duration_secs = ((end_ms.saturating_sub(start_ms)) as f32 / 1000.0).max(0.5);
            let source_text = text_lines.join("\n");
            let target_text = target_overrides
                .get(idx)
                .filter(|t| !t.trim().is_empty())
                .cloned()
                .unwrap_or_else(|| source_text.clone());

            let visible_chars = target_text
                .chars()
                .filter(|c| !c.is_control() && *c != '\n')
                .count();
            let cps = ((visible_chars as f32 / duration_secs) * 10.0).round() / 10.0;
            let tgt_lines: Vec<&str> = target_text.lines().collect();
            let line_count = tgt_lines.len().max(1);
            let max_line_length = tgt_lines
                .iter()
                .map(|l| l.chars().count())
                .max()
                .unwrap_or(0);

            let cps_status = if cps > 20.0 || max_line_length > 42 || line_count > 2 {
                SubtitleCpsStatus::ExceedsLimit
            } else if cps > 17.0 {
                SubtitleCpsStatus::WarningFast
            } else {
                SubtitleCpsStatus::Optimal
            };

            diagnostics.push(SubtitleCueDiagnostic {
                cue_number: idx + 1,
                timecode_raw: timecode_line.to_string(),
                start_ms,
                end_ms,
                duration_secs,
                source_text,
                target_text: target_text.clone(),
                target_char_count: visible_chars,
                chars_per_second: cps,
                max_line_length,
                line_count,
                cps_status,
            });

            exported_srt.push_str(&format!(
                "{}\n{}\n{}\n\n",
                idx + 1,
                timecode_line,
                target_text
            ));
        }

        (diagnostics, exported_srt.trim_end().to_string())
    }
}

fn parse_timecode_range_ms(line: &str) -> (u64, u64) {
    let parts: Vec<&str> = line.split("-->").map(|p| p.trim()).collect();
    if parts.len() != 2 {
        return (0, 2000);
    }
    (
        parse_single_timestamp_ms(parts[0]),
        parse_single_timestamp_ms(parts[1]),
    )
}

fn parse_single_timestamp_ms(ts: &str) -> u64 {
    let clean = ts.split_whitespace().next().unwrap_or(ts).replace(',', ".");
    let hms: Vec<&str> = clean.split(':').collect();
    if hms.len() < 2 {
        return 0;
    }
    let (hours, mins, secs_part) = if hms.len() == 3 {
        (
            hms[0].parse::<u64>().unwrap_or(0),
            hms[1].parse::<u64>().unwrap_or(0),
            hms[2],
        )
    } else {
        (0, hms[0].parse::<u64>().unwrap_or(0), hms[1])
    };
    let sec_ms: Vec<&str> = secs_part.split('.').collect();
    let secs = sec_ms[0].parse::<u64>().unwrap_or(0);
    let millis = if sec_ms.len() > 1 {
        let mut m_str = sec_ms[1].to_string();
        while m_str.len() < 3 {
            m_str.push('0');
        }
        m_str[..3].parse::<u64>().unwrap_or(0)
    } else {
        0
    };
    hours * 3_600_000 + mins * 60_000 + secs * 1_000 + millis
}

fn escape_html(input: &str) -> String {
    input
        .replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
}

fn unescape_html(input: &str) -> String {
    input
        .replace("&quot;", "\"")
        .replace("&gt;", ">")
        .replace("&lt;", "<")
        .replace("&amp;", "&")
}
