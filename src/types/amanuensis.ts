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
}
