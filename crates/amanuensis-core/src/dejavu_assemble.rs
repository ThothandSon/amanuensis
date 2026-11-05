use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, HashMap, HashSet};

/// Represents a recurring multi-word noun phrase or expression (2 to 5 words)
/// extracted automatically from the entire work before or during translation.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExtractedLexiconEntry {
    pub source_phrase: String,
    pub word_count: usize,
    pub occurrences: usize,
    pub segment_indices: Vec<usize>,
    pub suggested_target: String,
    pub locked_in_glossary: bool,
}

/// Origin of each stitched piece in a Hybrid AutoAssemble skeleton.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum FragmentOrigin {
    GlossaryLexicon,
    TmOrLiveCorpusSubsegment,
    LocalModelGrammarStitch,
}

/// A single piece of an `AutoAssemble` hybrid translation.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AutoAssembleFragment {
    pub source_span: String,
    pub target_span: String,
    pub origin: FragmentOrigin,
}

/// Full output of the Hybrid `AutoAssemble` engine for a segment.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AutoAssembleResult {
    pub source_text: String,
    pub assembled_target: String,
    pub fragments: Vec<AutoAssembleFragment>,
    pub deterministic_coverage_pct: f32,
}

/// Grounded, non-intrusive `Dynamic AutoWrite` predictive suggestion (Tab to accept).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AutoWriteSuggestion {
    pub trigger_prefix: String,
    pub completion_full: String,
    pub completion_suffix: String,
    pub source_origin_label: String,
}

pub struct DejaVuProductivityEngine;

impl DejaVuProductivityEngine {
    fn is_boundary_stopword(word: &str) -> bool {
        let stop: HashSet<&str> = [
            "the", "and", "for", "with", "that", "this", "from", "are", "was", "were", "have",
            "has", "had", "not", "but", "when", "where", "which", "into", "over", "across", "los",
            "las", "una", "uno", "unos", "unas", "por", "para", "con", "sin", "sobre", "entre",
            "como", "más", "pero", "sus", "del", "al", "que", "uma", "uns", "umas", "dos", "das",
            "nos", "nas", "pelo", "pela",
        ]
        .into_iter()
        .collect();
        stop.contains(word)
    }

    fn tokenize_words(text: &str) -> Vec<String> {
        text.chars()
            .map(|c| {
                if c.is_alphanumeric() || c == '-' {
                    c.to_lowercase().next().unwrap_or(c)
                } else {
                    ' '
                }
            })
            .collect::<String>()
            .split_whitespace()
            .map(|s| s.trim_matches('-').to_string())
            .filter(|s| s.chars().count() >= 2)
            .collect()
    }

    /// Extracts recurring multi-word expressions (2 to 5 words) across all segments of a work.
    /// Ranks phrases by `occurrences * word_count` and filters out boundary stopwords.
    pub fn extract_recurring_lexicon(
        segments: &[String],
        min_words: usize,
        max_words: usize,
        known_translations: &HashMap<String, String>,
    ) -> Vec<ExtractedLexiconEntry> {
        let min_w = min_words.max(2);
        let max_w = max_words.clamp(min_w, 5);

        // Map normalized phrase -> (display_phrase, word_count, count, segment_indices)
        let mut counts: BTreeMap<String, (String, usize, usize, Vec<usize>)> = BTreeMap::new();

        for (seg_idx, seg_text) in segments.iter().enumerate() {
            let words = Self::tokenize_words(seg_text);
            if words.len() < min_w {
                continue;
            }
            let mut seen_in_seg = HashSet::new();

            for n in min_w..=max_w.min(words.len()) {
                for start in 0..=(words.len() - n) {
                    let slice = &words[start..start + n];
                    // Skip phrases starting or ending with a pure function stopword
                    if Self::is_boundary_stopword(&slice[0])
                        || Self::is_boundary_stopword(&slice[n - 1])
                    {
                        continue;
                    }
                    let phrase = slice.join(" ");
                    if phrase.chars().count() < 7 {
                        continue;
                    }
                    let entry = counts
                        .entry(phrase.clone())
                        .or_insert_with(|| (phrase.clone(), n, 0, Vec::new()));
                    entry.2 += 1;
                    if seen_in_seg.insert(phrase) {
                        entry.3.push(seg_idx);
                    }
                }
            }
        }

        let mut results: Vec<ExtractedLexiconEntry> = counts
            .into_values()
            .filter(|(_, word_count, occ, _)| *occ >= 2 || (*word_count >= 3 && *occ >= 1))
            .map(|(phrase, word_count, occurrences, segment_indices)| {
                let suggested = known_translations
                    .get(&phrase)
                    .cloned()
                    .unwrap_or_else(|| format!("[Definir tradução p/ '{}']", phrase));
                ExtractedLexiconEntry {
                    source_phrase: phrase,
                    word_count,
                    occurrences,
                    segment_indices,
                    suggested_target: suggested,
                    locked_in_glossary: false,
                }
            })
            .collect();

        results.sort_by(|a, b| {
            let score_a = a.occurrences * 10 + a.word_count * 3;
            let score_b = b.occurrences * 10 + b.word_count * 3;
            score_b
                .cmp(&score_a)
                .then_with(|| a.source_phrase.cmp(&b.source_phrase))
        });

        results.into_iter().take(40).collect()
    }

    /// Hybrid `AutoAssemble`: combines deterministic Glossary/Lexicon terms + TM/LiveCorpus
    /// sub-segment fragments + local model grammatical stitching.
    pub fn auto_assemble_segment(
        source_text: &str,
        glossary_pairs: &[(String, String)],
        subsegment_pairs: &[(String, String)],
        stitched_full_translation: &str,
    ) -> AutoAssembleResult {
        let low_src = source_text.to_lowercase();
        let mut fragments = Vec::new();
        let mut matched_source_words = 0_usize;
        let total_source_words = Self::tokenize_words(source_text).len().max(1);

        // 1. Identify Glossary / Project Lexicon hits
        for (src_term, tgt_term) in glossary_pairs {
            if !src_term.trim().is_empty() && low_src.contains(&src_term.to_lowercase()) {
                let wc = src_term.split_whitespace().count().max(1);
                matched_source_words += wc;
                fragments.push(AutoAssembleFragment {
                    source_span: src_term.clone(),
                    target_span: tgt_term.clone(),
                    origin: FragmentOrigin::GlossaryLexicon,
                });
            }
        }

        // 2. Identify Sub-segment TM / LiveCorpus hits not already covered by Glossary
        for (src_sub, tgt_sub) in subsegment_pairs {
            let low_sub = src_sub.to_lowercase();
            if !low_sub.is_empty()
                && low_src.contains(&low_sub)
                && !fragments
                    .iter()
                    .any(|f| f.source_span.to_lowercase().contains(&low_sub))
            {
                let wc = src_sub.split_whitespace().count().max(1);
                matched_source_words += wc;
                fragments.push(AutoAssembleFragment {
                    source_span: src_sub.clone(),
                    target_span: tgt_sub.clone(),
                    origin: FragmentOrigin::TmOrLiveCorpusSubsegment,
                });
            }
        }

        // 3. Add the Local Model Morphological & Grammatical Stitch fragment
        fragments.push(AutoAssembleFragment {
            source_span: "Costura Morfológica & Sintática (Harness + Modelo Local)".to_string(),
            target_span: stitched_full_translation.to_string(),
            origin: FragmentOrigin::LocalModelGrammarStitch,
        });

        let deterministic_coverage_pct = ((matched_source_words.min(total_source_words) as f32
            / total_source_words as f32)
            * 100.0)
            .round();

        AutoAssembleResult {
            source_text: source_text.to_string(),
            assembled_target: stitched_full_translation.to_string(),
            fragments,
            deterministic_coverage_pct,
        }
    }

    /// Computes non-intrusive `Dynamic AutoWrite` completions (Tab to accept).
    /// Suggests ONLY grounded terms from the Project Glossary/Lexicon, long proper nouns from the
    /// source segment, or syntagms already confirmed by the translator in this project.
    pub fn compute_dynamic_autowrite_suggestions(
        current_target_input: &str,
        source_segment: &str,
        glossary_pairs: &[(String, String)],
        confirmed_project_syntagms: &[String],
    ) -> Vec<AutoWriteSuggestion> {
        let mut suggestions = Vec::new();
        let trimmed_end = current_target_input.trim_end();
        let last_token = trimmed_end
            .split(|c: char| c.is_whitespace() || c == ',' || c == ';' || c == '(')
            .next_back()
            .unwrap_or("")
            .trim();

        let low_prefix = last_token.to_lowercase();
        let low_source = source_segment.to_lowercase();
        let low_target_full = current_target_input.to_lowercase();

        // 1. Prefix-triggered completion when the user is actively typing a word (>= 2 chars)
        if low_prefix.chars().count() >= 2 {
            for (src_term, tgt_term) in glossary_pairs {
                let low_tgt = tgt_term.to_lowercase();
                if low_tgt.starts_with(&low_prefix) && low_tgt.len() > low_prefix.len() {
                    let suffix = tgt_term[last_token.len()..].to_string();
                    suggestions.push(AutoWriteSuggestion {
                        trigger_prefix: last_token.to_string(),
                        completion_full: tgt_term.clone(),
                        completion_suffix: suffix,
                        source_origin_label: format!("📌 Léxico/Glossário ({})", src_term),
                    });
                }
            }

            for syntagm in confirmed_project_syntagms {
                let low_syn = syntagm.to_lowercase();
                if low_syn.starts_with(&low_prefix)
                    && low_syn.len() > low_prefix.len()
                    && !suggestions.iter().any(|s| s.completion_full == *syntagm)
                {
                    let suffix = syntagm[last_token.len()..].to_string();
                    suggestions.push(AutoWriteSuggestion {
                        trigger_prefix: last_token.to_string(),
                        completion_full: syntagm.clone(),
                        completion_suffix: suffix,
                        source_origin_label: "✓ Sintagma Confirmado no Projeto".to_string(),
                    });
                }
            }
        }

        // 2. Context-triggered suggestions: Glossary/Lexicon terms present in `source_segment`
        // that have not yet been typed into `current_target_input`
        for (src_term, tgt_term) in glossary_pairs {
            if low_source.contains(&src_term.to_lowercase())
                && !low_target_full.contains(&tgt_term.to_lowercase())
                && !suggestions.iter().any(|s| s.completion_full == *tgt_term)
            {
                suggestions.push(AutoWriteSuggestion {
                    trigger_prefix: String::new(),
                    completion_full: tgt_term.clone(),
                    completion_suffix: tgt_term.clone(),
                    source_origin_label: format!("📌 Termo do Trecho ({})", src_term),
                });
            }
        }

        suggestions.into_iter().take(4).collect()
    }
}
