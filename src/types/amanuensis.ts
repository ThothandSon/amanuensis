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
