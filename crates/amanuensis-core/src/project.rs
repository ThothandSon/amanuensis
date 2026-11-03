use serde::{Deserialize, Serialize};

use crate::harness::{LearnedRule, ProjectHarness};
use crate::llm::{HardwareProfile, LocalLlmEngine, LocalModelSpec, LocalTranslationOutput};
use crate::ocr::{BoundingBox, OcrPipelineConfig, ScannedPdfSuite};
use crate::tm::{TmBank, TmMatch, TranslationMemoryEngine};
use crate::CoreError;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum SegmentStatus {
    Untranslated,
    AiDraft,
    Translated,
    Approved,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TranslationSegment {
    pub id: String,
    pub index: usize,
    pub source_text: String,
    pub target_text: String,
    pub ai_draft_snapshot: Option<String>,
    pub status: SegmentStatus,
    pub bbox: BoundingBox,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ThemeDefinition {
    pub id: String,
    pub name: String,
    pub category: String,
    pub description: String,
    pub bg_primary: String,
    pub bg_secondary: String,
    pub bg_elevated: String,
    pub text_primary: String,
    pub text_muted: String,
    pub accent: String,
    pub border: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OnboardingConfig {
    pub project_name: String,
    pub source_lang: String,
    pub target_lang: String,
    pub domain: String,
    pub selected_model_id: String,
    pub selected_theme_id: String,
    pub create_auxiliary_banks: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkbenchSnapshot {
    pub onboarding_completed: bool,
    pub selected_theme_id: String,
    pub project_disk_path: String,
    pub harness: ProjectHarness,
    pub segments: Vec<TranslationSegment>,
    pub tm_banks: Vec<TmBank>,
    pub models: Vec<LocalModelSpec>,
    pub hardware_backend: String,
    pub hardware_profile: HardwareProfile,
    pub themes: Vec<ThemeDefinition>,
}

pub struct AmanuensisWorkspace {
    pub onboarding_completed: bool,
    pub selected_theme_id: String,
    pub project_disk_path: String,
    pub tm_engine: TranslationMemoryEngine,
    pub harness: ProjectHarness,
    pub llm_engine: LocalLlmEngine,
    pub segments: Vec<TranslationSegment>,
}

impl AmanuensisWorkspace {
    /// Initializes a complete, ready-to-use workspace with starter Primary & Auxiliary TMs,
    /// project-scoped `AGENT.md` + `skills/*.md` harness, and pre-segmented scanned PDF manuscript.
    pub fn new_demo() -> Result<Self, CoreError> {
        let tm_engine = TranslationMemoryEngine::open_in_memory()?;

        let primary_bank = TmBank {
            id: "tm-primary".to_string(),
            name: "TM Principal do Projeto".to_string(),
            description: "Banco de tradução principal atualizado automaticamente a cada segmento confirmado".to_string(),
            source_lang: "en-US".to_string(),
            target_lang: "pt-BR".to_string(),
            is_primary: true,
            read_only: false,
            weight: 1.2,
            entry_count: 0,
        };

        let aux_tech_bank = TmBank {
            id: "tm-aux-ai-corpus".to_string(),
            name: "Auxiliar: Corpus Engenharia de IA & NLP".to_string(),
            description: "Banco de tradução auxiliar de referência para artigos de IA, LLMs locais e RAG".to_string(),
            source_lang: "en-US".to_string(),
            target_lang: "pt-BR".to_string(),
            is_primary: false,
            read_only: true,
            weight: 1.0,
            entry_count: 0,
        };

        let aux_legal_bank = TmBank {
            id: "tm-aux-academic".to_string(),
            name: "Auxiliar: Normas Editoriais & ABNT/Markdown".to_string(),
            description: "Padronização de notas de rodapé, cabeçalhos e tabelas acadêmicas".to_string(),
            source_lang: "en-US".to_string(),
            target_lang: "pt-BR".to_string(),
            is_primary: false,
            read_only: true,
            weight: 0.9,
            entry_count: 0,
        };

        tm_engine.create_bank(&primary_bank)?;
        tm_engine.create_bank(&aux_tech_bank)?;
        tm_engine.create_bank(&aux_legal_bank)?;

        // Seed auxiliary banks with realistic translation units
        tm_engine.add_entry(
            "tm-aux-ai-corpus",
            "Small local language models achieve remarkable translation fidelity when constrained by a project-specific harness and an auxiliary Translation Memory.",
            "Modelos de linguagem locais compactos alcançam notável fidelidade de tradução quando restritos por um harness específico do projeto e uma Memória de Tradução auxiliar.",
            Some("# Chapter IV: On Locally Grounded Machine Translation"),
            None,
            Some("AI Architecture"),
        )?;

        tm_engine.add_entry(
            "tm-aux-ai-corpus",
            "Small language models achieve high translation quality when grounded by a project harness and Translation Memory.",
            "Modelos de linguagem compactos atingem alta qualidade de tradução quando ancorados por um harness de projeto e Memória de Tradução.",
            None,
            None,
            Some("AI Architecture"),
        )?;

        tm_engine.add_entry(
            "tm-aux-ai-corpus",
            "Without domain-specific glossaries and contextual grounding, unguided models suffer from terminology drift and hallucination.",
            "Sem glossários específicos de domínio e ancoragem contextual, modelos não guiados sofrem com desvio terminológico e alucinação.",
            None,
            None,
            Some("AI Safety"),
        )?;

        tm_engine.add_entry(
            "tm-aux-academic",
            "Historical scans processed via the Amanuensis OCR Suite retain both bounding-box coordinates and searchable PDF text layers.",
            "Digitalizações históricas processadas pela Suíte de OCR do Amanuensis preservam tanto as coordenadas de bounding-box quanto camadas de texto em PDF pesquisável.",
            None,
            None,
            Some("Editorial OCR"),
        )?;

        let harness = ProjectHarness::default_for_project(
            "proj-amanuensis-01",
            "Tratado de Tradução Neural Local & OCR",
            "en-US",
            "pt-BR",
            "Engenharia de IA & Linguística Computacional",
        );

        let ocr_res = ScannedPdfSuite::process_scanned_document(
            "manuscript_scan_1998.pdf",
            None,
            &OcrPipelineConfig::default(),
        )?;

        let segments: Vec<TranslationSegment> = ocr_res
            .blocks
            .into_iter()
            .enumerate()
            .map(|(idx, blk)| {
                let (target_text, status) = if idx == 0 {
                    (
                        "# Capítulo IV: Sobre a Tradução Automática Fundamentada Localmente".to_string(),
                        SegmentStatus::Approved,
                    )
                } else {
                    (String::new(), SegmentStatus::Untranslated)
                };

                TranslationSegment {
                    id: format!("seg-{}", idx + 1),
                    index: idx,
                    source_text: blk.cleaned_markdown,
                    target_text,
                    ai_draft_snapshot: None,
                    status,
                    bbox: blk.bbox,
                }
            })
            .collect();

        Ok(Self {
            onboarding_completed: false,
            selected_theme_id: "luna-xp".to_string(),
            project_disk_path: "sample-project/.amanuensis".to_string(),
            tm_engine,
            harness,
            llm_engine: LocalLlmEngine::new(),
            segments,
        })
    }

    /// Completes the First-Run Onboarding flow: updates the project harness (`AGENT.md`, `skills/*.md`,
    /// `glossary.toml`), sets the active local GGUF model and visual theme, and saves the harness to disk.
    pub fn apply_onboarding(
        &mut self,
        cfg: OnboardingConfig,
        project_root: &std::path::Path,
    ) -> Result<String, CoreError> {
        self.harness = ProjectHarness::default_for_project(
            "proj-onboarded-01",
            &cfg.project_name,
            &cfg.source_lang,
            &cfg.target_lang,
            &cfg.domain,
        );
        self.llm_engine.set_active_model(&cfg.selected_model_id);
        self.selected_theme_id = cfg.selected_theme_id;
        self.onboarding_completed = true;

        let saved_dir = self.harness.save_to_disk(project_root)?;
        self.project_disk_path = saved_dir.display().to_string();
        Ok(self.project_disk_path.clone())
    }

    pub fn snapshot(&self) -> Result<WorkbenchSnapshot, CoreError> {
        Ok(WorkbenchSnapshot {
            onboarding_completed: self.onboarding_completed,
            selected_theme_id: self.selected_theme_id.clone(),
            project_disk_path: self.project_disk_path.clone(),
            harness: self.harness.clone(),
            segments: self.segments.clone(),
            tm_banks: self.tm_engine.list_banks()?,
            models: self.llm_engine.list_models().to_vec(),
            hardware_backend: self.llm_engine.hardware_backend.clone(),
            hardware_profile: self.llm_engine.hardware_profile.clone(),
            themes: Self::built_in_themes(),
        })
    }

    /// Queries all active Primary & Auxiliary TM banks for a segment.
    pub fn query_tm_for_segment(&self, segment_index: usize) -> Result<Vec<TmMatch>, CoreError> {
        let Some(seg) = self.segments.get(segment_index) else {
            return Ok(Vec::new());
        };
        let prev_ctx = if segment_index > 0 {
            self.segments
                .get(segment_index - 1)
                .map(|s| s.source_text.as_str())
        } else {
            None
        };
        self.tm_engine
            .search_hybrid(&seg.source_text, prev_ctx, 5)
    }

    /// Translates a segment using the local GGUF model constrained by the project's `AGENT.md`, `skills/*.md`,
    /// `glossary.toml`, `learned_rules.json`, and top Auxiliary TM matches.
    pub fn translate_segment_with_local_model(
        &mut self,
        segment_index: usize,
    ) -> Result<LocalTranslationOutput, CoreError> {
        let tm_matches = self.query_tm_for_segment(segment_index)?;
        let Some(seg) = self.segments.get(segment_index) else {
            return Err(CoreError::NotFound(format!(
                "Segment index {segment_index} not found"
            )));
        };
        let prev_ctx = if segment_index > 0 {
            self.segments
                .get(segment_index - 1)
                .map(|s| s.source_text.as_str())
        } else {
            None
        };

        let compiled = self
            .harness
            .compile_for_segment(&seg.source_text, prev_ctx, &tm_matches);
        let output = self
            .llm_engine
            .translate_with_harness(&seg.source_text, compiled);

        if let Some(seg_mut) = self.segments.get_mut(segment_index) {
            seg_mut.target_text = output.translated_text.clone();
            seg_mut.ai_draft_snapshot = Some(output.translated_text.clone());
            seg_mut.status = SegmentStatus::AiDraft;
        }

        Ok(output)
    }

    /// Confirms a human-edited segment, stores it in the Primary TM bank, and triggers the
    /// Project Harness Evolutionary Post-Edit Learner if the translator modified an AI draft.
    pub fn confirm_segment(
        &mut self,
        segment_index: usize,
        final_target_text: &str,
    ) -> Result<Option<LearnedRule>, CoreError> {
        let prev_ctx = if segment_index > 0 {
            self.segments
                .get(segment_index - 1)
                .map(|s| s.source_text.clone())
        } else {
            None
        };

        let Some(seg) = self.segments.get_mut(segment_index) else {
            return Err(CoreError::NotFound(format!(
                "Segment index {segment_index} not found"
            )));
        };

        let learned = if let Some(ai_draft) = &seg.ai_draft_snapshot {
            self.harness
                .learn_from_post_edit(ai_draft, final_target_text)
        } else {
            None
        };

        seg.target_text = final_target_text.trim().to_string();
        seg.status = SegmentStatus::Approved;

        self.tm_engine.add_entry(
            "tm-primary",
            &seg.source_text,
            &seg.target_text,
            prev_ctx.as_deref(),
            None,
            Some(&self.harness.domain),
        )?;

        Ok(learned)
    }

    /// Exports the entire translated document as clean Markdown.
    pub fn export_translated_markdown(&self) -> String {
        self.segments
            .iter()
            .map(|s| {
                if s.target_text.trim().is_empty() {
                    s.source_text.as_str()
                } else {
                    s.target_text.as_str()
                }
            })
            .collect::<Vec<_>>()
            .join("\n\n")
    }

    /// Built-in visual themes for Linux, macOS, and Windows.
    pub fn built_in_themes() -> Vec<ThemeDefinition> {
        vec![
            ThemeDefinition {
                id: "obsidian-studio".to_string(),
                name: "Obsidian Studio".to_string(),
                category: "Dark".to_string(),
                description: "Contraste profundo e ciano elétrico para sessões técnicas intensas".to_string(),
                bg_primary: "#0b0f17".to_string(),
                bg_secondary: "#111827".to_string(),
                bg_elevated: "#1e293b".to_string(),
                text_primary: "#f1f5f9".to_string(),
                text_muted: "#94a3b8".to_string(),
                accent: "#38bdf8".to_string(),
                border: "#1e293b".to_string(),
            },
            ThemeDefinition {
                id: "paper-and-ink".to_string(),
                name: "Paper & Ink (Manuscrito Sépia)".to_string(),
                category: "Reading / Warm".to_string(),
                description: "Papel creme editorial com tinta sépia para tradução literária e leitura longa sem fadiga".to_string(),
                bg_primary: "#f6f0e4".to_string(),
                bg_secondary: "#efe6d5".to_string(),
                bg_elevated: "#e5d9c3".to_string(),
                text_primary: "#2b2118".to_string(),
                text_muted: "#6e5a47".to_string(),
                accent: "#b45309".to_string(),
                border: "#d6c7b2".to_string(),
            },
            ThemeDefinition {
                id: "daylight-crisp".to_string(),
                name: "Daylight Crisp".to_string(),
                category: "Light".to_string(),
                description: "Interface clara de altíssima nitidez para ambientes bem iluminados".to_string(),
                bg_primary: "#ffffff".to_string(),
                bg_secondary: "#f8fafc".to_string(),
                bg_elevated: "#f1f5f9".to_string(),
                text_primary: "#0f172a".to_string(),
                text_muted: "#64748b".to_string(),
                accent: "#2563eb".to_string(),
                border: "#e2e8f0".to_string(),
            },
            ThemeDefinition {
                id: "nordic-frost".to_string(),
                name: "Nordic Frost".to_string(),
                category: "Dark / Cool".to_string(),
                description: "Paleta ártica suave inspirada no tema Nord para foco prolongado".to_string(),
                bg_primary: "#242933".to_string(),
                bg_secondary: "#2e3440".to_string(),
                bg_elevated: "#3b4252".to_string(),
                text_primary: "#eceff4".to_string(),
                text_muted: "#a3be8c".to_string(),
                accent: "#88c0d0".to_string(),
                border: "#434c5e".to_string(),
            },
            ThemeDefinition {
                id: "high-contrast-a11y".to_string(),
                name: "High Contrast WCAG AAA".to_string(),
                category: "Accessibility".to_string(),
                description: "Contraste absoluto com bordas de alta visibilidade e indicadores cromáticos reforçados".to_string(),
                bg_primary: "#000000".to_string(),
                bg_secondary: "#0a0a0a".to_string(),
                bg_elevated: "#171717".to_string(),
                text_primary: "#ffffff".to_string(),
                text_muted: "#fde047".to_string(),
                accent: "#22d3ee".to_string(),
                border: "#ffffff".to_string(),
            },
        ]
    }
}
