use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::Path;
use std::process::Command;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum SemanticCommitKind {
    Ingest,
    Translate,
    HarnessEvolution,
    MilestoneTag,
    ObsidianSync,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SemanticGitCommit {
    pub commit_hash: String,
    pub short_hash: String,
    pub kind: SemanticCommitKind,
    pub scope: String,
    pub summary: String,
    pub full_message: String,
    pub timestamp_iso: String,
    pub author: String,
    pub affected_segments: Vec<usize>,
    pub tag_name: Option<String>,
    pub stats_note: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum SegmentVersionStage {
    OriginalSource,
    LocalAiDraft,
    HumanPostEdit,
    ZenModeRefinement,
    ObsidianRoundTrip,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SegmentRevisionEntry {
    pub version_number: usize,
    pub stage: SegmentVersionStage,
    pub stage_label: String,
    pub text: String,
    pub commit_short_hash: String,
    pub timestamp_label: String,
    pub model_or_author: String,
    pub rationale_or_adr: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SegmentGenealogy {
    pub segment_index: usize,
    pub source_text: String,
    pub current_target_text: String,
    pub revisions: Vec<SegmentRevisionEntry>,
}

impl SegmentGenealogy {
    pub fn to_obsidian_callout(&self) -> String {
        let mut out = format!(
            "> [!example]- 🕰️ História Git deste Trecho (`#{}`)\n",
            self.segment_index
        );
        for rev in &self.revisions {
            let adr_suffix = rev
                .rationale_or_adr
                .as_ref()
                .map(|r| format!(" — _{}_", r))
                .unwrap_or_default();
            out.push_str(&format!(
                "> - **{}** (`{}` • `{}`): \"{}\"{}\n",
                rev.stage_label, rev.commit_short_hash, rev.model_or_author, rev.text, adr_suffix
            ));
        }
        out
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitStoryEngine {
    pub project_slug: String,
    pub current_branch: String,
    pub commits: Vec<SemanticGitCommit>,
    pub genealogies: HashMap<usize, SegmentGenealogy>,
}

impl GitStoryEngine {
    pub fn new(project_slug: &str) -> Self {
        Self {
            project_slug: project_slug.to_string(),
            current_branch: "main".to_string(),
            commits: Vec::new(),
            genealogies: HashMap::new(),
        }
    }

    fn compute_deterministic_hash(seed: &str, seq: usize) -> (String, String) {
        let mut h1: u64 = 0xcbf29ce484222325;
        for b in seed.as_bytes() {
            h1 ^= *b as u64;
            h1 = h1.wrapping_mul(0x100000001b3);
        }
        h1 ^= (seq as u64).wrapping_mul(0x9e3779b97f4a7c15);
        let full = format!("{:016x}{:016x}a4f92c1b", h1, h1.rotate_left(19));
        let short = full[..7].to_string();
        (full, short)
    }

    pub fn record_semantic_commit(
        &mut self,
        kind: SemanticCommitKind,
        scope: &str,
        description: &str,
        affected_segments: Vec<usize>,
        tag_name: Option<String>,
        stats_note: &str,
    ) -> SemanticGitCommit {
        let prefix = match kind {
            SemanticCommitKind::Ingest => "ingest",
            SemanticCommitKind::Translate => "translate",
            SemanticCommitKind::HarnessEvolution => "harness",
            SemanticCommitKind::MilestoneTag => "milestone",
            SemanticCommitKind::ObsidianSync => "obsidian",
        };
        let summary = format!("{}({}): {}", prefix, scope, description);
        let seq = self.commits.len() + 1;
        let (commit_hash, short_hash) = Self::compute_deterministic_hash(&summary, seq);

        let commit = SemanticGitCommit {
            commit_hash,
            short_hash,
            kind,
            scope: scope.to_string(),
            summary: summary.clone(),
            full_message: format!("{}\n\nStats: {}", summary, stats_note),
            timestamp_iso: format!("2026-11-04T02:{:02}:00-03:00", (seq * 3) % 60),
            author: "Amanuensis Translation Story Engine".to_string(),
            affected_segments,
            tag_name,
            stats_note: stats_note.to_string(),
        };
        self.commits.insert(0, commit.clone());
        commit
    }

    pub fn record_segment_revision(
        &mut self,
        segment_index: usize,
        source_text: &str,
        stage: SegmentVersionStage,
        text: &str,
        model_or_author: &str,
        rationale_or_adr: Option<String>,
    ) -> &SegmentGenealogy {
        let seq = self.commits.len() + 1;
        let (_, short_hash) =
            Self::compute_deterministic_hash(&format!("{}:{}:{}", segment_index, text, seq), seq);

        let entry_list =
            self.genealogies
                .entry(segment_index)
                .or_insert_with(|| SegmentGenealogy {
                    segment_index,
                    source_text: source_text.to_string(),
                    current_target_text: String::new(),
                    revisions: vec![SegmentRevisionEntry {
                        version_number: 0,
                        stage: SegmentVersionStage::OriginalSource,
                        stage_label: "Versão 0 (Original Extraído)".to_string(),
                        text: source_text.to_string(),
                        commit_short_hash: "0000base".to_string(),
                        timestamp_label: "Importação Inicial".to_string(),
                        model_or_author: "Documento Fonte / OCR".to_string(),
                        rationale_or_adr: None,
                    }],
                });

        let next_ver = entry_list.revisions.len();
        let stage_label = match stage {
            SegmentVersionStage::OriginalSource => format!("Versão {} (Original)", next_ver),
            SegmentVersionStage::LocalAiDraft => format!("Versão {} (Sugestão IA Local)", next_ver),
            SegmentVersionStage::HumanPostEdit => {
                format!("Versão {} (Pós-Edição do Tradutor)", next_ver)
            }
            SegmentVersionStage::ZenModeRefinement => {
                format!("Versão {} (Refino Criativo Modo Zen)", next_ver)
            }
            SegmentVersionStage::ObsidianRoundTrip => {
                format!("Versão {} (Edição Sincronizada via Obsidian)", next_ver)
            }
        };

        entry_list.current_target_text = text.to_string();
        entry_list.revisions.push(SegmentRevisionEntry {
            version_number: next_ver,
            stage,
            stage_label,
            text: text.to_string(),
            commit_short_hash: short_hash,
            timestamp_label: format!("v0.{}", next_ver),
            model_or_author: model_or_author.to_string(),
            rationale_or_adr,
        });

        self.genealogies.get(&segment_index).unwrap()
    }

    pub fn init_and_commit_on_disk(&self, vault_dir: &Path, commit_message: &str) -> bool {
        if !vault_dir.exists() {
            return false;
        }
        let git_dir = vault_dir.join(".git");
        if !git_dir.exists() {
            let _ = Command::new("git")
                .arg("init")
                .current_dir(vault_dir)
                .output();
            let _ = Command::new("git")
                .args(["config", "user.name", "Amanuensis Translation Story"])
                .current_dir(vault_dir)
                .output();
            let _ = Command::new("git")
                .args(["config", "user.email", "translator@amanuensis.local"])
                .current_dir(vault_dir)
                .output();
        }
        let _ = Command::new("git")
            .args(["add", "-A"])
            .current_dir(vault_dir)
            .output();
        let status = Command::new("git")
            .args(["commit", "-m", commit_message, "--allow-empty"])
            .current_dir(vault_dir)
            .status();
        status.map(|s| s.success()).unwrap_or(false)
    }

    pub fn render_chronicle_markdown(&self) -> String {
        let mut md = format!(
            "---\ntitle: \"🕰️ Crônica da Tradução (Git Log) — {slug}\"\nbranch: \"{branch}\"\ncommits_count: {count}\ntags:\n  - amanuensis/git-story\n  - cronica-tradutoria\n---\n\n# 🕰️ Crônica da Tradução (Git Log) — {slug}\n\n| Hash | Tipo | Mensagem Semântica | Tag / Marco | Timestamp |\n| :--- | :--- | :--- | :--- | :--- |\n",
            slug = self.project_slug,
            branch = self.current_branch,
            count = self.commits.len()
        );
        for c in &self.commits {
            md.push_str(&format!(
                "| `{}` | `{:?}` | {} | `{}` | `{}` |\n",
                c.short_hash,
                c.kind,
                c.summary,
                c.tag_name.as_deref().unwrap_or("—"),
                c.timestamp_iso
            ));
        }
        md
    }
}
