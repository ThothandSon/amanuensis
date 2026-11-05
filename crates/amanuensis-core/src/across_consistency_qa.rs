use serde::{Deserialize, Serialize};
use std::collections::HashMap;

use crate::harness::GlossaryTerm;
use crate::omegat_propagation::ContextualExceptionRecord;
use crate::project::TranslationSegment;

/// Non-locking editorial stage inspired by Across workflow states (`Tradução ➔ Preparação/Revisão ➔ Cotejo Final`).
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
pub enum EditorialWorkflowStage {
    DraftTranslation,
    CopyeditingPreparation,
    FinalCollationApproved,
}

impl EditorialWorkflowStage {
    pub fn label(&self) -> &'static str {
        match self {
            EditorialWorkflowStage::DraftTranslation => "1. Tradução Inicial",
            EditorialWorkflowStage::CopyeditingPreparation => "2. Preparação & Revisão",
            EditorialWorkflowStage::FinalCollationApproved => "3. Cotejo Final Aprovado",
        }
    }
}

/// Dual note system attached to a segment:
/// - `internal_working_note`: private working note/query for the translator/editor (not printed in final book)
/// - `publishable_translator_footnote`: `[N. da T.]` footnote automatically exported into final Markdown, `.docx` and PDF.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct SegmentTranslatorAnnotation {
    pub segment_index: usize,
    pub segment_id: String,
    pub editorial_stage: EditorialWorkflowStage,
    pub internal_working_note: String,
    pub publishable_translator_footnote: String,
}

/// Kind of finding detected by the Cross-Chapter Consistency Matrix (`Matriz de Consistência Intra-Obra`).
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
pub enum ConsistencyIssueKind {
    /// Same source segment translated in two different ways without a Contextual Exception (`🔀 Exceção Contextual`).
    TargetInconsistency,
    /// Two different source segments translated with the exact same target sentence (semantic collision).
    InverseCollision,
    /// A locked glossary term present in source was omitted or drifted in target.
    GlossaryDrift,
    /// Inconsistent dialogue punctuation across chapters (mixing `"..."` quotation marks and `—` editorial em-dashes).
    DialoguePunctuationDrift,
}

/// A single finding in the Cross-Chapter Consistency Matrix.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ConsistencyMatrixFinding {
    pub id: String,
    pub kind: ConsistencyIssueKind,
    pub severity_label: String,
    pub affected_segment_indices: Vec<usize>,
    pub summary: String,
    pub details: String,
    pub suggested_fix: String,
}

/// Complete report from the Cross-Chapter Consistency Matrix & `[N. da T.]` Footnote Compiler.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConsistencyMatrixReport {
    pub total_segments_checked: usize,
    pub consistency_score_pct: u8,
    pub target_inconsistencies_count: usize,
    pub inverse_collisions_count: usize,
    pub glossary_drifts_count: usize,
    pub dialogue_punctuation_drifts_count: usize,
    pub dominant_dialogue_style: String,
    pub findings: Vec<ConsistencyMatrixFinding>,
}

/// Engine for Issue #6:
/// 1. Cross-Chapter Consistency Matrix (`TargetInconsistency`, `InverseCollision`, `GlossaryDrift`, `DialoguePunctuationDrift`)
/// 2. Translator's Notes (`[N. da T.]` publishable footnotes + internal working notes) & Editorial Stages without lock-in.
pub struct AcrossConsistencyAndNotesEngine;

impl AcrossConsistencyAndNotesEngine {
    /// Audits all segments across the project to produce the Cross-Chapter Consistency Matrix report.
    pub fn run_cross_chapter_consistency_matrix(
        segments: &[TranslationSegment],
        glossary: &[GlossaryTerm],
        exceptions: &[ContextualExceptionRecord],
    ) -> ConsistencyMatrixReport {
        let mut findings = Vec::new();
        let mut target_inconsistencies_count = 0usize;
        let mut inverse_collisions_count = 0usize;
        let mut glossary_drifts_count = 0usize;
        let mut dialogue_punctuation_drifts_count = 0usize;

        // 1. Check TargetInconsistency: identical normalized source -> multiple distinct targets (not marked as Contextual Exception)
        let mut by_source: HashMap<String, Vec<(usize, String)>> = HashMap::new();
        // 2. Check InverseCollision: identical normalized target -> multiple distinct sources
        let mut by_target: HashMap<String, Vec<(usize, String)>> = HashMap::new();

        for (idx, seg) in segments.iter().enumerate() {
            let tgt_trim = seg.target_text.trim();
            if tgt_trim.is_empty() {
                continue;
            }
            let is_exc = exceptions.iter().any(|e| e.segment_index == idx);
            if !is_exc {
                let norm_src = normalize_text(&seg.source_text);
                by_source
                    .entry(norm_src)
                    .or_default()
                    .push((idx, tgt_trim.to_string()));
            }

            let norm_tgt = normalize_text(tgt_trim);
            by_target
                .entry(norm_tgt)
                .or_default()
                .push((idx, seg.source_text.trim().to_string()));
        }

        for occurrences in by_source.values() {
            if occurrences.len() >= 2 {
                let first_norm_tgt = normalize_text(&occurrences[0].1);
                let has_divergence = occurrences
                    .iter()
                    .any(|(_, t)| normalize_text(t) != first_norm_tgt);
                if has_divergence {
                    target_inconsistencies_count += 1;
                    let indices: Vec<usize> = occurrences.iter().map(|(i, _)| *i).collect();
                    let variants_preview: Vec<String> = occurrences
                        .iter()
                        .map(|(i, t)| format!("Trecho #{}: \"{}\"", i + 1, t))
                        .collect();
                    findings.push(ConsistencyMatrixFinding {
                        id: format!("qa-inconsist-{}", indices[0] + 1),
                        kind: ConsistencyIssueKind::TargetInconsistency,
                        severity_label: "Alta • Inconsistência de Tradução".to_string(),
                        affected_segment_indices: indices.clone(),
                        summary: format!(
                            "Mesmo original traduzido de formas diferentes nos Trechos #{}",
                            indices
                                .iter()
                                .map(|i| (i + 1).to_string())
                                .collect::<Vec<_>>()
                                .join(", #")
                        ),
                        details: variants_preview.join(" vs. "),
                        suggested_fix: occurrences[0].1.clone(),
                    });
                }
            }
        }

        for occurrences in by_target.values() {
            if occurrences.len() >= 2 {
                let first_norm_src = normalize_text(&occurrences[0].1);
                let has_distinct_sources = occurrences
                    .iter()
                    .any(|(_, s)| normalize_text(s) != first_norm_src);
                if has_distinct_sources {
                    inverse_collisions_count += 1;
                    let indices: Vec<usize> = occurrences.iter().map(|(i, _)| *i).collect();
                    findings.push(ConsistencyMatrixFinding {
                        id: format!("qa-collision-{}", indices[0] + 1),
                        kind: ConsistencyIssueKind::InverseCollision,
                        severity_label: "Média • Assimetria Inversa (Colisão)".to_string(),
                        affected_segment_indices: indices.clone(),
                        summary: format!(
                            "Frases originais distintas traduzidas de forma idêntica nos Trechos #{}",
                            indices
                                .iter()
                                .map(|i| (i + 1).to_string())
                                .collect::<Vec<_>>()
                                .join(", #")
                        ),
                        details: occurrences
                            .iter()
                            .map(|(i, s)| format!("Orig #{}: \"{}\"", i + 1, s))
                            .collect::<Vec<_>>()
                            .join(" ≠ "),
                        suggested_fix: "Diferenciar nuance lexical conforme o original de cada trecho.".to_string(),
                    });
                }
            }
        }

        // 3. Check GlossaryDrift across chapters/segments
        for (idx, seg) in segments.iter().enumerate() {
            let tgt = seg.target_text.trim();
            if tgt.is_empty() {
                continue;
            }
            let low_src = seg.source_text.to_lowercase();
            let low_tgt = tgt.to_lowercase();
            for g in glossary {
                if low_src.contains(&g.source_term.to_lowercase()) {
                    let expected = if g.do_not_translate {
                        &g.source_term
                    } else {
                        &g.target_term
                    };
                    if !low_tgt.contains(&expected.to_lowercase()) {
                        glossary_drifts_count += 1;
                        findings.push(ConsistencyMatrixFinding {
                            id: format!("qa-gloss-{}-{}", idx + 1, g.source_term),
                            kind: ConsistencyIssueKind::GlossaryDrift,
                            severity_label: "Alta • Desvio de Glossário".to_string(),
                            affected_segment_indices: vec![idx],
                            summary: format!(
                                "Trecho #{}: termo travado \"{}\" não usou \"{}\" na tradução",
                                idx + 1,
                                g.source_term,
                                expected
                            ),
                            details: format!(
                                "Original contém \"{}\", mas a tradução atual não contém \"{}\".",
                                g.source_term, expected
                            ),
                            suggested_fix: expected.clone(),
                        });
                    }
                }
            }
        }

        // 4. Check DialoguePunctuationDrift (mixing em-dash `—` vs quotes `"` / `“`)
        let mut emdash_segs = Vec::new();
        let mut quote_dialogue_segs = Vec::new();
        for (idx, seg) in segments.iter().enumerate() {
            let tgt = seg.target_text.trim();
            if tgt.starts_with('—') || tgt.starts_with("--") {
                emdash_segs.push(idx);
            } else if tgt.starts_with('"') || tgt.starts_with('“') || tgt.starts_with('«') {
                quote_dialogue_segs.push(idx);
            }
        }

        let dominant_dialogue_style = if emdash_segs.len() >= quote_dialogue_segs.len() {
            "Travessão Editorial ABNT (—)".to_string()
        } else {
            "Aspas de Diálogo (“...”)".to_string()
        };

        if !emdash_segs.is_empty() && !quote_dialogue_segs.is_empty() {
            dialogue_punctuation_drifts_count = quote_dialogue_segs.len();
            let mut affected = emdash_segs.clone();
            affected.extend(quote_dialogue_segs.iter().copied());
            findings.push(ConsistencyMatrixFinding {
                id: "qa-dialogue-punctuation-drift".to_string(),
                kind: ConsistencyIssueKind::DialoguePunctuationDrift,
                severity_label: "Média • Oscilação de Pontuação de Diálogo".to_string(),
                affected_segment_indices: affected,
                summary: format!(
                    "Oscilação entre Travessão (— em {} trechos) e Aspas (\"...\" em {} trechos)",
                    emdash_segs.len(),
                    quote_dialogue_segs.len()
                ),
                details: "Obras editoriais em língua portuguesa exigem padronização uniforme de diálogos com travessão (—).".to_string(),
                suggested_fix: "Converter abertura de diálogo com aspas para travessão editorial (— ).".to_string(),
            });
        }

        let total_issues = target_inconsistencies_count
            + inverse_collisions_count
            + glossary_drifts_count
            + dialogue_punctuation_drifts_count;
        let penalty = (total_issues * 9).min(75) as u8;
        let consistency_score_pct = 100u8.saturating_sub(penalty);

        ConsistencyMatrixReport {
            total_segments_checked: segments.len(),
            consistency_score_pct,
            target_inconsistencies_count,
            inverse_collisions_count,
            glossary_drifts_count,
            dialogue_punctuation_drifts_count,
            dominant_dialogue_style,
            findings,
        }
    }

    /// Exports the translated manuscript into Markdown while automatically injecting publishable
    /// Translator's Footnotes (`[^nt-N]: ... [N. da T.]`) and keeping `internal_working_note` strictly private.
    pub fn compile_markdown_with_translator_footnotes(
        segments: &[TranslationSegment],
        annotations: &[SegmentTranslatorAnnotation],
    ) -> String {
        let mut body_blocks = Vec::new();
        let mut footnote_definitions = Vec::new();
        let mut nt_counter = 0usize;

        for (idx, seg) in segments.iter().enumerate() {
            let mut text = if seg.target_text.trim().is_empty() {
                seg.source_text.trim().to_string()
            } else {
                seg.target_text.trim().to_string()
            };

            if let Some(ann) = annotations.iter().find(|a| a.segment_index == idx) {
                let pub_note = ann.publishable_translator_footnote.trim();
                if !pub_note.is_empty() {
                    nt_counter += 1;
                    let fn_id = format!("[^nt-{}]", nt_counter);
                    text.push_str(&fn_id);
                    let formatted_note =
                        if pub_note.ends_with("[N. da T.]") || pub_note.ends_with("[N.T.]") {
                            pub_note.to_string()
                        } else {
                            format!("{} [N. da T.]", pub_note)
                        };
                    footnote_definitions.push(format!("{}: {}", fn_id, formatted_note));
                }
            }

            body_blocks.push(text);
        }

        let mut final_md = body_blocks.join("\n\n");
        if !footnote_definitions.is_empty() {
            final_md.push_str("\n\n---\n\n### Notas da Tradução\n\n");
            final_md.push_str(&footnote_definitions.join("\n"));
            final_md.push('\n');
        }
        final_md
    }
}

fn normalize_text(text: &str) -> String {
    text.split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
        .to_lowercase()
}
