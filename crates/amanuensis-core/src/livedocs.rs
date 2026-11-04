use crate::CoreError;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::{Path, PathBuf};

/// Classification of a document inside `.amanuensis/corpus/` (LiveCorpus).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum LiveCorpusDocKind {
    /// Pair of Original + Legacy Translation aligned automatically in background without manual TMX alignment.
    BilingualAutoAligned,
    /// Previous work by the same author (`.pdf`, `.docx`, `.md`, `.epub`, `.txt`) with full paragraph context.
    AuthorPriorWork,
    /// Monolingual reference article/book in the target language for style and collocation lookup.
    MonolingualTargetReference,
}

/// Summary metadata for a document stored in `.amanuensis/corpus/`.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LiveCorpusDocument {
    pub id: String,
    pub title: String,
    pub filename: String,
    pub kind: LiveCorpusDocKind,
    pub source_lang: String,
    pub target_lang: String,
    pub passage_count: usize,
    pub avg_alignment_confidence: f32,
}

/// A single indexed passage in `LiveCorpus` preserving its surrounding paragraph context
/// (`prev_paragraph` + `source_paragraph` + `next_paragraph`) so translators can inspect
/// the full rhetorical flow of the original work.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LiveCorpusPassage {
    pub id: String,
    pub doc_id: String,
    pub doc_title: String,
    pub doc_kind: LiveCorpusDocKind,
    pub paragraph_index: usize,
    pub prev_paragraph: Option<String>,
    pub source_paragraph: String,
    pub target_paragraph: Option<String>,
    pub next_paragraph: Option<String>,
    pub alignment_confidence: f32,
}

/// Result of Longest Substring Concordance (LSC) + Sub-segment Prediction (Muse).
/// Highlights the longest contiguous n-gram in the active segment that appears in `LiveCorpus`
/// or the Translation Memory, even when overall sentence similarity is `< 50%`.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LscSubphraseMatch {
    pub source_ngram: String,
    pub word_count: usize,
    pub char_start: usize,
    pub char_end: usize,
    pub suggested_target_phrase: Option<String>,
    pub passage_id: String,
    pub doc_title: String,
    pub doc_kind: LiveCorpusDocKind,
    pub prev_paragraph: Option<String>,
    pub source_paragraph: String,
    pub target_paragraph: Option<String>,
    pub next_paragraph: Option<String>,
    pub global_sentence_similarity_pct: f32,
}

/// Engine for `.amanuensis/corpus/` (LiveDocs Corpus & Longest Substring Concordance).
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct LiveCorpusEngine {
    pub documents: Vec<LiveCorpusDocument>,
    pub passages: Vec<LiveCorpusPassage>,
    pub subsegment_lexicon: HashMap<String, String>,
}

impl LiveCorpusEngine {
    pub fn new() -> Self {
        Self {
            documents: Vec::new(),
            passages: Vec::new(),
            subsegment_lexicon: HashMap::new(),
        }
    }

    /// Registers a sub-segment phrase translation (Muse / sub-phrase equivalence)
    /// so LSC can immediately offer a target phrase suggestion when a contiguous n-gram hits.
    pub fn add_subsegment_equivalence(&mut self, source_ngram: &str, target_phrase: &str) {
        self.subsegment_lexicon.insert(
            Self::normalize_phrase(source_ngram),
            target_phrase.trim().to_string(),
        );
    }

    fn split_into_paragraphs(raw_text: &str) -> Vec<String> {
        raw_text
            .replace("\r\n", "\n")
            .split("\n\n")
            .map(|p| p.trim().to_string())
            .filter(|p| !p.is_empty())
            .collect()
    }

    /// Ingests a monolingual reference document (either `AuthorPriorWork` or `MonolingualTargetReference`)
    /// into `.amanuensis/corpus/` without requiring any manual alignment.
    pub fn ingest_monolingual_reference(
        &mut self,
        doc_id: &str,
        title: &str,
        filename: &str,
        kind: LiveCorpusDocKind,
        lang: &str,
        raw_text: &str,
    ) -> Vec<LiveCorpusPassage> {
        let paras = Self::split_into_paragraphs(raw_text);
        let mut created = Vec::new();

        for (idx, para) in paras.iter().enumerate() {
            let prev = if idx > 0 {
                Some(paras[idx - 1].clone())
            } else {
                None
            };
            let next = if idx + 1 < paras.len() {
                Some(paras[idx + 1].clone())
            } else {
                None
            };
            let passage = LiveCorpusPassage {
                id: format!("{}-p{}", doc_id, idx + 1),
                doc_id: doc_id.to_string(),
                doc_title: title.to_string(),
                doc_kind: kind.clone(),
                paragraph_index: idx,
                prev_paragraph: prev,
                source_paragraph: para.clone(),
                target_paragraph: None,
                next_paragraph: next,
                alignment_confidence: 1.0,
            };
            self.passages.push(passage.clone());
            created.push(passage);
        }

        self.documents.push(LiveCorpusDocument {
            id: doc_id.to_string(),
            title: title.to_string(),
            filename: filename.to_string(),
            kind,
            source_lang: lang.to_string(),
            target_lang: lang.to_string(),
            passage_count: created.len(),
            avg_alignment_confidence: 1.0,
        });

        created
    }

    /// Zero-configuration automatic bilingual alignment (`Original + Tradução Antiga`).
    /// Aligns paragraphs/sentences using structural position, shared numeric/date anchors,
    /// and character-length ratio heuristics — zero manual TMX aligner required.
    pub fn ingest_bilingual_pair_zero_config(
        &mut self,
        doc_id: &str,
        title: &str,
        filename: &str,
        source_lang: &str,
        target_lang: &str,
        raw_source_text: &str,
        raw_target_text: &str,
    ) -> Vec<LiveCorpusPassage> {
        let src_paras = Self::split_into_paragraphs(raw_source_text);
        let tgt_paras = Self::split_into_paragraphs(raw_target_text);
        let mut created = Vec::new();
        let mut total_conf = 0.0_f32;

        for (idx, src_p) in src_paras.iter().enumerate() {
            // Find best matching target paragraph around proportional index `idx`
            let expected_tgt_idx = if src_paras.len() <= 1 || tgt_paras.is_empty() {
                0
            } else {
                ((idx as f32 / (src_paras.len() - 1).max(1) as f32)
                    * (tgt_paras.len().saturating_sub(1) as f32))
                    .round() as usize
            };

            let mut best_tgt: Option<String> = None;
            let mut best_conf = 0.0_f32;

            if !tgt_paras.is_empty() {
                let start_w = expected_tgt_idx.saturating_sub(1);
                let end_w = (expected_tgt_idx + 1).min(tgt_paras.len() - 1);
                for cand_idx in start_w..=end_w {
                    let cand = &tgt_paras[cand_idx];
                    let conf = Self::compute_bilingual_alignment_score(src_p, cand, idx, cand_idx);
                    if conf > best_conf {
                        best_conf = conf;
                        best_tgt = Some(cand.clone());
                    }
                }
            }

            let prev = if idx > 0 {
                Some(src_paras[idx - 1].clone())
            } else {
                None
            };
            let next = if idx + 1 < src_paras.len() {
                Some(src_paras[idx + 1].clone())
            } else {
                None
            };

            total_conf += best_conf;
            let passage = LiveCorpusPassage {
                id: format!("{}-p{}", doc_id, idx + 1),
                doc_id: doc_id.to_string(),
                doc_title: title.to_string(),
                doc_kind: LiveCorpusDocKind::BilingualAutoAligned,
                paragraph_index: idx,
                prev_paragraph: prev,
                source_paragraph: src_p.clone(),
                target_paragraph: best_tgt,
                next_paragraph: next,
                alignment_confidence: (best_conf * 100.0).round() / 100.0,
            };
            self.passages.push(passage.clone());
            created.push(passage);
        }

        let avg_conf = if created.is_empty() {
            1.0
        } else {
            ((total_conf / created.len() as f32) * 100.0).round() / 100.0
        };

        self.documents.push(LiveCorpusDocument {
            id: doc_id.to_string(),
            title: title.to_string(),
            filename: filename.to_string(),
            kind: LiveCorpusDocKind::BilingualAutoAligned,
            source_lang: source_lang.to_string(),
            target_lang: target_lang.to_string(),
            passage_count: created.len(),
            avg_alignment_confidence: avg_conf,
        });

        created
    }

    fn compute_bilingual_alignment_score(
        src: &str,
        tgt: &str,
        src_idx: usize,
        tgt_idx: usize,
    ) -> f32 {
        let len_a = src.chars().count().max(1) as f32;
        let len_b = tgt.chars().count().max(1) as f32;
        let ratio = len_a.min(len_b) / len_a.max(len_b);

        // Shared numbers / years boost confidence (e.g. 1968, 78.4%)
        let src_nums: Vec<&str> = src
            .split(|c: char| !c.is_ascii_digit())
            .filter(|s| !s.is_empty())
            .collect();
        let shared_nums = src_nums.iter().filter(|n| tgt.contains(**n)).count();
        let num_bonus = if src_nums.is_empty() {
            0.12
        } else {
            0.18 * (shared_nums as f32 / src_nums.len() as f32)
        };

        let pos_penalty = (src_idx.abs_diff(tgt_idx) as f32) * 0.08;
        (0.76 + (ratio * 0.14) + num_bonus - pos_penalty).clamp(0.55, 0.99)
    }

    fn normalize_phrase(text: &str) -> String {
        text.chars()
            .map(|c| {
                if c.is_alphanumeric() || c.is_whitespace() {
                    c.to_lowercase().next().unwrap_or(c)
                } else {
                    ' '
                }
            })
            .collect::<String>()
            .split_whitespace()
            .collect::<Vec<_>>()
            .join(" ")
    }

    fn tokenize_with_spans(text: &str) -> Vec<(String, usize, usize)> {
        let mut tokens = Vec::new();
        let mut current = String::new();
        let mut start_byte = 0;

        for (idx, ch) in text.char_indices() {
            if ch.is_alphanumeric() || ch == '-' || ch == '\'' {
                if current.is_empty() {
                    start_byte = idx;
                }
                current.push(ch);
            } else if !current.is_empty() {
                tokens.push((current.clone(), start_byte, idx));
                current.clear();
            }
        }
        if !current.is_empty() {
            tokens.push((current, start_byte, text.len()));
        }
        tokens
    }

    fn compute_global_word_jaccard_pct(a: &str, b: &str) -> f32 {
        let norm_a = Self::normalize_phrase(a);
        let norm_b = Self::normalize_phrase(b);
        let set_a: std::collections::HashSet<&str> = norm_a.split_whitespace().collect();
        let set_b: std::collections::HashSet<&str> = norm_b.split_whitespace().collect();
        if set_a.is_empty() || set_b.is_empty() {
            return 0.0;
        }
        let inter = set_a.intersection(&set_b).count() as f32;
        let union = set_a.union(&set_b).count() as f32;
        ((inter / union) * 100.0).round()
    }

    /// Computes Longest Substring Concordance (LSC):
    /// Finds the longest contiguous n-grams (of length >= `min_words`, default 2) in `segment_source`
    /// that occur inside any `LiveCorpusPassage`, even when the overall sentence similarity is `< 50%`.
    pub fn find_longest_substring_concordances(
        &self,
        segment_source: &str,
        min_words: usize,
    ) -> Vec<LscSubphraseMatch> {
        let min_w = min_words.max(2);
        let tokens = Self::tokenize_with_spans(segment_source);
        if tokens.len() < min_w {
            return Vec::new();
        }

        let mut covered = vec![false; tokens.len()];
        let mut results = Vec::new();
        let max_len = tokens.len().min(8);

        for n in (min_w..=max_len).rev() {
            for start_i in 0..=(tokens.len() - n) {
                let end_i = start_i + n;
                if covered[start_i..end_i].iter().any(|&c| c) {
                    continue;
                }

                let char_start = tokens[start_i].1;
                let char_end = tokens[end_i - 1].2;
                let exact_slice = &segment_source[char_start..char_end];
                let norm_ngram = Self::normalize_phrase(exact_slice);
                if norm_ngram.chars().count() < 6 {
                    continue;
                }

                // Search for this contiguous n-gram across all LiveCorpus passages
                if let Some(hit_passage) = self.passages.iter().find(|p| {
                    let norm_p = Self::normalize_phrase(&p.source_paragraph);
                    norm_p.contains(&norm_ngram)
                }) {
                    for flag in &mut covered[start_i..end_i] {
                        *flag = true;
                    }

                    let suggested_target_phrase =
                        self.subsegment_lexicon.get(&norm_ngram).cloned();
                    let global_sim = Self::compute_global_word_jaccard_pct(
                        segment_source,
                        &hit_passage.source_paragraph,
                    );

                    results.push(LscSubphraseMatch {
                        source_ngram: exact_slice.to_string(),
                        word_count: n,
                        char_start,
                        char_end,
                        suggested_target_phrase,
                        passage_id: hit_passage.id.clone(),
                        doc_title: hit_passage.doc_title.clone(),
                        doc_kind: hit_passage.doc_kind.clone(),
                        prev_paragraph: hit_passage.prev_paragraph.clone(),
                        source_paragraph: hit_passage.source_paragraph.clone(),
                        target_paragraph: hit_passage.target_paragraph.clone(),
                        next_paragraph: hit_passage.next_paragraph.clone(),
                        global_sentence_similarity_pct: global_sim,
                    });
                }
            }
        }

        results.sort_by_key(|m| m.char_start);
        results
    }

    /// Retrieves the expanded 3-paragraph context (`¶ Anterior`, `¶ Atual`, `¶ Posterior`) for a passage.
    pub fn inspect_expanded_context(&self, passage_id: &str) -> Option<&LiveCorpusPassage> {
        self.passages.iter().find(|p| p.id == passage_id)
    }

    /// Saves the `.amanuensis/corpus/LIVECORPUS_MANIFEST.json` file in a single clean directory
    /// (zero labyrinthine "Resource Console" menus).
    pub fn save_corpus_manifest_to_disk(&self, project_root: &Path) -> Result<PathBuf, CoreError> {
        let corpus_dir = project_root.join(".amanuensis").join("corpus");
        std::fs::create_dir_all(&corpus_dir)?;
        let manifest_path = corpus_dir.join("LIVECORPUS_MANIFEST.json");
        let json = serde_json::to_string_pretty(self)?;
        std::fs::write(&manifest_path, json)?;
        Ok(manifest_path)
    }
}
