use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};

use crate::tm::TmMatch;
use crate::CoreError;

/// Represents a modular Skill (`skills/*.md`) inside a project's `.amanuensis/skills/` folder.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectSkill {
    pub id: String,
    pub name: String,
    pub description: String,
    /// Trigger keywords or structural patterns (e.g., "table", "latex", "ocr", "legal", "always")
    pub trigger: String,
    pub enabled: bool,
    pub content_markdown: String,
}

/// Glossary rule enforcing exact terminology or do-not-translate terms within a project.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GlossaryTerm {
    pub source_term: String,
    pub target_term: String,
    pub notes: Option<String>,
    pub do_not_translate: bool,
    pub case_sensitive: bool,
}

/// A rule automatically learned from translator post-editing (AI suggestion -> Human final confirmation).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LearnedRule {
    pub id: String,
    pub pattern_from: String,
    pub preferred_to: String,
    pub rationale: String,
    pub occurrences: u32,
    pub active: bool,
    pub created_at: String,
}

/// Complete isolated Project Harness loaded from `<project_dir>/.amanuensis/`.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectHarness {
    pub project_id: String,
    pub project_name: String,
    pub source_lang: String,
    pub target_lang: String,
    pub domain: String,
    /// Contents of `.amanuensis/AGENT.md`
    pub agent_md: String,
    /// Skills loaded from `.amanuensis/skills/*.md`
    pub skills: Vec<ProjectSkill>,
    /// Strict project glossary (`glossary.toml`)
    pub glossary: Vec<GlossaryTerm>,
    /// Rules evolved from translator corrections (`learned_rules.json`)
    pub learned_rules: Vec<LearnedRule>,
}

/// Compiled deterministic prompt + guardrails for a single segment translation.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompiledSegmentHarness {
    pub system_prompt: String,
    pub user_prompt: String,
    pub active_skills: Vec<String>,
    pub matched_glossary: Vec<GlossaryTerm>,
    pub applied_learned_rules: Vec<LearnedRule>,
    pub grounded_tm_matches: Vec<TmMatch>,
}

impl ProjectHarness {
    /// Creates a rich default project harness with `AGENT.md`, default `skills/*.md`, and starter glossary.
    pub fn default_for_project(
        project_id: &str,
        project_name: &str,
        source_lang: &str,
        target_lang: &str,
        domain: &str,
    ) -> Self {
        let agent_md = format!(
            "# AGENT.md — Project Translation Harness: {project_name}\n\n\
             ## Identity & Strict Scope\n\
             You are a deterministic, zero-hallucination local translation engine scoped exclusively to **{project_name}** ({source_lang} → {target_lang}, Domain: `{domain}`).\n\n\
             ## Core Directives\n\
             1. **Zero Hallucination**: Translate ONLY the provided source segment. Never add commentary, explanations, preambles, or unrequested clauses.\n\
             2. **Glossary Supremacy**: Every term listed in `ACTIVE GLOSSARY CONSTRAINTS` MUST be translated using the exact target term specified.\n\
             3. **Auxiliary TM Alignment**: Maintain consistency with the style and phrasing of 80%+ matches from the project's Auxiliary Translation Memories.\n\
             4. **Structural Preservation**: Keep all Markdown formatting (`#`, `**`, tables `|`, footnotes `[^1]`, and inline code/math) intact.\n\
             5. **Register & Voice**: Formal, clear, idiomatic {target_lang} appropriate for `{domain}` texts.\n"
        );

        let skills = vec![
            ProjectSkill {
                id: "ocr-cleanup".to_string(),
                name: "OCR De-Hyphenation & Scan Artifact Recovery".to_string(),
                description: "Reconstructs words broken by end-of-line hyphens in scanned PDFs and fixes common OCR ligature artifacts.".to_string(),
                trigger: "always".to_string(),
                enabled: true,
                content_markdown: "## Skill: OCR Artifact & Hyphenation Recovery\n\
                    - Join words split across scan line-breaks (e.g., `trans- lation` → `translation`).\n\
                    - Ignore stray OCR margin noise or isolated page numbers unless part of a heading.\n\
                    - Preserve footnote markers (`[1]`, `†`, `*`) in their exact syntactic position."
                    .to_string(),
            },
            ProjectSkill {
                id: "markdown-structure".to_string(),
                name: "Markdown Tables, Citations & LaTeX Preservation".to_string(),
                description: "Activates whenever a segment contains GFM tables, academic citations, or mathematical notation.".to_string(),
                trigger: "markdown_or_math".to_string(),
                enabled: true,
                content_markdown: "## Skill: Structured Markdown & Formula Preservation\n\
                    - Preserve pipe `|` column counts in Markdown tables.\n\
                    - Never translate LaTeX math identifiers inside `$...$` or `$$...$$`.\n\
                    - Keep bibliographic keys (`[@smith2024]`) untouched."
                    .to_string(),
            },
            ProjectSkill {
                id: "terminology-lock".to_string(),
                name: "Strict Domain Terminology Lock".to_string(),
                description: "Enforces mandatory glossary substitutions and prevents synonym drift across chapters.".to_string(),
                trigger: "glossary_hit".to_string(),
                enabled: true,
                content_markdown: "## Skill: Strict Terminology Lock\n\
                    - Never substitute a glossary-locked noun phrase with a synonym.\n\
                    - Respect `DO_NOT_TRANSLATE` flags for software identifiers, proper nouns, and legal Latinisms."
                    .to_string(),
            },
        ];

        let glossary = vec![
            GlossaryTerm {
                source_term: "Translation Memory".to_string(),
                target_term: "Memória de Tradução".to_string(),
                notes: Some("Usar sempre com iniciais maiúsculas em contexto técnico".to_string()),
                do_not_translate: false,
                case_sensitive: false,
            },
            GlossaryTerm {
                source_term: "context window".to_string(),
                target_term: "janela de contexto".to_string(),
                notes: Some("Termo padrão de LLMs locais".to_string()),
                do_not_translate: false,
                case_sensitive: false,
            },
            GlossaryTerm {
                source_term: "Amanuensis".to_string(),
                target_term: "Amanuensis".to_string(),
                notes: Some("Nome próprio do software (não traduzir)".to_string()),
                do_not_translate: true,
                case_sensitive: true,
            },
        ];

        let learned_rules = vec![LearnedRule {
            id: "rule-001".to_string(),
            pattern_from: "banco de dados de tradução".to_string(),
            preferred_to: "banco de tradução auxiliar".to_string(),
            rationale: "Preferência terminológica aprendida das edições do usuário neste projeto"
                .to_string(),
            occurrences: 3,
            active: true,
            created_at: chrono::Utc::now().to_rfc3339(),
        }];

        Self {
            project_id: project_id.to_string(),
            project_name: project_name.to_string(),
            source_lang: source_lang.to_string(),
            target_lang: target_lang.to_string(),
            domain: domain.to_string(),
            agent_md,
            skills,
            glossary,
            learned_rules,
        }
    }

    /// Saves the project harness to `<project_root>/.amanuensis/` as real inspectable files:
    /// - `.amanuensis/AGENT.md`
    /// - `.amanuensis/skills/<id>.md`
    /// - `.amanuensis/glossary.toml`
    /// - `.amanuensis/learned_rules.json`
    pub fn save_to_disk<P: AsRef<Path>>(&self, project_root: P) -> Result<PathBuf, CoreError> {
        let base = project_root.as_ref().join(".amanuensis");
        let skills_dir = base.join("skills");
        fs::create_dir_all(&skills_dir)?;

        // Write AGENT.md
        fs::write(base.join("AGENT.md"), &self.agent_md)?;

        // Write dedicated Scan-to-Structure Formatting Harness (OCR_FORMAT_HARNESS.md)
        let ocr_harness = crate::ocr::OcrFormattingHarness::default();
        fs::write(base.join("OCR_FORMAT_HARNESS.md"), &ocr_harness.harness_md)?;

        // Write skills/*.md with YAML frontmatter
        for skill in &self.skills {
            let skill_file = format!(
                "---\nid: {}\nname: {}\ndescription: {}\ntrigger: {}\nenabled: {}\n---\n\n{}\n",
                skill.id,
                skill.name,
                skill.description,
                skill.trigger,
                skill.enabled,
                skill.content_markdown
            );
            fs::write(skills_dir.join(format!("{}.md", skill.id)), skill_file)?;
        }

        // Write glossary.toml
        #[derive(Serialize)]
        struct GlossaryFile<'a> {
            terms: &'a [GlossaryTerm],
        }
        let glossary_toml = toml::to_string_pretty(&GlossaryFile {
            terms: &self.glossary,
        })
        .map_err(|e| CoreError::Serialization(e.to_string()))?;
        fs::write(base.join("glossary.toml"), glossary_toml)?;

        // Write learned_rules.json
        let rules_json = serde_json::to_string_pretty(&self.learned_rules)?;
        fs::write(base.join("learned_rules.json"), rules_json)?;

        // Write manifest
        let manifest_json = serde_json::to_string_pretty(&self)?;
        fs::write(base.join("harness.json"), manifest_json)?;

        Ok(base)
    }

    /// Loads a `ProjectHarness` from `<project_root>/.amanuensis/harness.json` (and refreshes `AGENT.md` if edited externally).
    pub fn load_from_disk<P: AsRef<Path>>(project_root: P) -> Result<Self, CoreError> {
        let base = project_root.as_ref().join(".amanuensis");
        let manifest_path = base.join("harness.json");
        let content = fs::read_to_string(manifest_path)?;
        let mut harness: ProjectHarness = serde_json::from_str(&content)?;

        let agent_path = base.join("AGENT.md");
        if agent_path.exists() {
            if let Ok(md) = fs::read_to_string(agent_path) {
                harness.agent_md = md;
            }
        }
        Ok(harness)
    }

    /// Compiles a tightly-scoped, anti-hallucination context prompt for a specific source segment.
    /// Only activates relevant skills and matching glossary terms so the small local LLM stays laser-focused.
    pub fn compile_for_segment(
        &self,
        source_segment: &str,
        prev_segment: Option<&str>,
        tm_matches: &[TmMatch],
    ) -> CompiledSegmentHarness {
        let src_lower = source_segment.to_lowercase();

        // 1. Match glossary terms appearing in the source segment
        let matched_glossary: Vec<GlossaryTerm> = self
            .glossary
            .iter()
            .filter(|g| {
                if g.case_sensitive {
                    source_segment.contains(&g.source_term)
                } else {
                    src_lower.contains(&g.source_term.to_lowercase())
                }
            })
            .cloned()
            .collect();

        // 2. Dynamically select relevant skills (`skills/*.md`) for this segment
        let has_markdown_or_math = source_segment.contains('|')
            || source_segment.contains('$')
            || source_segment.contains('[')
            || source_segment.contains('#')
            || source_segment.contains('*');

        let mut active_skills = Vec::new();
        let mut skills_prompt_block = String::new();

        for skill in &self.skills {
            if !skill.enabled {
                continue;
            }
            let should_activate = match skill.trigger.as_str() {
                "always" => true,
                "markdown_or_math" => has_markdown_or_math,
                "glossary_hit" => !matched_glossary.is_empty(),
                custom_kw => src_lower.contains(&custom_kw.to_lowercase()),
            };
            if should_activate {
                active_skills.push(skill.name.clone());
                skills_prompt_block.push_str(&skill.content_markdown);
                skills_prompt_block.push_str("\n\n");
            }
        }

        // 3. Collect active learned rules from prior translator corrections in this project
        let applied_learned_rules: Vec<LearnedRule> = self
            .learned_rules
            .iter()
            .filter(|r| r.active)
            .cloned()
            .collect();

        // 4. Assemble deterministic system prompt
        let mut system_prompt = String::new();
        system_prompt.push_str(&self.agent_md);
        system_prompt.push_str("\n\n");

        if !skills_prompt_block.is_empty() {
            system_prompt.push_str("### ACTIVE PROJECT SKILLS\n");
            system_prompt.push_str(&skills_prompt_block);
        }

        if !matched_glossary.is_empty() {
            system_prompt.push_str("### ACTIVE GLOSSARY CONSTRAINTS (MANDATORY)\n");
            for term in &matched_glossary {
                if term.do_not_translate {
                    system_prompt.push_str(&format!(
                        "- `{}` => DO NOT TRANSLATE (keep exact string `{}`)\n",
                        term.source_term, term.source_term
                    ));
                } else {
                    system_prompt.push_str(&format!(
                        "- `{}` => MUST translate as `{}`\n",
                        term.source_term, term.target_term
                    ));
                }
            }
            system_prompt.push('\n');
        }

        if !applied_learned_rules.is_empty() {
            system_prompt.push_str("### PROJECT LEARNED POST-EDIT RULES (AVOID PAST MISTAKES)\n");
            for rule in &applied_learned_rules {
                system_prompt.push_str(&format!(
                    "- Prefer `{}` instead of `{}` ({})\n",
                    rule.preferred_to, rule.pattern_from, rule.rationale
                ));
            }
            system_prompt.push('\n');
        }

        // 5. Assemble grounded user prompt with top Auxiliary TM matches
        let mut user_prompt = String::new();
        if let Some(prev) = prev_segment {
            if !prev.trim().is_empty() {
                user_prompt.push_str(&format!("PREVIOUS CONTEXT: {}\n\n", prev.trim()));
            }
        }

        let top_tm: Vec<TmMatch> = tm_matches.iter().take(3).cloned().collect();
        if !top_tm.is_empty() {
            user_prompt.push_str("AUXILIARY TRANSLATION MEMORY MATCHES:\n");
            for (idx, m) in top_tm.iter().enumerate() {
                user_prompt.push_str(&format!(
                    "{}. [{}% - {}] Source: \"{}\" => Target: \"{}\"\n",
                    idx + 1,
                    m.similarity_pct as u32,
                    m.entry.bank_name,
                    m.entry.source_text,
                    m.entry.target_text
                ));
            }
            user_prompt.push('\n');
        }

        user_prompt.push_str(&format!(
            "TRANSLATE THE FOLLOWING SEGMENT ({} -> {}):\n{}",
            self.source_lang, self.target_lang, source_segment
        ));

        CompiledSegmentHarness {
            system_prompt,
            user_prompt,
            active_skills,
            matched_glossary,
            applied_learned_rules,
            grounded_tm_matches: top_tm,
        }
    }

    /// Evolutionary Harness Loop: inspects the difference between the local model's draft
    /// and the translator's confirmed final translation, learning project-specific corrections.
    pub fn learn_from_post_edit(
        &mut self,
        ai_draft: &str,
        human_final: &str,
    ) -> Option<LearnedRule> {
        let draft_trimmed = ai_draft.trim();
        let final_trimmed = human_final.trim();

        if draft_trimmed.is_empty()
            || final_trimmed.is_empty()
            || draft_trimmed.eq_ignore_ascii_case(final_trimmed)
        {
            return None;
        }

        // Token-level diff to extract replaced phrase (longest common prefix & suffix trimming)
        let draft_words: Vec<&str> = draft_trimmed.split_whitespace().collect();
        let final_words: Vec<&str> = final_trimmed.split_whitespace().collect();

        let mut prefix_len = 0;
        while prefix_len < draft_words.len()
            && prefix_len < final_words.len()
            && draft_words[prefix_len].eq_ignore_ascii_case(final_words[prefix_len])
        {
            prefix_len += 1;
        }

        let mut draft_end = draft_words.len();
        let mut final_end = final_words.len();
        while draft_end > prefix_len
            && final_end > prefix_len
            && draft_words[draft_end - 1].eq_ignore_ascii_case(final_words[final_end - 1])
        {
            draft_end -= 1;
            final_end -= 1;
        }

        let replaced_from = draft_words[prefix_len..draft_end]
            .join(" ")
            .trim_matches(|c: char| !c.is_alphanumeric())
            .to_string();
        let replaced_to = final_words[prefix_len..final_end]
            .join(" ")
            .trim_matches(|c: char| !c.is_alphanumeric())
            .to_string();

        if replaced_from.is_empty()
            || replaced_to.is_empty()
            || replaced_from.split_whitespace().count() > 6
            || replaced_to.split_whitespace().count() > 6
        {
            return None;
        }

        // Check if we already learned this pattern in this project
        if let Some(existing) = self.learned_rules.iter_mut().find(|r| {
            r.pattern_from.eq_ignore_ascii_case(&replaced_from)
                && r.preferred_to.eq_ignore_ascii_case(&replaced_to)
        }) {
            existing.occurrences += 1;
            return Some(existing.clone());
        }

        let new_rule = LearnedRule {
            id: format!("rule-{:03}", self.learned_rules.len() + 1),
            pattern_from: replaced_from,
            preferred_to: replaced_to,
            rationale: "Extraído automaticamente de pós-edição humana no projeto".to_string(),
            occurrences: 1,
            active: true,
            created_at: chrono::Utc::now().to_rfc3339(),
        };

        self.learned_rules.push(new_rule.clone());
        Some(new_rule)
    }
}
