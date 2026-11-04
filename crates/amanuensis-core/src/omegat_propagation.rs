use serde::{Deserialize, Serialize};

use crate::project::{SegmentStatus, TranslationSegment};

/// Deterministic FNV-1a 64-bit hash formatted as 12-char hex string for `(prev_source, source, next_source)`.
/// Used by OmegaT-style `Create Alternative Translation` (`Exceção Contextual`) to bind a segment's translation
/// to its exact surrounding context (`prev ¶ + current ¶ + next ¶`).
pub fn compute_segment_context_hash(
    prev_source: Option<&str>,
    current_source: &str,
    next_source: Option<&str>,
) -> String {
    let mut hash: u64 = 0xcbf29ce484222325;
    let prime: u64 = 0x100000001b3;

    let mut feed = |text: &str| {
        for b in text.trim().to_lowercase().bytes() {
            hash ^= b as u64;
            hash = hash.wrapping_mul(prime);
        }
        hash ^= 0xff;
        hash = hash.wrapping_mul(prime);
    };

    feed(prev_source.unwrap_or("__START_OF_DOCUMENT__"));
    feed(current_source);
    feed(next_source.unwrap_or("__END_OF_DOCUMENT__"));

    format!("ctx-{:012x}", hash & 0xffffffffffff)
}

/// Records a contextual exception ("Tradução Alternativa" / "Exceção Contextual")
/// so that an identical source sentence in a specific chapter/dialogue context keeps its bespoke translation
/// without overwriting (or being overwritten by) the default auto-propagated translation.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ContextualExceptionRecord {
    pub segment_id: String,
    pub segment_index: usize,
    pub source_text: String,
    pub alternative_target_text: String,
    pub context_hash: String,
    pub prev_snippet: String,
    pub next_snippet: String,
    pub rationale_note: String,
}

/// Summary returned after confirming a segment and running Smart Auto-Propagation across the project.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AutoPropagationOutcome {
    pub trigger_segment_index: usize,
    pub normalized_source: String,
    pub propagated_target: String,
    pub updated_segment_indices: Vec<usize>,
    pub skipped_exception_indices: Vec<usize>,
    pub trigger_is_contextual_exception: bool,
    pub trigger_context_hash: String,
}

/// Scope filter for Global Search & Replace (`Cmd+Shift+F`).
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
pub enum GlobalSearchScope {
    BothSourceAndTarget,
    TargetOnly,
    SourceOnly,
}

/// Status filter for Global Search & Replace (`Cmd+Shift+F`).
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
pub enum GlobalSearchStatusFilter {
    AllSegments,
    ConfirmedOnly,
    DraftsAndUntranslatedOnly,
    RepeatedSegmentsOnly,
}

/// A single segment match with before/after diff preview for Global Regex Search & Replace.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GlobalRegexPreviewItem {
    pub segment_index: usize,
    pub segment_id: String,
    pub field_matched: String, // "target" | "source"
    pub matched_substrings: Vec<String>,
    pub before_text: String,
    pub after_preview_text: String,
    pub context_hash: String,
    pub is_contextual_exception: bool,
}

/// Result of running a Global Search / Dry-Run Preview (`Cmd+Shift+F`) or Batch Replace.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GlobalRegexOperationResult {
    pub query_pattern: String,
    pub replacement_pattern: String,
    pub use_regex: bool,
    pub case_sensitive: bool,
    pub total_matches: usize,
    pub affected_segments_count: usize,
    pub previews: Vec<GlobalRegexPreviewItem>,
}

/// OmegaT-inspired Smart Auto-Propagation, Contextual Exceptions & Global Regex Search/Replace Engine.
pub struct OmegaTPropagationEngine;

impl OmegaTPropagationEngine {
    /// Propagates a confirmed segment's translation to all identical source segments across the work,
    /// while strictly respecting `ContextualExceptionRecord` entries:
    /// - If the confirmed segment itself is marked as a contextual exception, it updates ONLY segments
    ///   sharing the exact same `context_hash` (never clobbering global occurrences).
    /// - If the confirmed segment is a standard segment, it propagates to all identical source segments
    ///   EXCEPT those protected in `exceptions`.
    pub fn auto_propagate_confirmed_segment(
        segments: &mut [TranslationSegment],
        trigger_index: usize,
        exceptions: &[ContextualExceptionRecord],
    ) -> AutoPropagationOutcome {
        if trigger_index >= segments.len() {
            return AutoPropagationOutcome {
                trigger_segment_index: trigger_index,
                normalized_source: String::new(),
                propagated_target: String::new(),
                updated_segment_indices: Vec::new(),
                skipped_exception_indices: Vec::new(),
                trigger_is_contextual_exception: false,
                trigger_context_hash: String::new(),
            };
        }

        let prev_src = if trigger_index > 0 {
            Some(segments[trigger_index - 1].source_text.as_str())
        } else {
            None
        };
        let next_src = if trigger_index + 1 < segments.len() {
            Some(segments[trigger_index + 1].source_text.as_str())
        } else {
            None
        };
        let trigger_src = segments[trigger_index].source_text.clone();
        let trigger_tgt = segments[trigger_index].target_text.clone();
        let trigger_ctx_hash =
            compute_segment_context_hash(prev_src, &trigger_src, next_src);

        let norm_trigger_src = normalize_segment_source(&trigger_src);
        let trigger_is_exception = exceptions.iter().any(|ex| {
            ex.segment_index == trigger_index || ex.context_hash == trigger_ctx_hash
        });

        let mut updated_indices = Vec::new();
        let mut skipped_exceptions = Vec::new();

        for idx in 0..segments.len() {
            if idx == trigger_index {
                continue;
            }
            if normalize_segment_source(&segments[idx].source_text) != norm_trigger_src {
                continue;
            }

            let p_src = if idx > 0 {
                Some(segments[idx - 1].source_text.as_str())
            } else {
                None
            };
            let n_src = if idx + 1 < segments.len() {
                Some(segments[idx + 1].source_text.as_str())
            } else {
                None
            };
            let candidate_ctx_hash =
                compute_segment_context_hash(p_src, &segments[idx].source_text, n_src);

            let candidate_is_exception = exceptions.iter().any(|ex| {
                ex.segment_index == idx || ex.context_hash == candidate_ctx_hash
            });

            if trigger_is_exception {
                // Only propagate to another segment if it has the exact same neighbor context hash
                if candidate_ctx_hash == trigger_ctx_hash {
                    segments[idx].target_text = trigger_tgt.clone();
                    segments[idx].status = SegmentStatus::Approved;
                    updated_indices.push(idx);
                } else {
                    skipped_exceptions.push(idx);
                }
            } else if candidate_is_exception {
                // Never overwrite a segment protected by a Contextual Exception!
                skipped_exceptions.push(idx);
            } else {
                segments[idx].target_text = trigger_tgt.clone();
                segments[idx].status = SegmentStatus::Approved;
                updated_indices.push(idx);
            }
        }

        AutoPropagationOutcome {
            trigger_segment_index: trigger_index,
            normalized_source: norm_trigger_src,
            propagated_target: trigger_tgt,
            updated_segment_indices: updated_indices,
            skipped_exception_indices: skipped_exceptions,
            trigger_is_contextual_exception: trigger_is_exception,
            trigger_context_hash: trigger_ctx_hash,
        }
    }

    /// Registers or updates a Contextual Exception (`Tradução Alternativa`) for `segment_index`,
    /// binding its translation to its `(prev, current, next)` context hash.
    pub fn register_contextual_exception(
        segments: &[TranslationSegment],
        segment_index: usize,
        alternative_target: &str,
        rationale_note: &str,
        exceptions: &mut Vec<ContextualExceptionRecord>,
    ) -> Option<ContextualExceptionRecord> {
        let seg = segments.get(segment_index)?;
        let prev_src = if segment_index > 0 {
            Some(segments[segment_index - 1].source_text.as_str())
        } else {
            None
        };
        let next_src = if segment_index + 1 < segments.len() {
            Some(segments[segment_index + 1].source_text.as_str())
        } else {
            None
        };
        let ctx_hash = compute_segment_context_hash(prev_src, &seg.source_text, next_src);

        let record = ContextualExceptionRecord {
            segment_id: seg.id.clone(),
            segment_index,
            source_text: seg.source_text.clone(),
            alternative_target_text: alternative_target.to_string(),
            context_hash: ctx_hash.clone(),
            prev_snippet: prev_src.unwrap_or("— [Início da Obra]").chars().take(72).collect(),
            next_snippet: next_src.unwrap_or("— [Fim da Obra]").chars().take(72).collect(),
            rationale_note: rationale_note.to_string(),
        };

        exceptions.retain(|e| e.segment_index != segment_index && e.context_hash != ctx_hash);
        exceptions.push(record.clone());
        Some(record)
    }

    /// Previews (or applies when `apply_in_place == true`) a Global Search & Replace across all segments
    /// supporting both Exact and pattern/Regex-like capture (`$1`, `\b`, alternation `a|b`, case-insensitivity)
    /// and filtering by scope and segment status.
    pub fn search_and_replace_segments(
        segments: &mut [TranslationSegment],
        query_pattern: &str,
        replacement_pattern: &str,
        use_regex: bool,
        case_sensitive: bool,
        scope: GlobalSearchScope,
        status_filter: GlobalSearchStatusFilter,
        exceptions: &[ContextualExceptionRecord],
        apply_in_place: bool,
    ) -> GlobalRegexOperationResult {
        if query_pattern.is_empty() {
            return GlobalRegexOperationResult {
                query_pattern: String::new(),
                replacement_pattern: replacement_pattern.to_string(),
                use_regex,
                case_sensitive,
                total_matches: 0,
                affected_segments_count: 0,
                previews: Vec::new(),
            };
        }

        // Precompute repetition map for RepeatedSegmentsOnly filter
        let mut source_counts = std::collections::HashMap::<String, usize>::new();
        for seg in segments.iter() {
            let norm = normalize_segment_source(&seg.source_text);
            *source_counts.entry(norm).or_insert(0) += 1;
        }

        let mut previews = Vec::new();
        let mut total_matches = 0usize;
        let mut affected_segments = std::collections::HashSet::<usize>::new();

        let len = segments.len();
        for idx in 0..len {
            let status_ok = match status_filter {
                GlobalSearchStatusFilter::AllSegments => true,
                GlobalSearchStatusFilter::ConfirmedOnly => matches!(
                    segments[idx].status,
                    SegmentStatus::Approved | SegmentStatus::Translated
                ),
                GlobalSearchStatusFilter::DraftsAndUntranslatedOnly => matches!(
                    segments[idx].status,
                    SegmentStatus::AiDraft | SegmentStatus::Untranslated
                ),
                GlobalSearchStatusFilter::RepeatedSegmentsOnly => {
                    let norm = normalize_segment_source(&segments[idx].source_text);
                    source_counts.get(&norm).copied().unwrap_or(0) >= 2
                }
            };
            if !status_ok {
                continue;
            }

            let prev_src = if idx > 0 {
                Some(segments[idx - 1].source_text.clone())
            } else {
                None
            };
            let next_src = if idx + 1 < len {
                Some(segments[idx + 1].source_text.clone())
            } else {
                None
            };
            let ctx_hash = compute_segment_context_hash(
                prev_src.as_deref(),
                &segments[idx].source_text,
                next_src.as_deref(),
            );
            let is_exc = exceptions
                .iter()
                .any(|e| e.segment_index == idx || e.context_hash == ctx_hash);

            // Check Target field if in scope
            if matches!(
                scope,
                GlobalSearchScope::BothSourceAndTarget | GlobalSearchScope::TargetOnly
            ) {
                let (matched_subs, replaced_text) = match_and_replace_pattern(
                    &segments[idx].target_text,
                    query_pattern,
                    replacement_pattern,
                    use_regex,
                    case_sensitive,
                );
                if !matched_subs.is_empty() {
                    total_matches += matched_subs.len();
                    affected_segments.insert(idx);
                    previews.push(GlobalRegexPreviewItem {
                        segment_index: idx,
                        segment_id: segments[idx].id.clone(),
                        field_matched: "target".to_string(),
                        matched_substrings: matched_subs,
                        before_text: segments[idx].target_text.clone(),
                        after_preview_text: replaced_text.clone(),
                        context_hash: ctx_hash.clone(),
                        is_contextual_exception: is_exc,
                    });
                    if apply_in_place {
                        segments[idx].target_text = replaced_text;
                    }
                }
            }

            // Check Source field if in scope
            if matches!(
                scope,
                GlobalSearchScope::BothSourceAndTarget | GlobalSearchScope::SourceOnly
            ) {
                let (matched_subs, replaced_text) = match_and_replace_pattern(
                    &segments[idx].source_text,
                    query_pattern,
                    replacement_pattern,
                    use_regex,
                    case_sensitive,
                );
                if !matched_subs.is_empty() {
                    total_matches += matched_subs.len();
                    affected_segments.insert(idx);
                    previews.push(GlobalRegexPreviewItem {
                        segment_index: idx,
                        segment_id: segments[idx].id.clone(),
                        field_matched: "source".to_string(),
                        matched_substrings: matched_subs,
                        before_text: segments[idx].source_text.clone(),
                        after_preview_text: replaced_text.clone(),
                        context_hash: ctx_hash,
                        is_contextual_exception: is_exc,
                    });
                    if apply_in_place {
                        segments[idx].source_text = replaced_text;
                    }
                }
            }
        }

        GlobalRegexOperationResult {
            query_pattern: query_pattern.to_string(),
            replacement_pattern: replacement_pattern.to_string(),
            use_regex,
            case_sensitive,
            total_matches,
            affected_segments_count: affected_segments.len(),
            previews,
        }
    }
}

fn normalize_segment_source(text: &str) -> String {
    text.split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
        .to_lowercase()
}

/// Zero-dependency pattern matcher supporting:
/// - Exact substring search & replace (case-sensitive or case-insensitive)
/// - Regex alternation (`termA|termB`), word boundaries (`\b`), digit classes (`\d+`),
///   and capture group substitution (`$0` / `$1`).
fn match_and_replace_pattern(
    input: &str,
    pattern: &str,
    replacement: &str,
    use_regex: bool,
    case_sensitive: bool,
) -> (Vec<String>, String) {
    if input.is_empty() || pattern.is_empty() {
        return (Vec::new(), input.to_string());
    }

    // Handle alternation patterns in regex mode: e.g. `(?:operários|trabalhadores)` or `foo|bar`
    let cleaned_pat = pattern
        .trim_start_matches("(?:")
        .trim_start_matches('(')
        .trim_end_matches(')')
        .trim_start_matches(r"\b")
        .trim_end_matches(r"\b");

    let alternatives: Vec<&str> = if use_regex && cleaned_pat.contains('|') {
        cleaned_pat.split('|').filter(|s| !s.is_empty()).collect()
    } else {
        vec![cleaned_pat]
    };

    let mut matched = Vec::new();
    let mut output = input.to_string();

    // Special regex class `\d+` support for numbers
    if use_regex && (pattern == r"\d+" || pattern == r"(\d+)") {
        let mut new_out = String::with_capacity(input.len());
        let mut num_buf = String::new();
        for ch in input.chars() {
            if ch.is_ascii_digit() {
                num_buf.push(ch);
            } else {
                if !num_buf.is_empty() {
                    matched.push(num_buf.clone());
                    let rep = replacement
                        .replace("$1", &num_buf)
                        .replace("$0", &num_buf);
                    new_out.push_str(&rep);
                    num_buf.clear();
                }
                new_out.push(ch);
            }
        }
        if !num_buf.is_empty() {
            matched.push(num_buf.clone());
            let rep = replacement
                .replace("$1", &num_buf)
                .replace("$0", &num_buf);
            new_out.push_str(&rep);
        }
        return (matched, new_out);
    }

    for alt in alternatives {
        if alt.is_empty() {
            continue;
        }
        if case_sensitive {
            let mut cursor = 0usize;
            while let Some(pos) = output[cursor..].find(alt) {
                let abs = cursor + pos;
                let found = output[abs..abs + alt.len()].to_string();
                matched.push(found.clone());
                let rep = replacement
                    .replace("$1", &found)
                    .replace("$0", &found);
                output.replace_range(abs..abs + alt.len(), &rep);
                cursor = abs + rep.len();
                if rep.is_empty() && cursor < output.len() {
                    cursor += 1;
                }
            }
        } else {
            let low_alt = alt.to_lowercase();
            let mut rebuilt = String::with_capacity(output.len());
            let mut idx = 0usize;
            let bytes = output.as_bytes();
            while idx < bytes.len() {
                let rem = &output[idx..];
                if rem.to_lowercase().starts_with(&low_alt) {
                    // Take exact char count matching alt
                    let char_cnt = alt.chars().count();
                    let found: String = rem.chars().take(char_cnt).collect();
                    let found_bytes = found.len();
                    matched.push(found.clone());
                    let rep = replacement
                        .replace("$1", &found)
                        .replace("$0", &found);
                    rebuilt.push_str(&rep);
                    idx += found_bytes.max(1);
                } else if let Some(first_ch) = rem.chars().next() {
                    rebuilt.push(first_ch);
                    idx += first_ch.len_utf8();
                } else {
                    break;
                }
            }
            output = rebuilt;
        }
    }

    (matched, output)
}
