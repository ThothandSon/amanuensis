use crate::git_story::GitStoryEngine;
use crate::CoreError;
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::path::Path;

/// Configuration for generating an Obsidian Vault from an Amanuensis translation project.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ObsidianVaultConfig {
    pub project_name: String,
    pub author_name: String,
    pub translator_name: String,
    pub source_lang: String,
    pub target_lang: String,
    pub domain_specialty: String,
    pub model_id: String,
}

/// Represents a bilingual segment to be rendered into the Obsidian Manuscript and Canvas.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ObsidianBilingualSegment {
    pub id: String,
    pub index: usize,
    pub chapter_title: String,
    pub source_text: String,
    pub target_text: String,
    pub status: String,
    pub page_number: usize,
    pub linked_concepts: Vec<String>,
    pub linked_adrs: Vec<String>,
}

/// Represents an entry in `02_Atlas_Conceitual_e_Glossario/Conceitos/`.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ObsidianGlossaryEntry {
    pub slug: String,
    pub source_term: String,
    pub target_term: String,
    pub rejected_alternatives: Vec<String>,
    pub etymology_and_context: String,
    pub occurrences_segment_ids: Vec<String>,
}

/// Represents an Architectural / Editorial Decision Record in `03_Diario_de_Decisoes_Tradutorias/`.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ObsidianDecisionRecord {
    pub adr_id: String,
    pub title: String,
    pub status: String,
    pub context_problem: String,
    pub adopted_decision: String,
    pub affected_concepts: Vec<String>,
    pub affected_segments: Vec<String>,
}

/// JSON Canvas 1.0 Node (`https://jsoncanvas.org/spec/1.0/`).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CanvasNode {
    pub id: String,
    #[serde(rename = "type")]
    pub node_type: String, // "text" | "file" | "group"
    pub x: i32,
    pub y: i32,
    pub width: i32,
    pub height: i32,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub color: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub text: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub file: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub label: Option<String>,
}

/// JSON Canvas 1.0 Edge (`https://jsoncanvas.org/spec/1.0/`).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CanvasEdge {
    pub id: String,
    #[serde(rename = "fromNode")]
    pub from_node: String,
    #[serde(rename = "fromSide")]
    pub from_side: String,
    #[serde(rename = "toNode")]
    pub to_node: String,
    #[serde(rename = "toSide")]
    pub to_side: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub label: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub color: Option<String>,
}

/// Full JSON Canvas 1.0 document (`.canvas`).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ObsidianCanvasFile {
    pub relative_path: String,
    pub title: String,
    pub nodes: Vec<CanvasNode>,
    pub edges: Vec<CanvasEdge>,
}

/// A Markdown or JSON configuration file inside the generated Obsidian Vault.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ObsidianNoteFile {
    pub relative_path: String,
    pub category: String,
    pub content: String,
}

/// Result of running the 3 Deterministic Obsidian Validation Gates on a note.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ObsidianValidationGateResult {
    pub yaml_frontmatter_valid: bool,
    pub wikilinks_balanced_and_valid: bool,
    pub numeric_invariance_passed: bool,
    pub extracted_wikilinks: Vec<String>,
    pub errors: Vec<String>,
}

/// Result of a bidirectional byte-preserving sync from an Obsidian `.md` file back into Amanuensis.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BytePreservingSyncReport {
    pub preserved_custom_yaml_keys: BTreeMap<String, String>,
    pub preserved_user_callouts: Vec<String>,
    pub updated_segments: BTreeMap<String, String>,
    pub validation: ObsidianValidationGateResult,
    pub merged_markdown: String,
}

/// Complete generated Obsidian Vault bundle ready to be previewed in UI or flushed to disk.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ObsidianVaultBundle {
    pub config: ObsidianVaultConfig,
    pub notes: Vec<ObsidianNoteFile>,
    pub canvases: Vec<ObsidianCanvasFile>,
    pub graph_config_json: String,
}

pub struct ObsidianVaultGenerator;

impl ObsidianVaultGenerator {
    /// Generates the complete Obsidian Vault (MOCs, Bilingual Manuscript, Conceptual Atlas, ADRs,
    /// JSON Canvas 1.0 files, and `.obsidian/graph.json`) integrated with the GitStoryEngine.
    pub fn generate_vault(
        config: &ObsidianVaultConfig,
        segments: &[ObsidianBilingualSegment],
        glossary: &[ObsidianGlossaryEntry],
        adrs: &[ObsidianDecisionRecord],
        git_story: &GitStoryEngine,
    ) -> Result<ObsidianVaultBundle, CoreError> {
        let mut notes = Vec::new();
        let total_segments = segments.len().max(1);
        let confirmed_count = segments
            .iter()
            .filter(|s| s.status == "Confirmed" || s.status == "Translated")
            .count();
        let progress_pct = ((confirmed_count as f64 / total_segments as f64) * 100.0).round();

        // 1. .obsidian/graph.json with semantic color groups
        let graph_json = serde_json::json!({
            "collapse-filter": false,
            "search": "",
            "showTags": true,
            "showAttachments": false,
            "hideUnresolved": false,
            "showOrphans": true,
            "collapse-color-groups": false,
            "colorGroups": [
                { "query": "path:01_Manuscrito_Bilingue", "color": { "a": 1, "rgb": 3447003 } },
                { "query": "path:02_Atlas_Conceitual_e_Glossario", "color": { "a": 1, "rgb": 15844367 } },
                { "query": "path:03_Diario_de_Decisoes_Tradutorias", "color": { "a": 1, "rgb": 10181046 } },
                { "query": "tag:#alerta-qa", "color": { "a": 1, "rgb": 15158332 } }
            ],
            "collapse-display": false,
            "showArrow": true,
            "textFadeMultiplier": 0,
            "nodeSizeMultiplier": 1.15,
            "lineSizeMultiplier": 1.0,
            "collapse-forces": false,
            "centerStrength": 0.52,
            "repulsionStrength": 10.0,
            "linkStrength": 1.0,
            "linkDistance": 250
        });
        let graph_config_json = serde_json::to_string_pretty(&graph_json)?;
        notes.push(ObsidianNoteFile {
            relative_path: ".obsidian/graph.json".to_string(),
            category: "Config".to_string(),
            content: graph_config_json.clone(),
        });

        // 2. 00_MOC_e_Painel_da_Obra/🏛️ MOC - <Obra>.md
        let mut moc_content = format!(
            "---\ntitle: \"🏛️ MOC — {project}\"\nauthor: \"{author}\"\ntranslator: \"{translator}\"\nsource_lang: \"{src}\"\ntarget_lang: \"{tgt}\"\ndomain: \"{dom}\"\nmodel: \"{model}\"\nprogress_pct: {pct}\ntags:\n  - amanuensis/moc\n  - traducao/biblioteca-viva\n---\n\n# 🏛️ Mapa de Conteúdo (MOC) — {project}\n\n> [!abstract] Biblioteca Viva & História Versionada\n> Cada tradução é um organismo intelectual vivo. Este Vault conecta o **Manuscrito Bilíngue**, o **Atlas Conceitual**, o **Diário de Decisões (ADRs)** e a **Crônica Git**.\n\n## 🧭 Índices Principais\n- [[📊 Painel de Evolucao e Metricas]]\n- [[🕰️ Cronica da Traducao (Git Log)]]\n- [[Cap_01_Manuscrito|📖 Manuscrito Bilíngue Sincronizado]]\n- [[Mapa_Conceitual_da_Obra.canvas|🕸️ Canvas Visual: Mapa Conceitual da Obra]]\n- [[Linha_Evolutiva_dos_Trechos_Criticos.canvas|🧬 Canvas Visual: Genealogia dos Trechos Críticos]]\n\n## 🏛️ Atlas Conceitual ({glossary_len} termos nucleares)\n",
            project = config.project_name,
            author = config.author_name,
            translator = config.translator_name,
            src = config.source_lang,
            tgt = config.target_lang,
            dom = config.domain_specialty,
            model = config.model_id,
            pct = progress_pct,
            glossary_len = glossary.len()
        );
        for g in glossary {
            moc_content.push_str(&format!(
                "- [[{slug}|{src} → {tgt}]] — _{ctx}_\n",
                slug = g.slug,
                src = g.source_term,
                tgt = g.target_term,
                ctx = g.etymology_and_context
            ));
        }
        moc_content.push_str("\n## ⚖️ Diário de Decisões Tradutórias (ADRs)\n");
        for adr in adrs {
            moc_content.push_str(&format!(
                "- [[{id}|{id}: {title}]] (`{status}`)\n",
                id = adr.adr_id,
                title = adr.title,
                status = adr.status
            ));
        }

        notes.push(ObsidianNoteFile {
            relative_path: format!(
                "00_MOC_e_Painel_da_Obra/🏛️ MOC - {}.md",
                config.project_name
            ),
            category: "MOC".to_string(),
            content: moc_content,
        });

        // 3. 00_MOC_e_Painel_da_Obra/📊 Painel de Evolucao e Metricas.md (Dataview compatible)
        let metrics_content = format!(
            "---\ntitle: \"📊 Painel de Evolução e Métricas\"\nproject: \"{project}\"\nprogress_pct: {pct}\nconfirmed_segments: {conf}\ntotal_segments: {tot}\ncommits_count: {commits}\ntags:\n  - amanuensis/painel\n  - dataview\n---\n\n# 📊 Painel de Evolução e Métricas — {project}\n\n| Indicador | Valor Atual |\n| :--- | :--- |\n| **Progresso Geral** | `{pct}%` ({conf}/{tot} trechos) |\n| **Domínio / Harness** | `{dom}` |\n| **Modelo Local Ativo** | `{model}` |\n| **Termos no Atlas Conceitual** | `{gloss}` |\n| **Decisões Editoriais (ADRs)** | `{adrs}` |\n| **Commits Semânticos Git** | `{commits}` |\n\n## 🔎 Consultas Dinâmicas (Obsidian Dataview)\n\n```dataview\nTABLE source_term AS \"Original\", target_term AS \"Tradução Canônica\", length(occurrences) AS \"Ocorrências\"\nFROM \"02_Atlas_Conceitual_e_Glossario/Conceitos\"\nSORT length(occurrences) DESC\n```\n\n```dataview\nTABLE status AS \"Status\", affected_concepts AS \"Conceitos\"\nFROM \"03_Diario_de_Decisoes_Tradutorias\"\nSORT file.name ASC\n```\n",
            project = config.project_name,
            pct = progress_pct,
            conf = confirmed_count,
            tot = total_segments,
            dom = config.domain_specialty,
            model = config.model_id,
            gloss = glossary.len(),
            adrs = adrs.len(),
            commits = git_story.commits.len()
        );
        notes.push(ObsidianNoteFile {
            relative_path: "00_MOC_e_Painel_da_Obra/📊 Painel de Evolucao e Metricas.md"
                .to_string(),
            category: "MOC".to_string(),
            content: metrics_content,
        });

        // 4. 00_MOC_e_Painel_da_Obra/🕰️ Cronica da Traducao (Git Log).md
        notes.push(ObsidianNoteFile {
            relative_path: "00_MOC_e_Painel_da_Obra/🕰️ Cronica da Traducao (Git Log).md"
                .to_string(),
            category: "GitStory".to_string(),
            content: git_story.render_chronicle_markdown(),
        });

        // 5. 01_Manuscrito_Bilingue/Cap_01_Manuscrito.md
        let mut manuscript_md = format!(
            "---\ntitle: \"📖 Manuscrito Bilíngue — {project}\"\nsource_lang: \"{src}\"\ntarget_lang: \"{tgt}\"\nprogress_pct: {pct}\ntags:\n  - amanuensis/manuscrito\n---\n\n# 📖 Manuscrito Bilíngue — {project}\n\n<!-- OBSIDIAN_USER_NOTES_START -->\n> [!note] Notas Livres do Tradutor no Obsidian\n> Adicione comentários ou chaves YAML extras; a sincronização byte-preserving do Amanuensis preserva este bloco intacto.\n<!-- OBSIDIAN_USER_NOTES_END -->\n\n",
            project = config.project_name,
            src = config.source_lang,
            tgt = config.target_lang,
            pct = progress_pct,
        );

        for seg in segments {
            let concepts_links = if seg.linked_concepts.is_empty() {
                "Nenhum".to_string()
            } else {
                seg.linked_concepts
                    .iter()
                    .map(|c| format!("[[{}]]", c))
                    .collect::<Vec<_>>()
                    .join(", ")
            };
            let adr_links = if seg.linked_adrs.is_empty() {
                "Nenhum".to_string()
            } else {
                seg.linked_adrs
                    .iter()
                    .map(|a| format!("[[{}]]", a))
                    .collect::<Vec<_>>()
                    .join(", ")
            };

            manuscript_md.push_str(&format!(
                "## Trecho #{idx} (`{id}`) ^seg-{id}\n- **Status:** `{status}` | **Página Scan:** `{page}` | **Conceitos:** {concepts} | **ADRs:** {adrs}\n\n> [!quote] Original ({src_lang})\n> {src_txt}\n\n<!-- AMANUENSIS_TARGET_START:{id} -->\n{tgt_txt}\n<!-- AMANUENSIS_TARGET_END:{id} -->\n\n",
                idx = seg.index + 1,
                id = seg.id,
                status = seg.status,
                page = seg.page_number,
                concepts = concepts_links,
                adrs = adr_links,
                src_lang = config.source_lang,
                src_txt = seg.source_text.replace('\n', "\n> "),
                tgt_txt = if seg.target_text.trim().is_empty() {
                    "_ [Aguardando tradução] _".to_string()
                } else {
                    seg.target_text.clone()
                }
            ));

            if let Some(gen) = git_story.genealogies.get(&seg.index) {
                manuscript_md.push_str(&gen.to_obsidian_callout());
                manuscript_md.push('\n');
            }
        }

        notes.push(ObsidianNoteFile {
            relative_path: "01_Manuscrito_Bilingue/Cap_01_Manuscrito.md".to_string(),
            category: "Manuscrito".to_string(),
            content: manuscript_md,
        });

        // 6. 02_Atlas_Conceitual_e_Glossario/Conceitos/<slug>.md
        for entry in glossary {
            let rejected = if entry.rejected_alternatives.is_empty() {
                "Nenhuma registrada".to_string()
            } else {
                entry.rejected_alternatives.join(", ")
            };
            let backlinks = entry
                .occurrences_segment_ids
                .iter()
                .map(|id| format!("- [[Cap_01_Manuscrito#^seg-{id}|Trecho {id}]]"))
                .collect::<Vec<_>>()
                .join("\n");

            let concept_md = format!(
                "---\ntitle: \"{src} → {tgt}\"\nsource_term: \"{src}\"\ntarget_term: \"{tgt}\"\nrejected: {rej_json}\noccurrences: {occ_json}\ntags:\n  - amanuensis/conceito\n  - glossario\n---\n\n# 🧭 Conceito: {src} → **{tgt}**\n\n- **Termo Original ({src_lang}):** `{src}`\n- **Tradução Canônica Adotada ({tgt_lang}):** **{tgt}**\n- **Traduções Descartadas / Evitadas:** _{rej}_\n\n## 📚 Fundamentação Filológica & Contextual\n{ctx}\n\n## 🔗 Passagens Conectadas no Manuscrito\n{backlinks}\n",
                src = entry.source_term,
                tgt = entry.target_term,
                rej_json = serde_json::to_string(&entry.rejected_alternatives).unwrap_or_else(|_| "[]".to_string()),
                occ_json = serde_json::to_string(&entry.occurrences_segment_ids).unwrap_or_else(|_| "[]".to_string()),
                src_lang = config.source_lang,
                tgt_lang = config.target_lang,
                rej = rejected,
                ctx = entry.etymology_and_context,
                backlinks = if backlinks.is_empty() { "- [[Cap_01_Manuscrito]]".to_string() } else { backlinks }
            );
            notes.push(ObsidianNoteFile {
                relative_path: format!(
                    "02_Atlas_Conceitual_e_Glossario/Conceitos/{}.md",
                    entry.slug
                ),
                category: "Conceito".to_string(),
                content: concept_md,
            });
        }

        // 7. 03_Diario_de_Decisoes_Tradutorias/<ADR>.md
        for adr in adrs {
            let concepts = adr
                .affected_concepts
                .iter()
                .map(|c| format!("[[{}]]", c))
                .collect::<Vec<_>>()
                .join(", ");
            let segs = adr
                .affected_segments
                .iter()
                .map(|s| format!("[[Cap_01_Manuscrito#^seg-{s}|{s}]]"))
                .collect::<Vec<_>>()
                .join(", ");

            let adr_md = format!(
                "---\ntitle: \"{id}: {title}\"\nadr_id: \"{id}\"\nstatus: \"{status}\"\naffected_concepts: {c_json}\ntags:\n  - amanuensis/adr\n  - decisao-editorial\n---\n\n# ⚖️ {id} — {title}\n\n- **Status:** `{status}`\n- **Conceitos Afetados:** {concepts}\n- **Trechos Impactados:** {segs}\n\n## 🧩 Dilema Tradutório / Problema\n{problem}\n\n## ✅ Decisão Editorial & Regra do Harness\n{decision}\n",
                id = adr.adr_id,
                title = adr.title,
                status = adr.status,
                c_json = serde_json::to_string(&adr.affected_concepts).unwrap_or_else(|_| "[]".to_string()),
                concepts = if concepts.is_empty() { "Geral".to_string() } else { concepts },
                segs = if segs.is_empty() { "Todo o Manuscrito".to_string() } else { segs },
                problem = adr.context_problem,
                decision = adr.adopted_decision
            );
            notes.push(ObsidianNoteFile {
                relative_path: format!("03_Diario_de_Decisoes_Tradutorias/{}.md", adr.adr_id),
                category: "ADR".to_string(),
                content: adr_md,
            });
        }

        // 8. Generate JSON Canvas 1.0 files in 04_Grafos_e_Canvas/
        let concept_canvas = Self::build_conceptual_map_canvas(config, glossary, adrs)?;
        let genealogy_canvas = Self::build_genealogy_canvas(segments, git_story)?;

        notes.push(ObsidianNoteFile {
            relative_path: concept_canvas.relative_path.clone(),
            category: "Canvas".to_string(),
            content: serde_json::to_string_pretty(&serde_json::json!({
                "nodes": concept_canvas.nodes,
                "edges": concept_canvas.edges
            }))?,
        });

        notes.push(ObsidianNoteFile {
            relative_path: genealogy_canvas.relative_path.clone(),
            category: "Canvas".to_string(),
            content: serde_json::to_string_pretty(&serde_json::json!({
                "nodes": genealogy_canvas.nodes,
                "edges": genealogy_canvas.edges
            }))?,
        });

        Ok(ObsidianVaultBundle {
            config: config.clone(),
            notes,
            canvases: vec![concept_canvas, genealogy_canvas],
            graph_config_json,
        })
    }

    fn build_conceptual_map_canvas(
        config: &ObsidianVaultConfig,
        glossary: &[ObsidianGlossaryEntry],
        adrs: &[ObsidianDecisionRecord],
    ) -> Result<ObsidianCanvasFile, CoreError> {
        let mut nodes = Vec::new();
        let mut edges = Vec::new();

        // Central MOC Node
        nodes.push(CanvasNode {
            id: "node-moc-root".to_string(),
            node_type: "text".to_string(),
            x: 0,
            y: 0,
            width: 340,
            height: 150,
            color: Some("4".to_string()), // Green/Teal in Obsidian Canvas
            text: Some(format!(
                "### 🏛️ {}\n**Autor:** {}\n**Tradutor:** {}\n**Domínio:** `{}`",
                config.project_name,
                config.author_name,
                config.translator_name,
                config.domain_specialty
            )),
            file: None,
            label: None,
        });

        for (i, g) in glossary.iter().enumerate() {
            let node_id = format!("node-concept-{}", g.slug);
            let y_offset = (i as i32 - (glossary.len() as i32 / 2)) * 170;
            nodes.push(CanvasNode {
                id: node_id.clone(),
                node_type: "text".to_string(),
                x: -460,
                y: y_offset,
                width: 330,
                height: 135,
                color: Some("3".to_string()), // Yellow/Gold for concepts
                text: Some(format!(
                    "#### 🧭 {} → **{}**\n_{}_\nEvitado: `{}`",
                    g.source_term,
                    g.target_term,
                    g.etymology_and_context,
                    g.rejected_alternatives.join(", ")
                )),
                file: None,
                label: None,
            });
            edges.push(CanvasEdge {
                id: format!("edge-moc-concept-{}", i),
                from_node: "node-moc-root".to_string(),
                from_side: "left".to_string(),
                to_node: node_id,
                to_side: "right".to_string(),
                label: Some("Conceito Nuclear".to_string()),
                color: Some("3".to_string()),
            });
        }

        for (j, adr) in adrs.iter().enumerate() {
            let node_id = format!("node-adr-{}", adr.adr_id);
            let y_offset = (j as i32 - (adrs.len() as i32 / 2)) * 185;
            nodes.push(CanvasNode {
                id: node_id.clone(),
                node_type: "text".to_string(),
                x: 460,
                y: y_offset,
                width: 350,
                height: 150,
                color: Some("6".to_string()), // Purple for ADRs
                text: Some(format!(
                    "#### ⚖️ {}: {}\n**Status:** `{}`\n{}",
                    adr.adr_id, adr.title, adr.status, adr.adopted_decision
                )),
                file: None,
                label: None,
            });
            edges.push(CanvasEdge {
                id: format!("edge-moc-adr-{}", j),
                from_node: "node-moc-root".to_string(),
                from_side: "right".to_string(),
                to_node: node_id,
                to_side: "left".to_string(),
                label: Some("Decisão (ADR)".to_string()),
                color: Some("6".to_string()),
            });
        }

        Ok(ObsidianCanvasFile {
            relative_path: "04_Grafos_e_Canvas/Mapa_Conceitual_da_Obra.canvas".to_string(),
            title: "Mapa Conceitual da Obra (JSON Canvas 1.0)".to_string(),
            nodes,
            edges,
        })
    }

    fn build_genealogy_canvas(
        segments: &[ObsidianBilingualSegment],
        git_story: &GitStoryEngine,
    ) -> Result<ObsidianCanvasFile, CoreError> {
        let mut nodes = Vec::new();
        let mut edges = Vec::new();

        for (row_idx, seg) in segments.iter().take(6).enumerate() {
            let y = (row_idx as i32) * 210;
            if let Some(gen) = git_story.genealogies.get(&seg.index) {
                for (col_idx, rev) in gen.revisions.iter().enumerate() {
                    let node_id = format!("gen-{}-v{}", seg.id, rev.version_number);
                    let x = (col_idx as i32) * 390;
                    let color = match col_idx {
                        0 => "1", // Red/Orange: Original
                        1 => "5", // Cyan/Blue: IA Local
                        _ => "4", // Green: Human Confirmed / ADR
                    };
                    nodes.push(CanvasNode {
                        id: node_id.clone(),
                        node_type: "text".to_string(),
                        x,
                        y,
                        width: 340,
                        height: 165,
                        color: Some(color.to_string()),
                        text: Some(format!(
                            "#### {} (v{} — {})\n`{}`\n\n{}",
                            seg.id,
                            rev.version_number,
                            rev.stage_label,
                            rev.commit_short_hash,
                            rev.text
                        )),
                        file: None,
                        label: None,
                    });

                    if col_idx > 0 {
                        let prev_id = format!("gen-{}-v{}", seg.id, rev.version_number - 1);
                        edges.push(CanvasEdge {
                            id: format!("edge-{}-to-{}", prev_id, node_id),
                            from_node: prev_id,
                            from_side: "right".to_string(),
                            to_node: node_id,
                            to_side: "left".to_string(),
                            label: Some(rev.stage_label.clone()),
                            color: Some(color.to_string()),
                        });
                    }
                }
            } else {
                // Default v0 -> v1 nodes when genealogy is not explicitly populated yet
                let v0_id = format!("gen-{}-v0", seg.id);
                let v1_id = format!("gen-{}-v1", seg.id);
                nodes.push(CanvasNode {
                    id: v0_id.clone(),
                    node_type: "text".to_string(),
                    x: 0,
                    y,
                    width: 340,
                    height: 150,
                    color: Some("1".to_string()),
                    text: Some(format!(
                        "#### {} (v0 — Original)\n{}",
                        seg.id, seg.source_text
                    )),
                    file: None,
                    label: None,
                });
                nodes.push(CanvasNode {
                    id: v1_id.clone(),
                    node_type: "text".to_string(),
                    x: 390,
                    y,
                    width: 340,
                    height: 150,
                    color: Some("4".to_string()),
                    text: Some(format!(
                        "#### {} (v1 — Tradução)\n{}",
                        seg.id, seg.target_text
                    )),
                    file: None,
                    label: None,
                });
                edges.push(CanvasEdge {
                    id: format!("edge-{}-to-{}", v0_id, v1_id),
                    from_node: v0_id,
                    from_side: "right".to_string(),
                    to_node: v1_id,
                    to_side: "left".to_string(),
                    label: Some(seg.status.clone()),
                    color: Some("4".to_string()),
                });
            }
        }

        Ok(ObsidianCanvasFile {
            relative_path: "04_Grafos_e_Canvas/Linha_Evolutiva_dos_Trechos_Criticos.canvas"
                .to_string(),
            title: "Linha Evolutiva dos Trechos Críticos (Genealogia Git)".to_string(),
            nodes,
            edges,
        })
    }

    /// Runs the 3 Deterministic Validation Gates on an Obsidian Markdown note:
    /// 1. YAML Frontmatter Gate (delimited by `---` and valid `key: value` lines)
    /// 2. `[[Wikilinks]]` Integrity Gate (balanced brackets and non-empty targets)
    /// 3. Numeric Invariance Gate (all numbers in `source_numbers_reference` exist in the note body)
    pub fn validate_note_gates(
        markdown: &str,
        source_numbers_reference: &[String],
    ) -> ObsidianValidationGateResult {
        let mut errors = Vec::new();

        // Gate 1: YAML Frontmatter validation
        let yaml_frontmatter_valid = if let Some(rest) = markdown.strip_prefix("---\n") {
            if let Some(end_idx) = rest.find("\n---\n") {
                let yaml_block = &rest[..end_idx];
                yaml_block.lines().all(|line| {
                    let trimmed = line.trim();
                    trimmed.is_empty()
                        || trimmed.starts_with('-')
                        || trimmed.starts_with('#')
                        || trimmed.contains(':')
                })
            } else {
                errors.push(
                    "YAML Frontmatter não possui delimitador de fechamento '---'.".to_string(),
                );
                false
            }
        } else {
            errors.push("Nota não inicia com bloco YAML Frontmatter '---'.".to_string());
            false
        };

        // Gate 2: [[Wikilinks]] Integrity Gate
        let mut wikilinks_balanced_and_valid = true;
        let mut extracted_wikilinks = Vec::new();
        let open_count = markdown.matches("[[").count();
        let close_count = markdown.matches("]]").count();
        if open_count != close_count {
            wikilinks_balanced_and_valid = false;
            errors.push(format!(
                "Wikilinks desbalanceados: {} aberturas '[[' vs {} fechamentos ']]'.",
                open_count, close_count
            ));
        }

        let mut search_from = 0;
        while let Some(start) = markdown[search_from..].find("[[") {
            let abs_start = search_from + start + 2;
            if let Some(end) = markdown[abs_start..].find("]]") {
                let link_inner = markdown[abs_start..abs_start + end].trim();
                if link_inner.is_empty() {
                    wikilinks_balanced_and_valid = false;
                    errors.push("Wikilink vazio '[[]]' detectado.".to_string());
                } else {
                    extracted_wikilinks.push(link_inner.to_string());
                }
                search_from = abs_start + end + 2;
            } else {
                break;
            }
        }

        // Gate 3: Numeric invariance gate
        let mut numeric_invariance_passed = true;
        for num in source_numbers_reference {
            if !markdown.contains(num) {
                numeric_invariance_passed = false;
                errors.push(format!(
                    "Invariância numérica violada: número '{}' ausente na nota sincronizada.",
                    num
                ));
            }
        }

        ObsidianValidationGateResult {
            yaml_frontmatter_valid,
            wikilinks_balanced_and_valid,
            numeric_invariance_passed,
            extracted_wikilinks,
            errors,
        }
    }

    /// Performs a Byte-Preserving Bidirectional Round-Trip Merge:
    /// Reads an Obsidian Markdown file edited by the user in Obsidian, preserves any custom YAML
    /// frontmatter keys (`status_editorial`, `revisor`, custom tags) and `<!-- OBSIDIAN_USER_NOTES -->`
    /// blocks, extracts any updated segment translations inside `<!-- AMANUENSIS_TARGET_START:id -->`,
    /// and returns the merged document + extracted segment updates.
    pub fn byte_preserving_roundtrip_merge(
        user_edited_markdown: &str,
        amanuensis_segment_updates: &BTreeMap<String, String>,
        required_numbers: &[String],
    ) -> BytePreservingSyncReport {
        let mut preserved_custom_yaml_keys = BTreeMap::new();
        let mut preserved_user_callouts = Vec::new();
        let mut updated_segments = BTreeMap::new();

        // 1. Extract custom YAML keys added by the user in Obsidian
        let standard_keys = [
            "title",
            "author",
            "translator",
            "source_lang",
            "target_lang",
            "domain",
            "model",
            "progress_pct",
            "tags",
        ];
        if let Some(rest) = user_edited_markdown.strip_prefix("---\n") {
            if let Some(end_idx) = rest.find("\n---\n") {
                let yaml_block = &rest[..end_idx];
                for line in yaml_block.lines() {
                    if let Some((k, v)) = line.split_once(':') {
                        let key = k.trim();
                        let val = v.trim().trim_matches('"');
                        if !key.is_empty() && !key.starts_with('-') && !standard_keys.contains(&key)
                        {
                            preserved_custom_yaml_keys.insert(key.to_string(), val.to_string());
                        }
                    }
                }
            }
        }

        // 2. Preserve user notes block
        if let (Some(s), Some(e)) = (
            user_edited_markdown.find("<!-- OBSIDIAN_USER_NOTES_START -->"),
            user_edited_markdown.find("<!-- OBSIDIAN_USER_NOTES_END -->"),
        ) {
            if e > s {
                let block =
                    user_edited_markdown[s + "<!-- OBSIDIAN_USER_NOTES_START -->".len()..e].trim();
                if !block.is_empty() {
                    preserved_user_callouts.push(block.to_string());
                }
            }
        }

        // 3. Extract segment targets edited in Obsidian AND apply new Amanuensis updates if provided
        let mut merged_markdown = user_edited_markdown.to_string();
        let mut cursor = 0;
        let start_prefix = "<!-- AMANUENSIS_TARGET_START:";
        while let Some(pos) = merged_markdown[cursor..].find(start_prefix) {
            let abs_pos = cursor + pos;
            let after_prefix = abs_pos + start_prefix.len();
            if let Some(end_tag_close) = merged_markdown[after_prefix..].find("-->") {
                let seg_id = merged_markdown[after_prefix..after_prefix + end_tag_close]
                    .trim()
                    .to_string();
                let content_start = after_prefix + end_tag_close + 3;
                let end_marker = format!("<!-- AMANUENSIS_TARGET_END:{} -->", seg_id);
                if let Some(content_end_rel) = merged_markdown[content_start..].find(&end_marker) {
                    let content_end = content_start + content_end_rel;
                    let current_obsidian_text = merged_markdown[content_start..content_end]
                        .trim()
                        .to_string();

                    if let Some(new_from_app) = amanuensis_segment_updates.get(&seg_id) {
                        let replacement = format!("\n{}\n", new_from_app.trim());
                        merged_markdown.replace_range(content_start..content_end, &replacement);
                        updated_segments.insert(seg_id.clone(), new_from_app.trim().to_string());
                        cursor = content_start + replacement.len() + end_marker.len();
                    } else {
                        updated_segments.insert(seg_id.clone(), current_obsidian_text);
                        cursor = content_end + end_marker.len();
                    }
                    continue;
                }
            }
            break;
        }

        let validation = Self::validate_note_gates(&merged_markdown, required_numbers);

        BytePreservingSyncReport {
            preserved_custom_yaml_keys,
            preserved_user_callouts,
            updated_segments,
            validation,
            merged_markdown,
        }
    }

    /// Writes the generated Obsidian Vault files to disk and initializes/commits the GitStoryEngine.
    pub fn write_bundle_to_disk(
        vault_root: &Path,
        bundle: &ObsidianVaultBundle,
        git_story: &mut GitStoryEngine,
    ) -> Result<String, CoreError> {
        for note in &bundle.notes {
            let target_path = vault_root.join(&note.relative_path);
            if let Some(parent) = target_path.parent() {
                std::fs::create_dir_all(parent)?;
            }
            std::fs::write(&target_path, &note.content)?;
        }
        let msg = format!(
            "obsidian(vault): sincronização da biblioteca viva '{}' ({} notas, {} canvas)",
            bundle.config.project_name,
            bundle.notes.len(),
            bundle.canvases.len()
        );
        let _ = git_story.init_and_commit_on_disk(vault_root, &msg);
        Ok(msg)
    }
}
