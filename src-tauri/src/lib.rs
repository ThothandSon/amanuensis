use std::path::Path;
use std::sync::Mutex;

use amanuensis_core::{
    harness::{GlossaryTerm, LearnedRule, ProjectSkill},
    llm::LocalTranslationOutput,
    ocr::{
        ChunkGranularity, OcrFormattingHarness, OcrFormattingResult, OcrPipelineConfig,
        ScannedPdfConversionResult, ScannedPdfSuite,
    },
    project::{AmanuensisWorkspace, OnboardingConfig, WorkbenchSnapshot},
    tm::{TmBank, TmMatch},
};

pub struct AppState {
    pub workspace: Mutex<AmanuensisWorkspace>,
}

impl AppState {
    pub fn new() -> Result<Self, String> {
        let ws = AmanuensisWorkspace::new_demo().map_err(|e| e.to_string())?;
        Ok(Self {
            workspace: Mutex::new(ws),
        })
    }

    pub fn get_workbench_snapshot(&self) -> Result<WorkbenchSnapshot, String> {
        let ws = self.workspace.lock().map_err(|e| e.to_string())?;
        ws.snapshot().map_err(|e| e.to_string())
    }

    pub fn query_segment_tm(&self, segment_index: usize) -> Result<Vec<TmMatch>, String> {
        let ws = self.workspace.lock().map_err(|e| e.to_string())?;
        ws.query_tm_for_segment(segment_index)
            .map_err(|e| e.to_string())
    }

    pub fn translate_segment_local(
        &self,
        segment_index: usize,
    ) -> Result<LocalTranslationOutput, String> {
        let mut ws = self.workspace.lock().map_err(|e| e.to_string())?;
        ws.translate_segment_with_local_model(segment_index)
            .map_err(|e| e.to_string())
    }

    pub fn confirm_segment_translation(
        &self,
        segment_index: usize,
        final_target_text: String,
    ) -> Result<Option<LearnedRule>, String> {
        let mut ws = self.workspace.lock().map_err(|e| e.to_string())?;
        ws.confirm_segment(segment_index, &final_target_text)
            .map_err(|e| e.to_string())
    }

    pub fn create_auxiliary_tm_bank(&self, bank: TmBank) -> Result<Vec<TmBank>, String> {
        let ws = self.workspace.lock().map_err(|e| e.to_string())?;
        ws.tm_engine
            .create_bank(&bank)
            .map_err(|e| e.to_string())?;
        ws.tm_engine.list_banks().map_err(|e| e.to_string())
    }

    pub fn update_project_agent_md(
        &self,
        agent_md: String,
        project_root: Option<&Path>,
    ) -> Result<(), String> {
        let mut ws = self.workspace.lock().map_err(|e| e.to_string())?;
        ws.harness.agent_md = agent_md;
        if let Some(root) = project_root {
            ws.harness.save_to_disk(root).map_err(|e| e.to_string())?;
        }
        Ok(())
    }

    pub fn add_project_skill(&self, skill: ProjectSkill) -> Result<Vec<ProjectSkill>, String> {
        let mut ws = self.workspace.lock().map_err(|e| e.to_string())?;
        ws.harness.skills.push(skill);
        Ok(ws.harness.skills.clone())
    }

    pub fn add_glossary_term(&self, term: GlossaryTerm) -> Result<Vec<GlossaryTerm>, String> {
        let mut ws = self.workspace.lock().map_err(|e| e.to_string())?;
        ws.harness.glossary.push(term);
        Ok(ws.harness.glossary.clone())
    }

    pub fn convert_scanned_pdf(
        &self,
        document_name: String,
        raw_pages_ocr: Option<Vec<String>>,
        config: OcrPipelineConfig,
    ) -> Result<ScannedPdfConversionResult, String> {
        ScannedPdfSuite::process_scanned_document(&document_name, raw_pages_ocr, &config)
            .map_err(|e| e.to_string())
    }

    pub fn convert_uploaded_pdf_bytes(
        &self,
        document_name: String,
        pdf_bytes: &[u8],
        config: OcrPipelineConfig,
    ) -> Result<ScannedPdfConversionResult, String> {
        ScannedPdfSuite::process_uploaded_pdf_bytes(&document_name, pdf_bytes, &config)
            .map_err(|e| e.to_string())
    }

    pub fn format_ocr_with_harness(
        &self,
        raw_ocr: String,
        granularity: ChunkGranularity,
        dehyphenate: bool,
    ) -> Result<OcrFormattingResult, String> {
        let mut harness = OcrFormattingHarness::default();
        harness.granularity = granularity;
        harness.dehyphenate_line_breaks = dehyphenate;
        Ok(harness.format_and_segment(&raw_ocr))
    }

    pub fn complete_onboarding(
        &self,
        cfg: OnboardingConfig,
        project_root: &Path,
    ) -> Result<WorkbenchSnapshot, String> {
        let mut ws = self.workspace.lock().map_err(|e| e.to_string())?;
        ws.apply_onboarding(cfg, project_root)
            .map_err(|e| e.to_string())?;
        ws.snapshot().map_err(|e| e.to_string())
    }

    pub fn reset_onboarding(&self) -> Result<WorkbenchSnapshot, String> {
        let mut ws = self.workspace.lock().map_err(|e| e.to_string())?;
        ws.onboarding_completed = false;
        ws.snapshot().map_err(|e| e.to_string())
    }
}
