export interface BoundingBox {
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export type SegmentStatus = 'Untranslated' | 'AiDraft' | 'Translated' | 'Approved';

export interface TranslationSegment {
  id: string;
  index: number;
  source_text: string;
  target_text: string;
  ai_draft_snapshot?: string | null;
  status: SegmentStatus;
  bbox: BoundingBox;
}

export interface TmBank {
  id: string;
  name: string;
  description: string;
  source_lang: string;
  target_lang: string;
  is_primary: boolean;
  read_only: boolean;
  weight: number;
  entry_count: number;
}

export interface TmMatch {
  id: number;
  bank_name: string;
  source_text: string;
  target_text: string;
  similarity_pct: number;
  match_type: 'ContextExact' | 'Exact' | 'Fuzzy' | 'SemanticHybrid';
  rrf_score: number;
}

export interface ProjectSkill {
  id: string;
  name: string;
  description: string;
  trigger: string;
  enabled: boolean;
  content_markdown: string;
}

export interface GlossaryTerm {
  source_term: string;
  target_term: string;
  notes?: string;
  do_not_translate: boolean;
}

export interface LearnedRule {
  id: string;
  pattern_from: string;
  preferred_to: string;
  rationale: string;
  occurrences: number;
  active: boolean;
}

export interface HardwareProfile {
  cpu_brand: string;
  cpu_cores: number;
  total_ram_gb: number;
  gpu_acceleration: string;
  recommended_model_id: string;
  layman_summary: string;
}

export interface LocalModelSpec {
  id: string;
  name: string;
  friendly_title: string;
  layman_description: string;
  speed_rating: string;
  quality_rating: string;
  ram_impact_label: string;
  est_words_per_sec: number;
  est_seconds_per_page: number;
  tooltip_benchmark: string;
  family: string;
  quant: string;
  size_mb: number;
  vram_required_mb: number;
  hf_repo: string;
  recommended_for: string;
  installed: boolean;
  active: boolean;
  local_path?: string;
  cache_size_mb?: number;
  is_custom_gguf?: boolean;
  is_downloading?: boolean;
  download_progress_pct?: number;
  download_stage_label?: string;
  task_reliability_badge?: string;
  hardware_fit_badge?: string;
}

export type DiskModelDiscoveryStatus =
  | 'NewUsable'
  | 'DuplicateWaste'
  | 'AlreadyRegistered'
  | 'UnusableOrIncompatible';

export type HardwareRecommendationLevel = 'Recommended' | 'HeavyBorderline' | 'NotRecommended';

export type TaskReliabilityLevel = 'HighReliable' | 'PartialDraftOnly' | 'UnreliableForTask';

export interface DiscoveredDiskModel {
  id: string;
  filename: string;
  path: string;
  directory: string;
  duplicate_of_path?: string;
  ext: string;
  size_mb: number;
  cache_waste_mb: number;
  family: string;
  quant: string;
  status: DiskModelDiscoveryStatus;
  status_label: string;
  hardware_level: HardwareRecommendationLevel;
  hardware_verdict: string;
  est_words_per_sec: number;
  ram_required_gb: number;
  reliability_level: TaskReliabilityLevel;
  reliability_verdict: string;
  diagnostic_notes: string;
}

export interface OpenMirrorBankSpec {
  id: string;
  name: string;
  provider_org: string;
  mirror_url: string;
  fallback_mirror_url: string;
  license: string;
  category:
    | 'Literatura & Clássicos'
    | 'Ciências Sociais, História & Política'
    | 'Acadêmico, Científico & SciELO'
    | 'Jurídico, Diplomacia & ONU/UE'
    | 'Jornalismo, Mídia & Legendas'
    | 'Dicionários, Falsos Cognatos & Regência';
  source_lang: string;
  target_lang: string;
  size_mb: number;
  entry_count: number;
  glossary_terms_count: number;
  description: string;
  sample_pairs: Array<{ source: string; target: string }>;
  sample_glossary: Array<{ source_term: string; target_term: string; notes: string }>;
  installed: boolean;
  is_installing?: boolean;
  install_progress_pct?: number;
  install_stage_label?: string;
  install_speed_mbps?: string;
}

export type SemanticCommitKind = 'ingest' | 'translate' | 'harness' | 'milestone' | 'obsidian';

export interface SemanticGitCommit {
  commit_hash: string;
  short_hash: string;
  kind: SemanticCommitKind;
  scope: string;
  summary: string;
  timestamp_iso: string;
  author: string;
  affected_segments: number[];
  tag_name?: string;
  stats_note: string;
}

export type SegmentVersionStage =
  | 'OriginalSource'
  | 'LocalAiDraft'
  | 'HumanPostEdit'
  | 'ZenModeRefinement'
  | 'ObsidianRoundTrip';

export interface SegmentRevisionEntry {
  version_number: number;
  stage: SegmentVersionStage;
  stage_label: string;
  text: string;
  commit_short_hash: string;
  timestamp_label: string;
  model_or_author: string;
  rationale_or_adr?: string;
}

export interface ObsidianAdrRecord {
  adr_id: string;
  title: string;
  status: 'Aceito' | 'Em Revisão' | 'Superado';
  context_problem: string;
  adopted_decision: string;
  affected_concepts: string[];
  affected_segments: number[];
}

export interface CanvasNode {
  id: string;
  type: 'text' | 'file' | 'group';
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string;
  text?: string;
  file?: string;
  label?: string;
}

export interface CanvasEdge {
  id: string;
  fromNode: string;
  fromSide: 'top' | 'right' | 'bottom' | 'left';
  toNode: string;
  toSide: 'top' | 'right' | 'bottom' | 'left';
  label?: string;
  color?: string;
}

export interface ObsidianVaultNote {
  relative_path: string;
  category: 'MOC' | 'Manuscrito' | 'Conceito' | 'ADR' | 'Canvas' | 'GitStory' | 'Config';
  content: string;
}

export type LiveCorpusDocKind =
  | 'BilingualAutoAligned'
  | 'AuthorPriorWork'
  | 'MonolingualTargetReference';

export interface LiveCorpusPassage {
  id: string;
  doc_id: string;
  doc_title: string;
  doc_kind: LiveCorpusDocKind;
  paragraph_index: number;
  prev_paragraph?: string;
  source_paragraph: string;
  target_paragraph?: string;
  next_paragraph?: string;
  alignment_confidence: number;
}

export interface LiveCorpusDocumentSpec {
  id: string;
  title: string;
  filename: string;
  kind: LiveCorpusDocKind;
  source_lang: string;
  target_lang: string;
  passage_count: number;
  avg_alignment_confidence: number;
  passages: LiveCorpusPassage[];
}

export interface LscSubphraseMatch {
  source_ngram: string;
  word_count: number;
  char_start: number;
  char_end: number;
  suggested_target_phrase?: string;
  passage_id: string;
  doc_title: string;
  doc_kind: LiveCorpusDocKind;
  prev_paragraph?: string;
  source_paragraph: string;
  target_paragraph?: string;
  next_paragraph?: string;
  global_sentence_similarity_pct: number;
}

export interface ExtractedLexiconItem {
  source_phrase: string;
  word_count: number;
  occurrences: number;
  segment_indices: number[];
  suggested_target: string;
  locked_in_glossary: boolean;
}

export type FragmentOriginKind =
  | 'GlossaryLexicon'
  | 'TmOrLiveCorpusSubsegment'
  | 'LocalModelGrammarStitch';

export interface AutoAssembleFragment {
  source_span: string;
  target_span: string;
  origin: FragmentOriginKind;
}

export interface AutoAssembleResult {
  source_text: string;
  assembled_target: string;
  fragments: AutoAssembleFragment[];
  deterministic_coverage_pct: number;
}

export interface AutoWriteSuggestion {
  trigger_prefix: string;
  completion_full: string;
  completion_suffix: string;
  source_origin_label: string;
}

// Issue #4: OmegaT-inspired Smart Auto-Propagation, Contextual Exceptions & Global Regex Search/Replace
export interface ContextualExceptionRecord {
  segment_id: string;
  segment_index: number;
  source_text: string;
  alternative_target_text: string;
  context_hash: string;
  prev_snippet: string;
  next_snippet: string;
  rationale_note: string;
}

export interface AutoPropagationOutcome {
  trigger_segment_index: number;
  normalized_source: string;
  propagated_target: string;
  updated_segment_indices: number[];
  skipped_exception_indices: number[];
  trigger_is_contextual_exception: boolean;
  trigger_context_hash: string;
}

export type GlobalSearchScope = 'BothSourceAndTarget' | 'TargetOnly' | 'SourceOnly';

export type GlobalSearchStatusFilter =
  | 'AllSegments'
  | 'ConfirmedOnly'
  | 'DraftsAndUntranslatedOnly'
  | 'RepeatedSegmentsOnly';

export interface GlobalRegexPreviewItem {
  segment_index: number;
  segment_id: string;
  field_matched: 'target' | 'source';
  matched_substrings: string[];
  before_text: string;
  after_preview_text: string;
  context_hash: string;
  is_contextual_exception: boolean;
}




