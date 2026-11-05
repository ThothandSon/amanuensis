use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::Path;
use strsim::normalized_levenshtein;

use crate::CoreError;

/// Represents an auxiliary or primary Translation Memory database bank.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TmBank {
    pub id: String,
    pub name: String,
    pub description: String,
    pub source_lang: String,
    pub target_lang: String,
    pub is_primary: bool,
    pub read_only: bool,
    pub weight: f64,
    pub entry_count: usize,
}

/// A single translation unit stored inside a TM bank.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TmEntry {
    pub id: i64,
    pub bank_id: String,
    pub bank_name: String,
    pub source_text: String,
    pub target_text: String,
    pub context_prev: Option<String>,
    pub context_next: Option<String>,
    pub domain: Option<String>,
    pub updated_at: String,
}

/// A ranked match returned by the hybrid RRF (FTS5 BM25 + Fuzzy Levenshtein + Dense Vector) search.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TmMatch {
    pub entry: TmEntry,
    /// Combined match percentage (0.0 to 101.0, where 101% = Exact + Context match)
    pub similarity_pct: f64,
    pub lexical_score: f64,
    pub semantic_score: f64,
    pub rrf_score: f64,
    pub match_type: TmMatchType,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum TmMatchType {
    /// 101% - Exact text match + matching surrounding context
    ContextExact,
    /// 100% - Exact text match
    Exact,
    /// 70% - 99% - High lexical/edit-distance similarity
    Fuzzy,
    /// Semantic/paraphrase match via dense vector embedding + RRF
    SemanticHybrid,
}

/// SQLite-backed Hybrid Translation Memory Engine supporting primary + multiple auxiliary banks.
pub struct TranslationMemoryEngine {
    conn: Connection,
}

impl TranslationMemoryEngine {
    /// Opens or creates a SQLite TM database at the specified path (or `:memory:` for tests).
    pub fn open<P: AsRef<Path>>(path: P) -> Result<Self, CoreError> {
        let conn = Connection::open(path)?;
        Self::init_schema(&conn)?;
        Ok(Self { conn })
    }

    pub fn open_in_memory() -> Result<Self, CoreError> {
        let conn = Connection::open_in_memory()?;
        Self::init_schema(&conn)?;
        Ok(Self { conn })
    }

    fn init_schema(conn: &Connection) -> Result<(), CoreError> {
        conn.execute_batch(
            "
            PRAGMA journal_mode = WAL;
            PRAGMA synchronous = NORMAL;
            PRAGMA temp_store = MEMORY;
            PRAGMA mmap_size = 268435456;
            PRAGMA cache_size = -64000;
            PRAGMA foreign_keys = ON;

            CREATE TABLE IF NOT EXISTS tm_banks (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT NOT NULL DEFAULT '',
                source_lang TEXT NOT NULL,
                target_lang TEXT NOT NULL,
                is_primary INTEGER NOT NULL DEFAULT 0,
                read_only INTEGER NOT NULL DEFAULT 0,
                weight REAL NOT NULL DEFAULT 1.0
            );

            CREATE TABLE IF NOT EXISTS tm_entries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                bank_id TEXT NOT NULL REFERENCES tm_banks(id) ON DELETE CASCADE,
                source_text TEXT NOT NULL,
                target_text TEXT NOT NULL,
                context_prev TEXT,
                context_next TEXT,
                domain TEXT,
                embedding_blob BLOB NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_tm_entries_bank ON tm_entries(bank_id);
            CREATE INDEX IF NOT EXISTS idx_tm_entries_source ON tm_entries(source_text);

            CREATE VIRTUAL TABLE IF NOT EXISTS tm_entries_fts USING fts5(
                source_text,
                target_text,
                content='tm_entries',
                content_rowid='id',
                tokenize='unicode61 remove_diacritics 2'
            );

            CREATE TRIGGER IF NOT EXISTS tm_entries_ai AFTER INSERT ON tm_entries BEGIN
                INSERT INTO tm_entries_fts(rowid, source_text, target_text)
                VALUES (new.id, new.source_text, new.target_text);
            END;

            CREATE TRIGGER IF NOT EXISTS tm_entries_ad AFTER DELETE ON tm_entries BEGIN
                INSERT INTO tm_entries_fts(tm_entries_fts, rowid, source_text, target_text)
                VALUES ('delete', old.id, old.source_text, old.target_text);
            END;

            CREATE TRIGGER IF NOT EXISTS tm_entries_au AFTER UPDATE ON tm_entries BEGIN
                INSERT INTO tm_entries_fts(tm_entries_fts, rowid, source_text, target_text)
                VALUES ('delete', old.id, old.source_text, old.target_text);
                INSERT INTO tm_entries_fts(rowid, source_text, target_text)
                VALUES (new.id, new.source_text, new.target_text);
            END;
            ",
        )?;
        Ok(())
    }

    /// Creates a new primary or auxiliary TM bank.
    pub fn create_bank(&self, bank: &TmBank) -> Result<(), CoreError> {
        self.conn.execute(
            "INSERT OR REPLACE INTO tm_banks (id, name, description, source_lang, target_lang, is_primary, read_only, weight)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![
                bank.id,
                bank.name,
                bank.description,
                bank.source_lang,
                bank.target_lang,
                bank.is_primary as i32,
                bank.read_only as i32,
                bank.weight,
            ],
        )?;
        Ok(())
    }

    /// Lists all registered TM banks along with their live entry counts.
    pub fn list_banks(&self) -> Result<Vec<TmBank>, CoreError> {
        let mut stmt = self.conn.prepare(
            "SELECT b.id, b.name, b.description, b.source_lang, b.target_lang,
                    b.is_primary, b.read_only, b.weight,
                    COUNT(e.id) as entry_count
             FROM tm_banks b
             LEFT JOIN tm_entries e ON e.bank_id = b.id
             GROUP BY b.id
             ORDER BY b.is_primary DESC, b.weight DESC, b.name ASC",
        )?;

        let rows = stmt.query_map([], |row| {
            Ok(TmBank {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                source_lang: row.get(3)?,
                target_lang: row.get(4)?,
                is_primary: row.get::<_, i32>(5)? != 0,
                read_only: row.get::<_, i32>(6)? != 0,
                weight: row.get(7)?,
                entry_count: row.get::<_, i64>(8)? as usize,
            })
        })?;

        let mut banks = Vec::new();
        for r in rows {
            banks.push(r?);
        }
        Ok(banks)
    }

    /// Inserts or updates a translation unit inside a specific TM bank.
    pub fn add_entry(
        &self,
        bank_id: &str,
        source_text: &str,
        target_text: &str,
        context_prev: Option<&str>,
        context_next: Option<&str>,
        domain: Option<&str>,
    ) -> Result<i64, CoreError> {
        let embedding = compute_local_embedding(source_text);
        let embedding_bytes = serialize_f32_vec(&embedding);
        let now = chrono::Utc::now().to_rfc3339();

        self.conn.execute(
            "INSERT INTO tm_entries (bank_id, source_text, target_text, context_prev, context_next, domain, embedding_blob, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![
                bank_id,
                source_text.trim(),
                target_text.trim(),
                context_prev,
                context_next,
                domain,
                embedding_bytes,
                now
            ],
        )?;

        Ok(self.conn.last_insert_rowid())
    }

    /// Performs Hybrid Search (FTS5 Sparse BM25 + Fuzzy Normalized Levenshtein + Dense Vector Cosine)
    /// fused via Reciprocal Rank Fusion (RRF) across all active TM banks.
    pub fn search_hybrid(
        &self,
        query: &str,
        context_prev: Option<&str>,
        top_k: usize,
    ) -> Result<Vec<TmMatch>, CoreError> {
        let query_trimmed = query.trim();
        if query_trimmed.is_empty() {
            return Ok(Vec::new());
        }

        let query_vec = compute_local_embedding(query_trimmed);

        // 1. Sparse FTS5 retrieval for fast candidate generation
        let fts_query = build_fts5_or_query(query_trimmed);
        let mut sparse_ranks: HashMap<i64, usize> = HashMap::new();

        if !fts_query.is_empty() {
            if let Ok(mut stmt) = self.conn.prepare(
                "SELECT rowid, bm25(tm_entries_fts) as score
                 FROM tm_entries_fts
                 WHERE tm_entries_fts MATCH ?1
                 ORDER BY score ASC
                 LIMIT 50",
            ) {
                if let Ok(rows) = stmt.query_map(params![fts_query], |row| row.get::<_, i64>(0)) {
                    for (rank, row_id_res) in rows.enumerate() {
                        if let Ok(id) = row_id_res {
                            sparse_ranks.insert(id, rank);
                        }
                    }
                }
            }
        }

        // 2. Fetch candidate entries + compute dense vector cosine & exact/fuzzy Levenshtein
        let mut stmt = self.conn.prepare(
            "SELECT e.id, e.bank_id, b.name, e.source_text, e.target_text,
                    e.context_prev, e.context_next, e.domain, e.embedding_blob, e.updated_at, b.weight
             FROM tm_entries e
             JOIN tm_banks b ON b.id = e.bank_id",
        )?;

        struct RawCandidate {
            entry: TmEntry,
            bank_weight: f64,
            lexical_sim: f64,
            semantic_sim: f64,
            context_match: bool,
        }

        let mut candidates: Vec<RawCandidate> = Vec::new();
        let rows = stmt.query_map([], |row| {
            let id: i64 = row.get(0)?;
            let bank_id: String = row.get(1)?;
            let bank_name: String = row.get(2)?;
            let source_text: String = row.get(3)?;
            let target_text: String = row.get(4)?;
            let ctx_prev: Option<String> = row.get(5)?;
            let ctx_next: Option<String> = row.get(6)?;
            let domain: Option<String> = row.get(7)?;
            let blob: Vec<u8> = row.get(8)?;
            let updated_at: String = row.get(9)?;
            let bank_weight: f64 = row.get(10)?;

            Ok((
                TmEntry {
                    id,
                    bank_id,
                    bank_name,
                    source_text,
                    target_text,
                    context_prev: ctx_prev,
                    context_next: ctx_next,
                    domain,
                    updated_at,
                },
                blob,
                bank_weight,
            ))
        })?;

        let query_lower = query_trimmed.to_lowercase();
        for row_res in rows {
            let (entry, blob, bank_weight) = row_res?;
            let cand_vec = deserialize_f32_vec(&blob);
            let semantic_sim = cosine_similarity(&query_vec, &cand_vec).max(0.0);
            let lexical_sim =
                normalized_levenshtein(&query_lower, &entry.source_text.to_lowercase());
            let context_match = match (context_prev, entry.context_prev.as_deref()) {
                (Some(q_prev), Some(e_prev)) => q_prev.trim().eq_ignore_ascii_case(e_prev.trim()),
                _ => false,
            };

            candidates.push(RawCandidate {
                entry,
                bank_weight,
                lexical_sim,
                semantic_sim,
                context_match,
            });
        }

        // Sort by dense semantic similarity to assign dense ranks
        let mut dense_order: Vec<(i64, f64)> = candidates
            .iter()
            .map(|c| (c.entry.id, c.semantic_sim))
            .collect();
        dense_order.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));
        let dense_ranks: HashMap<i64, usize> = dense_order
            .into_iter()
            .enumerate()
            .map(|(idx, (id, _))| (id, idx))
            .collect();

        // Sort by lexical similarity for fuzzy rank
        let mut lexical_order: Vec<(i64, f64)> = candidates
            .iter()
            .map(|c| (c.entry.id, c.lexical_sim))
            .collect();
        lexical_order.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));
        let lexical_ranks: HashMap<i64, usize> = lexical_order
            .into_iter()
            .enumerate()
            .map(|(idx, (id, _))| (id, idx))
            .collect();

        // 3. Reciprocal Rank Fusion (RRF, k = 60) weighted by TM bank priority
        let k = 60.0;
        let mut results: Vec<TmMatch> = candidates
            .into_iter()
            .filter_map(|c| {
                let d_rank = *dense_ranks.get(&c.entry.id).unwrap_or(&1000) as f64;
                let l_rank = *lexical_ranks.get(&c.entry.id).unwrap_or(&1000) as f64;
                let s_rank = *sparse_ranks.get(&c.entry.id).unwrap_or(&500) as f64;

                let rrf_raw = 0.40 * (1.0 / (k + d_rank + 1.0))
                    + 0.35 * (1.0 / (k + l_rank + 1.0))
                    + 0.25 * (1.0 / (k + s_rank + 1.0));
                let rrf_score = rrf_raw * c.bank_weight;

                let is_exact = (c.lexical_sim - 1.0).abs() < 1e-6;
                let (match_type, similarity_pct) = if is_exact && c.context_match {
                    (TmMatchType::ContextExact, 101.0)
                } else if is_exact {
                    (TmMatchType::Exact, 100.0)
                } else if c.lexical_sim >= 0.70 {
                    (TmMatchType::Fuzzy, (c.lexical_sim * 100.0).round())
                } else if c.semantic_sim >= 0.35 || sparse_ranks.contains_key(&c.entry.id) {
                    let blended = (c.lexical_sim * 0.55 + c.semantic_sim * 0.45) * 100.0;
                    (
                        TmMatchType::SemanticHybrid,
                        blended.clamp(35.0, 94.0).round(),
                    )
                } else {
                    return None;
                };

                Some(TmMatch {
                    entry: c.entry,
                    similarity_pct,
                    lexical_score: c.lexical_sim,
                    semantic_score: c.semantic_sim,
                    rrf_score,
                    match_type,
                })
            })
            .collect();

        results.sort_by(|a, b| {
            b.similarity_pct
                .partial_cmp(&a.similarity_pct)
                .unwrap_or(std::cmp::Ordering::Equal)
                .then_with(|| {
                    b.rrf_score
                        .partial_cmp(&a.rrf_score)
                        .unwrap_or(std::cmp::Ordering::Equal)
                })
        });

        results.truncate(top_k);
        Ok(results)
    }

    /// Imports Translation Memory entries from standard TMX (XML) content into an auxiliary bank.
    pub fn import_tmx(&self, bank_id: &str, tmx_content: &str) -> Result<usize, CoreError> {
        let tu_re = regex::Regex::new(r"(?s)<tu\b[^>]*>(.*?)</tu>").unwrap();
        let tuv_re = regex::Regex::new(
            r#"(?s)<tuv\b[^>]*(?:xml:lang|lang)=["']([^"']+)["'][^>]*>.*?<seg>(.*?)</seg>.*?</tuv>"#,
        )
        .unwrap();

        let mut imported = 0;
        for tu_cap in tu_re.captures_iter(tmx_content) {
            let tu_body = &tu_cap[1];
            let mut segs: Vec<(String, String)> = Vec::new();
            for tuv_cap in tuv_re.captures_iter(tu_body) {
                let lang = tuv_cap[1].trim().to_string();
                let seg = decode_xml_entities(tuv_cap[2].trim());
                segs.push((lang, seg));
            }
            if segs.len() >= 2 {
                self.add_entry(
                    bank_id,
                    &segs[0].1,
                    &segs[1].1,
                    None,
                    None,
                    Some("TMX Import"),
                )?;
                imported += 1;
            }
        }
        Ok(imported)
    }

    /// Exports a TM bank to industry-standard TMX 1.4b XML format.
    pub fn export_tmx(&self, bank_id: &str) -> Result<String, CoreError> {
        let mut stmt = self.conn.prepare(
            "SELECT b.source_lang, b.target_lang, e.source_text, e.target_text
             FROM tm_entries e
             JOIN tm_banks b ON b.id = e.bank_id
             WHERE e.bank_id = ?1
             ORDER BY e.id ASC",
        )?;

        let mut rows = stmt.query(params![bank_id])?;
        let mut xml = String::from(
            r#"<?xml version="1.0" encoding="UTF-8"?>
<tmx version="1.4">
  <header creationtool="Amanuensis" creationtoolversion="0.1.0" datatype="PlainText" segtype="sentence" adminlang="en-us" srclang="*all*"/>
  <body>
"#,
        );

        while let Some(row) = rows.next()? {
            let src_lang: String = row.get(0)?;
            let tgt_lang: String = row.get(1)?;
            let src_text: String = row.get(2)?;
            let tgt_text: String = row.get(3)?;

            xml.push_str(&format!(
                "    <tu>\n      <tuv xml:lang=\"{}\"><seg>{}</seg></tuv>\n      <tuv xml:lang=\"{}\"><seg>{}</seg></tuv>\n    </tu>\n",
                escape_xml(&src_lang),
                escape_xml(&src_text),
                escape_xml(&tgt_lang),
                escape_xml(&tgt_text),
            ));
        }

        xml.push_str("  </body>\n</tmx>\n");
        Ok(xml)
    }

    /// Imports Translation Memory entries from CSV/TSV (`source,target[,domain]`).
    pub fn import_csv(&self, bank_id: &str, csv_content: &str) -> Result<usize, CoreError> {
        let mut imported = 0;
        for (line_idx, line) in csv_content.lines().enumerate() {
            let trimmed = line.trim();
            if trimmed.is_empty() {
                continue;
            }
            // Skip header row if detected
            if line_idx == 0
                && (trimmed.to_lowercase().starts_with("source,target")
                    || trimmed.to_lowercase().starts_with("source\ttarget"))
            {
                continue;
            }

            let parts: Vec<&str> = if trimmed.contains('\t') {
                trimmed.splitn(3, '\t').collect()
            } else {
                trimmed.splitn(3, ',').collect()
            };

            if parts.len() >= 2 {
                let src = parts[0].trim().trim_matches('"');
                let tgt = parts[1].trim().trim_matches('"');
                let dom = parts
                    .get(2)
                    .map(|d| d.trim().trim_matches('"'))
                    .or(Some("CSV Import"));
                if !src.is_empty() && !tgt.is_empty() {
                    self.add_entry(bank_id, src, tgt, None, None, dom)?;
                    imported += 1;
                }
            }
        }
        Ok(imported)
    }

    /// Exports a TM bank to CSV format (`"source","target","domain","updated_at"`).
    pub fn export_csv(&self, bank_id: &str) -> Result<String, CoreError> {
        let mut stmt = self.conn.prepare(
            "SELECT source_text, target_text, COALESCE(domain, ''), updated_at
             FROM tm_entries
             WHERE bank_id = ?1
             ORDER BY id ASC",
        )?;

        let mut rows = stmt.query(params![bank_id])?;
        let mut out = String::from("source,target,domain,updated_at\n");
        while let Some(row) = rows.next()? {
            let src: String = row.get(0)?;
            let tgt: String = row.get(1)?;
            let dom: String = row.get(2)?;
            let upd: String = row.get(3)?;
            out.push_str(&format!(
                "\"{}\",\"{}\",\"{}\",\"{}\"\n",
                src.replace('"', "\"\""),
                tgt.replace('"', "\"\""),
                dom.replace('"', "\"\""),
                upd
            ));
        }
        Ok(out)
    }

    /// Lists entries inside a specific TM bank (up to `limit`).
    pub fn list_entries(&self, bank_id: &str, limit: usize) -> Result<Vec<TmEntry>, CoreError> {
        let mut stmt = self.conn.prepare(
            "SELECT e.id, e.bank_id, b.name, e.source_text, e.target_text,
                    e.context_prev, e.context_next, e.domain, e.updated_at
             FROM tm_entries e
             JOIN tm_banks b ON b.id = e.bank_id
             WHERE e.bank_id = ?1
             ORDER BY e.id DESC
             LIMIT ?2",
        )?;

        let rows = stmt.query_map(params![bank_id, limit as i64], |row| {
            Ok(TmEntry {
                id: row.get(0)?,
                bank_id: row.get(1)?,
                bank_name: row.get(2)?,
                source_text: row.get(3)?,
                target_text: row.get(4)?,
                context_prev: row.get(5)?,
                context_next: row.get(6)?,
                domain: row.get(7)?,
                updated_at: row.get(8)?,
            })
        })?;

        let mut entries = Vec::new();
        for r in rows {
            entries.push(r?);
        }
        Ok(entries)
    }
}

fn build_fts5_or_query(text: &str) -> String {
    let tokens: Vec<String> = text
        .split(|c: char| !c.is_alphanumeric())
        .filter(|w| w.chars().count() >= 2)
        .map(|w| format!("\"{}\"", w.to_lowercase()))
        .collect();
    tokens.join(" OR ")
}

/// Computes a fast, deterministic 64-dimensional character & word n-gram hash embedding
/// for zero-dependency sub-millisecond local semantic retrieval.
pub fn compute_local_embedding(text: &str) -> Vec<f32> {
    const DIM: usize = 64;
    let mut vec = vec![0.0f32; DIM];
    let normalized = text.to_lowercase();
    let chars: Vec<char> = normalized.chars().collect();

    // Character 3-grams and 4-grams
    for n in [3usize, 4usize] {
        if chars.len() >= n {
            for window in chars.windows(n) {
                let mut h: u64 = 14695981039346656037;
                for &ch in window {
                    h ^= ch as u64;
                    h = h.wrapping_mul(1099511628211);
                }
                let idx = (h as usize) % DIM;
                let sign = if (h >> 32) & 1 == 0 { 1.0 } else { -1.0 };
                vec[idx] += sign;
            }
        }
    }

    // Word stems (first 4 chars of each word) weighted higher for semantic roots
    for word in normalized.split(|c: char| !c.is_alphanumeric()) {
        if word.len() >= 3 {
            let stem: String = word.chars().take(4).collect();
            let mut h: u64 = 14695981039346656037;
            for b in stem.bytes() {
                h ^= b as u64;
                h = h.wrapping_mul(1099511628211);
            }
            let idx = (h as usize) % DIM;
            vec[idx] += 2.5;
        }
    }

    // L2 normalize
    let norm: f32 = vec.iter().map(|v| v * v).sum::<f32>().sqrt();
    if norm > 1e-6 {
        for v in &mut vec {
            *v /= norm;
        }
    }
    vec
}

fn cosine_similarity(a: &[f32], b: &[f32]) -> f64 {
    if a.len() != b.len() || a.is_empty() {
        return 0.0;
    }
    let dot: f32 = a.iter().zip(b.iter()).map(|(x, y)| x * y).sum();
    dot as f64
}

fn serialize_f32_vec(v: &[f32]) -> Vec<u8> {
    let mut bytes = Vec::with_capacity(v.len() * 4);
    for &f in v {
        bytes.extend_from_slice(&f.to_le_bytes());
    }
    bytes
}

fn deserialize_f32_vec(bytes: &[u8]) -> Vec<f32> {
    bytes
        .chunks_exact(4)
        .map(|chunk| f32::from_le_bytes([chunk[0], chunk[1], chunk[2], chunk[3]]))
        .collect()
}

fn escape_xml(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&apos;")
}

fn decode_xml_entities(s: &str) -> String {
    s.replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&quot;", "\"")
        .replace("&apos;", "'")
        .replace("&amp;", "&")
}
