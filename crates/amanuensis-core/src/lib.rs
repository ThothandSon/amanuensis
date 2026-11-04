pub mod dejavu_assemble;
pub mod git_story;
pub mod harness;
pub mod livedocs;
pub mod llm;
pub mod obsidian;
pub mod ocr;
pub mod omegat_propagation;
pub mod project;
pub mod tm;

use thiserror::Error;

#[derive(Debug, Error)]
pub enum CoreError {
    #[error("Database error: {0}")]
    Database(#[from] rusqlite::Error),
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    #[error("JSON serialization error: {0}")]
    Json(#[from] serde_json::Error),
    #[error("Serialization error: {0}")]
    Serialization(String),
    #[error("Not found: {0}")]
    NotFound(String),
}

#[cfg(test)]
mod tests {
    use crate::harness::ProjectHarness;
    use crate::ocr::{
        ChunkGranularity, DocumentIngestionMode, FormattedOcrSegment, LayoutBlockKind,
        OcrFormattingHarness, OcrPipelineConfig, ScannedPdfSuite, UniversalDocumentIngestor,
    };
    use crate::project::AmanuensisWorkspace;
    use crate::tm::{TmBank, TmMatchType, TranslationMemoryEngine};

    #[test]
    fn test_hybrid_tm_fts5_and_vector_rrf() {
        let tm = TranslationMemoryEngine::open_in_memory().unwrap();
        let bank = TmBank {
            id: "aux-1".to_string(),
            name: "Auxiliary Tech TM".to_string(),
            description: "Test bank".to_string(),
            source_lang: "en-US".to_string(),
            target_lang: "pt-BR".to_string(),
            is_primary: false,
            read_only: true,
            weight: 1.0,
            entry_count: 0,
        };
        tm.create_bank(&bank).unwrap();

        tm.add_entry(
            "aux-1",
            "The local language model uses a project harness.",
            "O modelo de linguagem local utiliza um harness de projeto.",
            Some("Intro"),
            None,
            Some("AI"),
        )
        .unwrap();

        // Context + Exact match => 101%
        let exact_matches = tm
            .search_hybrid(
                "The local language model uses a project harness.",
                Some("Intro"),
                5,
            )
            .unwrap();
        assert!(!exact_matches.is_empty());
        assert_eq!(exact_matches[0].match_type, TmMatchType::ContextExact);
        assert_eq!(exact_matches[0].similarity_pct, 101.0);

        // Fuzzy match
        let fuzzy_matches = tm
            .search_hybrid("A local language model uses the project harness.", None, 5)
            .unwrap();
        assert!(!fuzzy_matches.is_empty());
        assert!(fuzzy_matches[0].similarity_pct >= 75.0);
    }

    #[test]
    fn test_tmx_import_export_roundtrip() {
        let tm = TranslationMemoryEngine::open_in_memory().unwrap();
        tm.create_bank(&TmBank {
            id: "tmx-bank".to_string(),
            name: "TMX Bank".to_string(),
            description: "".to_string(),
            source_lang: "en-US".to_string(),
            target_lang: "pt-BR".to_string(),
            is_primary: false,
            read_only: false,
            weight: 1.0,
            entry_count: 0,
        })
        .unwrap();

        let sample_tmx = r#"<?xml version="1.0" encoding="UTF-8"?>
        <tmx version="1.4">
          <body>
            <tu>
              <tuv xml:lang="en-US"><seg>Scanned PDF conversion suite</seg></tuv>
              <tuv xml:lang="pt-BR"><seg>Suíte de conversão de PDFs escaneados</seg></tuv>
            </tu>
          </body>
        </tmx>"#;

        let count = tm.import_tmx("tmx-bank", sample_tmx).unwrap();
        assert_eq!(count, 1);

        let exported = tm.export_tmx("tmx-bank").unwrap();
        assert!(exported.contains("Suíte de conversão de PDFs escaneados"));
    }

    #[test]
    fn test_project_harness_compilation_and_post_edit_evolution() {
        let mut harness = ProjectHarness::default_for_project(
            "p1",
            "Test Project",
            "en-US",
            "pt-BR",
            "Technical",
        );

        let compiled = harness.compile_for_segment(
            "This Translation Memory fits in the context window.",
            None,
            &[],
        );
        assert_eq!(compiled.matched_glossary.len(), 2);
        assert!(compiled.system_prompt.contains("Memória de Tradução"));
        assert!(compiled.system_prompt.contains("janela de contexto"));

        // Simulate translator post-editing the local LLM output -> Harness learns the delta rule
        let learned = harness
            .learn_from_post_edit(
                "O modelo usa uma memória auxiliar simples.",
                "O modelo usa um banco de tradução auxiliar.",
            )
            .expect("Should extract post-edit delta rule");

        assert_eq!(learned.pattern_from, "uma memória auxiliar simples");
        assert_eq!(learned.preferred_to, "um banco de tradução auxiliar");
    }

    #[test]
    fn test_scanned_pdf_to_markdown_and_searchable_pdf() {
        let cfg = OcrPipelineConfig::default();
        let res = ScannedPdfSuite::process_scanned_document(
            "historical_book.pdf",
            Some(vec![
                "This scan-\nned document contains broken hyphen-\nation across lines.".to_string(),
            ]),
            &cfg,
        )
        .unwrap();

        assert_eq!(res.dehyphenated_words_count, 2);
        assert!(res
            .full_markdown
            .contains("This scanned document contains broken hyphenation across lines."));
        assert!(!res.searchable_pdf_base64.is_empty());
    }

    #[test]
    fn test_workspace_end_to_end_flow() {
        let mut ws = AmanuensisWorkspace::new_demo().unwrap();
        let out = ws.translate_segment_with_local_model(1).unwrap();
        assert!(out.translated_text.contains("Memória de Tradução"));
        assert!(out.guardrail_audit.passed);

        let rule = ws
            .confirm_segment(
                1,
                "Modelos de linguagem locais compactos alcançam altíssima fidelidade de tradução quando restritos por um harness específico do projeto e uma Memória de Tradução auxiliar.",
            )
            .unwrap();
        assert!(rule.is_some());
    }

    #[test]
    fn test_gguf_binary_header_parser_and_word_diff_qa() {
        use crate::llm::{DiffOp, LocalLlmEngine};

        let mut header = Vec::new();
        header.extend_from_slice(b"GGUF");
        header.extend_from_slice(&3u32.to_le_bytes()); // version 3
        header.extend_from_slice(&291u64.to_le_bytes()); // tensor_count
        header.extend_from_slice(&28u64.to_le_bytes()); // metadata_kv_count

        let info = LocalLlmEngine::parse_gguf_header(&header).unwrap();
        assert_eq!(info.version, 3);
        assert_eq!(info.tensor_count, 291);
        assert_eq!(info.metadata_kv_count, 28);

        let diff = LocalLlmEngine::compute_word_diff(
            "O modelo usa memória auxiliar",
            "O modelo usa banco auxiliar",
        );
        assert!(diff.iter().any(|t| t.op == DiffOp::Delete && t.text == "memória"));
        assert!(diff.iter().any(|t| t.op == DiffOp::Insert && t.text == "banco"));

        let audit_fail = LocalLlmEngine::audit_translation(
            "Accuracy reached 98.4% in 2026.",
            "A precisão atingiu ótimo nível.",
            vec![],
            vec![],
        );
        assert!(!audit_fail.numbers_verified);
        assert!(!audit_fail.passed);
    }

    #[test]
    fn test_csv_tm_and_pdf_text_layer_roundtrip() {
        let tm = TranslationMemoryEngine::open_in_memory().unwrap();
        tm.create_bank(&TmBank {
            id: "csv-bank".to_string(),
            name: "CSV Bank".to_string(),
            description: "".to_string(),
            source_lang: "en-US".to_string(),
            target_lang: "pt-BR".to_string(),
            is_primary: false,
            read_only: false,
            weight: 1.0,
            entry_count: 0,
        })
        .unwrap();

        let csv_in = "source,target,domain\n\"Searchable PDF\",\"PDF pesquisável\",\"OCR\"\n";
        let imported = tm.import_csv("csv-bank", csv_in).unwrap();
        assert_eq!(imported, 1);

        let csv_out = tm.export_csv("csv-bank").unwrap();
        assert!(csv_out.contains("PDF pesquisável"));
    }

    #[test]
    fn test_ocr_formatting_harness_splits_giant_scan_blocks_contextually() {
        let raw_scan = "\
CAPÍTULO I: LA HUELGA GENERAL Y EL MOVIMIENTO ESTUDIANTIL
En mayo de 1968, millones de traba-\njadores y estu-\ndiantes ocuparon las fábricas y las universidades en toda Francia durante varias semanas decisivas. \
El movi-\nmiento cuestionó profundamente la jerarquía tradicional de las instituciones polí-\nticas, sindicales y educativas del Estado moderno. \
Los comités de acción barrial organizaron asambleas permanentes para debatir la autogestión obrera y la democratización de la enseñanza superior. \
Sin embargo, las direcciones tradicionales intentaron canalizar el conflicto hacia acuerdos salariales convencionales en las negociaciones de Grenelle. \
A pesar de la vuelta gradual al trabajo en junio de 1968, la experiencia transformó para siempre la cultura política y social del siglo veinte.";

        let harness = OcrFormattingHarness::default();
        let res = harness.format_and_segment(raw_scan);

        // Must detect the chapter heading and isolate it as segment #0
        assert_eq!(res.stats.chapters_and_headings_detected, 1);
        assert_eq!(res.segments[0].kind, LayoutBlockKind::Heading);
        assert!(res.segments[0].markdown_text.starts_with("# "));

        // Must heal all 4 hyphenated line breaks (`traba-jadores`, `estu-diantes`, `movi-miento`, `polí-ticas`)
        assert_eq!(res.stats.dehyphenated_words_count, 4);
        assert!(res.formatted_markdown.contains("trabajadores"));
        assert!(res.formatted_markdown.contains("estudiantes"));
        assert!(res.formatted_markdown.contains("movimiento"));
        assert!(res.formatted_markdown.contains("políticas"));

        // Must split the giant 5-sentence paragraph into short contextual chunks (1-2 sentences each, <= 330 chars)
        assert!(res.segments.len() >= 4);
        for seg in &res.segments {
            assert!(
                seg.char_count <= harness.granularity.hard_max_chars(),
                "Segment too long ({} chars): {}",
                seg.char_count,
                seg.markdown_text
            );
        }

        // Strict audit must pass with 100% number preservation and zero hallucination
        assert!(res.audit.passed);
        assert!(res.audit.numbers_preserved);
        assert!(res.audit.zero_hallucination_verified);
        assert!(res.audit.lexical_fidelity_pct >= 99.0);
    }

    #[test]
    fn test_ocr_formatting_harness_mayo_frances_copyright_cip_page() {
        let mayo_cip_scan = "\
Mayo francés: cuando obreros y estudiantes
desafiaron al poder.
Reflexiones y documentos / Xavier Vigna;
Jacques Kergoat; Jean
Baptiste Thomas; seleccionado por Gabriela
Liszt; J-B Thomas;
Gastón Gutiérrez. - 1a ed. - Buenos Aires: del
IPS, 2008.
320 p.; 20x14 cm,
ISBN 978-987-23362-2-6
1. Historia Política. I. Kergoat, Jacques II.
Thomas, Jean
Baptiste III. Liszt, Gabriela, selec. IV. Thomas,
J-B, selec. V.
Gutiérrez, Gastón, selec. VI. Título
CDD 320.9
Ediciones del IPS
Diseño y armado de interior: Hernán Cardinale
Diseño y arte de tapa: Hidra Vinci
Edición general: Gabriela Liszt
Foto de tapa: Ocupación de la fábrica Citroen
en mayo de 1968.
© 2008, Ediciones del IPS
Riobamba 144
Capital Federal - C1025ABD
Buenos Aires - Argentina
Tel.: (54-11) 4951-5445
e-mail: ipskarlmarx@fibertel.com.ar
www.ips.org.ar
ISBN: 978-987-23362-2-6
ISBN13: 978-987-22717-4-9
Hecho el depósito que marca la ley 11.723
Impreso en Argentina. Printed in Argentina";

        let harness = OcrFormattingHarness::default();
        let res = harness.format_and_segment(mayo_cip_scan);

        // Instead of 1 giant 33-line segment, it must be broken into multiple short frontmatter blocks
        assert!(
            res.segments.len() >= 6,
            "Expected >= 6 short segments for 33-line CIP page, got {}",
            res.segments.len()
        );
        assert!(res.stats.frontmatter_blocks_grouped >= 5);

        // Verify ISBNs, compound initials (`J-B`), phones, and dates are 100% preserved
        assert!(res.formatted_markdown.contains("978-987-23362-2-6"));
        assert!(res.formatted_markdown.contains("978-987-22717-4-9"));
        assert!(res.formatted_markdown.contains("J-B"));
        assert!(res.formatted_markdown.contains("4951-5445"));
        assert!(res.formatted_markdown.contains("1968"));
        assert!(res.formatted_markdown.contains("2008"));

        assert!(res.audit.passed);
        assert!(res.audit.numbers_preserved);
        assert!(res.audit.zero_hallucination_verified);
    }

    #[test]
    fn test_ocr_formatting_harness_granularity_modes_zen_contextual_editorial() {
        let literary_scan = "\
Nos claustros silenciosos de Florença no século XV, o amanuense trabalhava à luz de velas para preservar a antiguidade clássica. \
Cada glosa marginal e inicial iluminada servia como um sistema de navegação estruturado para futuros leitores. \
Quando a imprensa mecânica surgiu nas décadas seguintes, a tradição caligráfica dos manuscritos continuou inspirando o desenho tipográfico europeu. \
Os humanistas debatiam intensamente a fidelidade filológica de cada tradução latina e grega.";

        let mut zen_harness = OcrFormattingHarness::default();
        zen_harness.granularity = ChunkGranularity::ZenMicroSentence;
        let zen_res = zen_harness.format_and_segment(literary_scan);

        let mut ctx_harness = OcrFormattingHarness::default();
        ctx_harness.granularity = ChunkGranularity::ContextualShort;
        let ctx_res = ctx_harness.format_and_segment(literary_scan);

        let mut ed_harness = OcrFormattingHarness::default();
        ed_harness.granularity = ChunkGranularity::EditorialParagraph;
        let ed_res = ed_harness.format_and_segment(literary_scan);

        // ZenMicroSentence splits into 4 individual sentences (1 sentence per segment)
        assert_eq!(zen_res.segments.len(), 4);
        assert!(zen_res.segments.iter().all(|s| s.sentence_count == 1));
        // ContextualShort groups into 2 segments of 2 sentences
        assert!(ctx_res.segments.len() >= 2 && ctx_res.segments.len() <= 3);
        // EditorialParagraph allows larger 2-3 sentence blocks
        assert!(ed_res.segments.len() <= ctx_res.segments.len());

        assert!(zen_res.audit.passed);
        assert!(ctx_res.audit.passed);
        assert!(ed_res.audit.passed);
    }

    #[test]
    fn test_ocr_formatting_harness_strips_running_page_numbers_and_preserves_body_numbers() {
        let multi_page_scan = "\
PRÓLOGO DE LA EDICIÓN DE 2008
- 14 -
Las jornadas de mayo de 1968 reunieron a más de 9000 participantes en el primer acto público.
Página 15
[ 16 ]
El análisis histórico demuestra la vigencia de aquellas discusiones.";

        let harness = OcrFormattingHarness::default();
        let res = harness.format_and_segment(multi_page_scan);

        assert_eq!(res.stats.stripped_running_headers_count, 3);
        assert!(!res.formatted_markdown.contains("- 14 -"));
        assert!(!res.formatted_markdown.contains("Página 15"));
        assert!(res.formatted_markdown.contains("2008"));
        assert!(res.formatted_markdown.contains("1968"));
        assert!(res.formatted_markdown.contains("9000"));
        assert!(res.audit.passed);
    }

    #[test]
    fn test_ocr_formatting_harness_preserves_tables_footnotes_and_dialogues() {
        let mixed_scan = "\
CHAPTER II: DIALOGUES AND METRICS

— Why must a local model be constrained by a project harness?

| Mode | Avg Segment Length | Drift Rate |
| :--- | :--- | :--- |
| Raw Page Wall | 1450 chars | High |
| Scan-to-Structure Harness | 195 chars | Zero |

[^1]: Measured across 320 scanned pages in 2026.";

        let harness = OcrFormattingHarness::default();
        let res = harness.format_and_segment(mixed_scan);

        assert_eq!(res.segments.len(), 4);
        assert_eq!(res.segments[0].kind, LayoutBlockKind::Heading);
        assert_eq!(res.segments[1].kind, LayoutBlockKind::Quote);
        assert_eq!(res.segments[2].kind, LayoutBlockKind::Table);
        assert_eq!(res.segments[3].kind, LayoutBlockKind::Footnote);
        assert!(res.audit.passed);
    }

    #[test]
    fn test_ocr_formatting_audit_detects_missing_numbers_and_hallucinations() {
        let harness = OcrFormattingHarness::default();
        let source = "En mayo de 1968 se publicaron 2500 ejemplares con ISBN 978-987-23362-2-6.";

        // Simulate a corrupted segment that dropped the year `1968` and injected a hallucinated word `inventadopelaia`
        let bad_segments = vec![FormattedOcrSegment {
            index: 0,
            kind: LayoutBlockKind::Paragraph,
            context_label: "Corrupted".to_string(),
            markdown_text: "En mayo se publicaron ejemplares inventadopelaia.".to_string(),
            char_count: 49,
            word_count: 6,
            sentence_count: 1,
            page: 1,
        }];

        let audit = harness.audit_formatting(source, &bad_segments);
        assert!(!audit.numbers_preserved);
        assert!(!audit.zero_hallucination_verified);
        assert!(!audit.passed);
    }

    #[test]
    fn test_ocr_formatting_harness_abbreviation_protection_and_semicolon_clause_split() {
        let harness = OcrFormattingHarness::default();

        // 1. Abbreviations (`Dr.`, `Prof.`, `op. cit.`, `p.`, `selec.`, `IV.`) must not trigger false splits
        let abbrev_text = "Según el Dr. Vigna y el Prof. Kergoat (op. cit., p. 42, selec. IV. Thomas), la huelga general comenzó el 13 de mayo de 1968.";
        let res_abbrev = harness.format_and_segment(abbrev_text);
        assert_eq!(
            res_abbrev.segments.len(),
            1,
            "Abbreviations should not split a single short sentence into fragments"
        );
        assert!(res_abbrev.audit.passed);

        // 2. A single ultra-long sentence (>360 chars) with semicolons must split cleanly at `;` clauses
        let ultra_long_sentence = "La crisis política de mayo de 1968 en Francia articuló tres procesos históricos simultáneos que transformaron la estructura social europea: primero, la movilización estudiantil en el Barrio Latino contra el autoritarismo universitario; segundo, la ocupación espontánea de fábricas aeronáuticas y automotrices por más de nueve millones de obreros en huelga general; y tercero, el debate intelectual sobre la autogestión y la democracia directa.";
        let res_long = harness.format_and_segment(ultra_long_sentence);
        assert!(
            res_long.segments.len() >= 2,
            "Ultra-long single sentence must split at semicolon/clause boundaries"
        );
        for seg in &res_long.segments {
            assert!(seg.char_count <= harness.granularity.hard_max_chars());
        }
        assert!(res_long.audit.passed);
    }

    #[test]
    fn test_project_harness_saves_ocr_format_harness_md_to_disk() {
        let tmp_dir = std::env::temp_dir().join("amanuensis_test_ocr_harness_disk");
        let _ = std::fs::remove_dir_all(&tmp_dir);
        let harness = ProjectHarness::default_for_project(
            "proj-test-ocr",
            "Mayo Francés",
            "es-ES",
            "pt-BR",
            "História Política",
        );
        let saved_base = harness.save_to_disk(&tmp_dir).unwrap();
        let ocr_harness_file = saved_base.join("OCR_FORMAT_HARNESS.md");
        assert!(ocr_harness_file.exists());
        let contents = std::fs::read_to_string(ocr_harness_file).unwrap();
        assert!(contents.contains("OCR_FORMAT_HARNESS.md"));
        assert!(contents.contains("Invariância Lexical Absoluta"));
        let _ = std::fs::remove_dir_all(&tmp_dir);
    }

    #[test]
    fn test_universal_document_ingestor_docx_clipboard_native_pdf_and_srt() {
        // 1. Word .docx XML extraction + contextual segmentation
        let sample_docx_xml = r#"
        <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
          <w:body>
            <w:p>
              <w:pPr><w:pStyle w:val="Heading1"/></w:pPr>
              <w:r><w:t>Manifiesto de los Traductores Literarios</w:t></w:r>
            </w:p>
            <w:p>
              <w:r><w:t>La traducción literaria exige preservar el ritmo, la respiración y la precisión histórica de cada párrafo. No basta con sustituir palabras aisladas sin comprender el contexto cultural de 1968.</w:t></w:r>
            </w:p>
          </w:body>
        </w:document>
        "#;
        let docx_res = UniversalDocumentIngestor::ingest_and_format(
            "manifiesto_editorial.docx",
            sample_docx_xml,
            false,
            ChunkGranularity::ContextualShort,
        );
        assert_eq!(docx_res.mode, DocumentIngestionMode::WordDocx);
        assert!(docx_res.formatting.audit.passed);
        assert_eq!(docx_res.formatting.segments[0].kind, LayoutBlockKind::Heading);
        assert!(docx_res.formatting.segments[0]
            .markdown_text
            .contains("# Manifiesto de los Traductores Literarios"));

        // 2. Direct Clipboard Paste (`clipboard://`)
        let pasted_text = "Discurso copiado da web.\n\nA liberdade de imprensa e o rigor da tradução jornalística caminham juntos nas democracias contemporâneas. Cada citação deve manter sua integridade.";
        let clip_res = UniversalDocumentIngestor::ingest_and_format(
            "clipboard://trecho_colado",
            pasted_text,
            false,
            ChunkGranularity::ContextualShort,
        );
        assert_eq!(clip_res.mode, DocumentIngestionMode::ClipboardPaste);
        assert!(clip_res.formatting.audit.passed);
        assert!(clip_res.formatting.segments.len() >= 2);

        // 3. Native Digital PDF (without optical OCR)
        let native_pdf_text = "CAPÍTULO 1\n\nEste artigo em PDF digital já possui camada de texto nativa selecionável e foi extraído instantaneamente sem precisar de OCR óptico.";
        let pdf_res = UniversalDocumentIngestor::ingest_and_format(
            "artigo_academico_nativo.pdf",
            native_pdf_text,
            false,
            ChunkGranularity::ContextualShort,
        );
        assert_eq!(pdf_res.mode, DocumentIngestionMode::NativeDigitalPdf);
        assert!(!pdf_res.used_optical_ocr);
        assert!(pdf_res.formatting.audit.passed);

        // 4. Subtitle (.srt) ingestion
        let srt_payload = "1\n00:00:01,200 --> 00:00:04,500\n— Compañeros de la fábrica Citroën, la asamblea comienza ahora.\n\n2\n00:00:05,000 --> 00:00:09,100\n— ¡Votemos la huelga general en todos los talleres!";
        let srt_res = UniversalDocumentIngestor::ingest_and_format(
            "documentario_1968.srt",
            srt_payload,
            false,
            ChunkGranularity::ContextualShort,
        );
        assert_eq!(srt_res.mode, DocumentIngestionMode::PlainTextOrMarkdown);
        assert!(srt_res.formatting.audit.passed);
        assert_eq!(srt_res.formatting.segments.len(), 2);
        assert!(!srt_res.formatting.formatted_markdown.contains("-->"));
    }

    #[test]
    fn test_git_story_semantic_commits_and_segment_genealogy() {
        use crate::git_story::{GitStoryEngine, SegmentVersionStage, SemanticCommitKind};

        let mut git_story = GitStoryEngine::new("Mayo Francés (1968)");
        let gen1 = git_story.record_segment_revision(
            10,
            "La huelga general comenzó el 13 de mayo de 1968 en París.",
            SegmentVersionStage::LocalAiDraft,
            "A greve geral começou em 13 de maio de 1968 em Paris.",
            "translategemma-4b-q4_k_m",
            Some("Pós-rascunho automático via modelo local.".to_string()),
        );
        assert_eq!(gen1.revisions.last().unwrap().version_number, 1);

        let gen2 = git_story.record_segment_revision(
            10,
            "La huelga general comenzó el 13 de mayo de 1968 en París.",
            SegmentVersionStage::HumanPostEdit,
            "A greve geral eclodiu em 13 de maio de 1968, em Paris.",
            "Tradutor Humano (Pós-Edição)",
            Some("ADR-002: verbo 'eclodiu' adotado para refletir o estilo historiográfico.".to_string()),
        );
        assert_eq!(gen2.revisions.last().unwrap().version_number, 2);

        let commit = git_story.record_semantic_commit(
            SemanticCommitKind::MilestoneTag,
            "cap-01",
            "fechamento da revisão crítica do Capítulo 1",
            vec![10],
            Some("v1.0-cap1-revisado".to_string()),
            "100% confirmado",
        );
        assert!(commit
            .summary
            .starts_with("milestone(cap-01): fechamento"));

        let gen = git_story.genealogies.get(&10).unwrap();
        assert_eq!(gen.revisions.len(), 3); // v0 Original + v1 AI + v2 Human
        let callout = gen.to_obsidian_callout();
        assert!(callout.contains("História Git deste Trecho (`#10`)"));
        assert!(callout.contains("ADR-002"));
    }

    #[test]
    fn test_obsidian_vault_generation_and_json_canvas_topology() {
        use crate::git_story::GitStoryEngine;
        use crate::obsidian::{
            ObsidianBilingualSegment, ObsidianDecisionRecord, ObsidianGlossaryEntry,
            ObsidianVaultConfig, ObsidianVaultGenerator,
        };

        let git_story = GitStoryEngine::new("Mayo Francés (1968)");
        let config = ObsidianVaultConfig {
            project_name: "Mayo Francés (1968)".to_string(),
            author_name: "Xavier Vigna & Coletivo".to_string(),
            translator_name: "Scriptorium Amanuensis".to_string(),
            source_lang: "es-ES".to_string(),
            target_lang: "pt-BR".to_string(),
            domain_specialty: "Ciências Sociais & História Política".to_string(),
            model_id: "translategemma-4b-q4_k_m".to_string(),
        };

        let segments = vec![ObsidianBilingualSegment {
            id: "seg-1".to_string(),
            index: 0,
            chapter_title: "Capítulo 1".to_string(),
            source_text: "Mayo francés: cuando obreros y estudiantes desafiaron al poder en 1968."
                .to_string(),
            target_text:
                "Maio francês: quando operários e estudantes desafiaram o poder em 1968."
                    .to_string(),
            status: "Confirmed".to_string(),
            page_number: 1,
            linked_concepts: vec!["Obreros".to_string(), "Huelga_General".to_string()],
            linked_adrs: vec!["ADR-001-Obreros-Operarios".to_string()],
        }];

        let glossary = vec![ObsidianGlossaryEntry {
            slug: "Obreros".to_string(),
            source_term: "obreros".to_string(),
            target_term: "operários".to_string(),
            rejected_alternatives: vec!["trabalhadores genéricos".to_string()],
            etymology_and_context:
                "Preserva o recorte classista fabril das fábricas Renault e Citroën em 1968."
                    .to_string(),
            occurrences_segment_ids: vec!["seg-1".to_string()],
        }];

        let adrs = vec![ObsidianDecisionRecord {
            adr_id: "ADR-001-Obreros-Operarios".to_string(),
            title: "Distinção entre Obreros (Operários) e Trabajadores".to_string(),
            status: "Aceito".to_string(),
            context_problem: "Em espanhol, 'obreros' designa especificamente o proletariado industrial nos textos de 1968.".to_string(),
            adopted_decision: "Traduzir sistematicamente 'obreros' por 'operários' e reservar 'trabalhadores' para 'trabajadores'.".to_string(),
            affected_concepts: vec!["Obreros".to_string()],
            affected_segments: vec!["seg-1".to_string()],
        }];

        let bundle = ObsidianVaultGenerator::generate_vault(
            &config,
            &segments,
            &glossary,
            &adrs,
            &git_story,
        )
        .unwrap();

        assert!(bundle.notes.len() >= 7);
        assert_eq!(bundle.canvases.len(), 2);
        assert!(bundle.graph_config_json.contains("01_Manuscrito_Bilingue"));
        assert!(!bundle.canvases[0].nodes.is_empty());
        assert!(!bundle.canvases[0].edges.is_empty());
    }

    #[test]
    fn test_obsidian_byte_preserving_roundtrip_and_validation_gates() {
        use crate::obsidian::ObsidianVaultGenerator;
        use std::collections::BTreeMap;

        let user_edited_md = r#"---
title: "📖 Manuscrito Bilíngue — Mayo Francés"
source_lang: "es-ES"
target_lang: "pt-BR"
status_editorial: "Revisão Filológica Final"
revisor_chefe: "Helena"
tags:
  - amanuensis/manuscrito
---

# 📖 Manuscrito Bilíngue

<!-- OBSIDIAN_USER_NOTES_START -->
> [!tip] Nota da Revisora no Obsidian
> Conferir epígrafe com a edição francesa de 1968 da Maspero.
<!-- OBSIDIAN_USER_NOTES_END -->

## Trecho #1 (`seg-1`) ^seg-seg-1
- **Conceitos:** [[Obreros]], [[Huelga_General]]

<!-- AMANUENSIS_TARGET_START:seg-1 -->
Maio francês: quando os operários e estudantes desafiaram o poder em 1968 (Revisado no Obsidian).
<!-- AMANUENSIS_TARGET_END:seg-1 -->
"#;

        let mut app_updates = BTreeMap::new();
        let report = ObsidianVaultGenerator::byte_preserving_roundtrip_merge(
            user_edited_md,
            &app_updates,
            &["1968".to_string()],
        );

        assert!(report.validation.yaml_frontmatter_valid);
        assert!(report.validation.wikilinks_balanced_and_valid);
        assert!(report.validation.numeric_invariance_passed);
        assert_eq!(
            report
                .preserved_custom_yaml_keys
                .get("status_editorial")
                .map(|s| s.as_str()),
            Some("Revisão Filológica Final")
        );
        assert_eq!(
            report
                .preserved_custom_yaml_keys
                .get("revisor_chefe")
                .map(|s| s.as_str()),
            Some("Helena")
        );
        assert_eq!(report.preserved_user_callouts.len(), 1);
        assert!(report.updated_segments["seg-1"].contains("(Revisado no Obsidian)"));

        // Now test updating from Amanuensis while preserving Obsidian custom YAML & callouts
        app_updates.insert(
            "seg-1".to_string(),
            "Maio francês: quando operários e estudantes desafiaram o poder em 1968 (Sincronizado v3)."
                .to_string(),
        );
        let report2 = ObsidianVaultGenerator::byte_preserving_roundtrip_merge(
            user_edited_md,
            &app_updates,
            &["1968".to_string()],
        );
        assert!(report2.merged_markdown.contains("Sincronizado v3"));
        assert!(report2.merged_markdown.contains("status_editorial: \"Revisão Filológica Final\""));
        assert!(report2
            .merged_markdown
            .contains("Conferir epígrafe com a edição francesa"));
    }

    #[test]
    fn test_livecorpus_zero_config_bilingual_and_monolingual_expanded_context() {
        use crate::livedocs::{LiveCorpusDocKind, LiveCorpusEngine};

        let mut engine = LiveCorpusEngine::new();
        let src_doc = "En las fábricas metalúrgicas de Boulogne-Billancourt en 1968, los comités de base organizaron asambleas permanentes.\n\nCuando obreros y estudiantes desafiaron al poder establecido, las universidades abrieron sus puertas a los sindicatos.\n\nEl reflujo electoral de junio de 1968 no borró la transformación cultural y política de toda una generación.";
        let tgt_doc = "Nas fábricas metalúrgicas de Boulogne-Billancourt em 1968, os comitês de base organizaram assembleias permanentes.\n\nQuando operários e estudantes desafiaram o poder estabelecido, as universidades abriram suas portas aos sindicatos.\n\nO refluxo eleitoral de junho de 1968 não apagou a transformação cultural e política de toda uma geração.";

        let aligned = engine.ingest_bilingual_pair_zero_config(
            "doc-vigna-1968",
            "Xavier Vigna — Historia Obrera de 1968 (Par Original + Tradução Antiga)",
            "vigna_1968_bilingue.pdf",
            "es-ES",
            "pt-BR",
            src_doc,
            tgt_doc,
        );
        assert_eq!(aligned.len(), 3);
        assert!(aligned[1].alignment_confidence >= 0.85);

        // Verify Expanded 3-Paragraph Context Inspection (¶ Anterior + ¶ Atual + ¶ Posterior)
        let ctx = engine.inspect_expanded_context("doc-vigna-1968-p2").unwrap();
        assert!(ctx
            .prev_paragraph
            .as_ref()
            .unwrap()
            .contains("Boulogne-Billancourt"));
        assert!(ctx
            .source_paragraph
            .contains("Cuando obreros y estudiantes desafiaron al poder"));
        assert!(ctx
            .target_paragraph
            .as_ref()
            .unwrap()
            .contains("Quando operários e estudantes desafiaram o poder"));
        assert!(ctx
            .next_paragraph
            .as_ref()
            .unwrap()
            .contains("El reflujo electoral de junio de 1968"));

        // Monolingual target reference ingestion
        let mono = engine.ingest_monolingual_reference(
            "doc-mono-pt",
            "Ensaio Brasileiro sobre Maio de 1968 (Referência Monolíngue PT-BR)",
            "ensaio_maio_68_ptbr.md",
            LiveCorpusDocKind::MonolingualTargetReference,
            "pt-BR",
            "Parágrafo introdutório sobre a historiografia brasileira.\n\nA greve geral articulou comitês de fábrica e ocupações estudantis.\n\nConclusão sobre o legado editorial.",
        );
        assert_eq!(mono.len(), 3);
        assert!(mono[1].prev_paragraph.is_some());
        assert!(mono[1].next_paragraph.is_some());
    }

    #[test]
    fn test_longest_substring_concordance_lsc_under_50_pct_global_similarity() {
        use crate::livedocs::{LiveCorpusDocKind, LiveCorpusEngine};

        let mut engine = LiveCorpusEngine::new();
        engine.add_subsegment_equivalence(
            "institutional trust and historical accountability",
            "confiança institucional e responsabilização histórica",
        );
        engine.add_subsegment_equivalence(
            "obreros y estudiantes desafiaron al poder",
            "operários e estudantes desafiaram o poder",
        );

        engine.ingest_monolingual_reference(
            "doc-author-prior",
            "Obra Anterior do Autor (Comparative Political Sociology, 2021)",
            "prior_work_2021.pdf",
            LiveCorpusDocKind::AuthorPriorWork,
            "en-US",
            "Introductory remarks on post-war European constitutionalism.\n\nEarlier empirical surveys demonstrated that institutional trust and historical accountability remain essential pillars during fiscal crises in municipal governance.\n\nSubsequent chapters examine regional electoral volatility.",
        );

        // New sentence with < 50% global word overlap, but sharing a 5-word contiguous n-gram!
        let active_segment = "Modern welfare states depend on institutional trust and historical accountability across diverse populations.";
        let hits = engine.find_longest_substring_concordances(active_segment, 2);

        assert!(!hits.is_empty());
        let top_hit = &hits[0];
        assert_eq!(
            top_hit.source_ngram,
            "institutional trust and historical accountability"
        );
        assert_eq!(top_hit.word_count, 5);
        assert!(
            top_hit.global_sentence_similarity_pct < 50.0,
            "Expected < 50% global similarity to prove LSC works where fuzzy TM fails, got {}%",
            top_hit.global_sentence_similarity_pct
        );
        assert_eq!(
            top_hit.suggested_target_phrase.as_deref(),
            Some("confiança institucional e responsabilização histórica")
        );
        assert!(top_hit.prev_paragraph.is_some());
        assert!(top_hit.next_paragraph.is_some());
    }

    #[test]
    fn test_livecorpus_manifest_persistence_in_amanuensis_corpus_dir() {
        use crate::livedocs::{LiveCorpusDocKind, LiveCorpusEngine};

        let tmp_dir = std::env::temp_dir().join("amanuensis_test_livecorpus_disk");
        let _ = std::fs::remove_dir_all(&tmp_dir);

        let mut engine = LiveCorpusEngine::new();
        engine.ingest_monolingual_reference(
            "doc-1",
            "Obra Anterior",
            "obra.md",
            LiveCorpusDocKind::AuthorPriorWork,
            "es-ES",
            "Primer párrafo.\n\nSegundo párrafo con contexto.",
        );
        let saved = engine.save_corpus_manifest_to_disk(&tmp_dir).unwrap();
        assert!(saved.exists());
        assert!(saved.to_string_lossy().contains(".amanuensis/corpus/LIVECORPUS_MANIFEST.json"));
        let _ = std::fs::remove_dir_all(&tmp_dir);
    }

    #[test]
    fn test_project_lexicon_extractor_finds_recurring_multiword_syntagms() {
        use crate::dejavu_assemble::DejaVuProductivityEngine;
        use std::collections::HashMap;

        let segments = vec![
            "Los comités de huelga organizaron la ocupación de fábricas en mayo de 1968.".to_string(),
            "Durante las asambleas, los comités de huelga defendieron el poder estudiantil y la ocupación de fábricas.".to_string(),
            "El poder estudiantil convergió con los comités de huelga en París.".to_string(),
        ];

        let mut known = HashMap::new();
        known.insert("comités de huelga".to_string(), "comitês de greve".to_string());
        known.insert("ocupación de fábricas".to_string(), "ocupação de fábricas".to_string());
        known.insert("poder estudiantil".to_string(), "poder estudantil".to_string());

        let extracted = DejaVuProductivityEngine::extract_recurring_lexicon(&segments, 2, 5, &known);
        assert!(!extracted.is_empty());

        let top = extracted
            .iter()
            .find(|e| e.source_phrase == "comités de huelga")
            .expect("Expected 'comités de huelga' to be extracted");
        assert_eq!(top.occurrences, 3);
        assert_eq!(top.suggested_target, "comitês de greve");
    }

    #[test]
    fn test_hybrid_auto_assemble_combines_glossary_subsegments_and_stitching() {
        use crate::dejavu_assemble::{DejaVuProductivityEngine, FragmentOrigin};

        let source = "Small local language models achieve remarkable translation fidelity when constrained by a project-specific harness and an auxiliary Translation Memory.";
        let glossary = vec![
            ("Translation Memory".to_string(), "Memória de Tradução".to_string()),
            ("harness".to_string(), "harness".to_string()),
        ];
        let subsegments = vec![
            (
                "small local language models".to_string(),
                "modelos de linguagem locais compactos".to_string(),
            ),
            (
                "remarkable translation fidelity".to_string(),
                "notável fidelidade de tradução".to_string(),
            ),
        ];
        let stitched = "Modelos de linguagem locais compactos alcançam notável fidelidade de tradução quando restritos por um harness específico do projeto e uma Memória de Tradução auxiliar.";

        let res = DejaVuProductivityEngine::auto_assemble_segment(
            source,
            &glossary,
            &subsegments,
            stitched,
        );
        assert!(res.deterministic_coverage_pct >= 40.0);
        assert!(res
            .fragments
            .iter()
            .any(|f| f.origin == FragmentOrigin::GlossaryLexicon));
        assert!(res
            .fragments
            .iter()
            .any(|f| f.origin == FragmentOrigin::TmOrLiveCorpusSubsegment));
        assert!(res
            .fragments
            .iter()
            .any(|f| f.origin == FragmentOrigin::LocalModelGrammarStitch));
    }

    #[test]
    fn test_dynamic_autowrite_suggests_only_grounded_glossary_and_confirmed_terms() {
        use crate::dejavu_assemble::DejaVuProductivityEngine;

        let glossary = vec![
            ("Translation Memory".to_string(), "Memória de Tradução".to_string()),
            (
                "welfare state".to_string(),
                "Estado de Bem-Estar Social".to_string(),
            ),
        ];
        let confirmed = vec!["responsabilização histórica".to_string()];

        // User typed "Memó" -> should suggest "Memória de Tradução" (suffix "ria de Tradução")
        let sugs = DejaVuProductivityEngine::compute_dynamic_autowrite_suggestions(
            "O sistema utiliza uma Memó",
            "The system uses a Translation Memory in welfare state research.",
            &glossary,
            &confirmed,
        );
        assert!(!sugs.is_empty());
        assert_eq!(sugs[0].completion_full, "Memória de Tradução");
        assert_eq!(sugs[0].completion_suffix, "ria de Tradução");
    }

    #[test]
    fn test_smart_auto_propagation_updates_identical_segments_and_respects_contextual_exceptions() {
        use crate::ocr::BoundingBox;
        use crate::omegat_propagation::{ContextualExceptionRecord, OmegaTPropagationEngine};
        use crate::project::{SegmentStatus, TranslationSegment};

        let make_seg = |idx: usize, src: &str, tgt: &str, status: SegmentStatus| TranslationSegment {
            id: format!("seg-{}", idx + 1),
            index: idx,
            source_text: src.to_string(),
            target_text: tgt.to_string(),
            ai_draft_snapshot: None,
            status,
            bbox: BoundingBox {
                page: 1,
                x: 0.1,
                y: 0.1,
                width: 0.8,
                height: 0.1,
            },
        };

        let mut segments = vec![
            make_seg(0, "## Chapter I — Prologue", "## Capítulo I — Prólogo", SegmentStatus::Approved),
            make_seg(
                1,
                "Liberty requires institutional accountability.",
                "A liberdade exige responsabilização institucional.",
                SegmentStatus::Approved,
            ),
            make_seg(2, "First dialogue context.", "Primeiro contexto de diálogo.", SegmentStatus::Translated),
            make_seg(
                3,
                "Liberty requires institutional accountability.",
                "",
                SegmentStatus::Untranslated,
            ),
            make_seg(4, "Irony and poetic context.", "Contexto irônico e poético.", SegmentStatus::Translated),
            make_seg(
                5,
                "Liberty requires institutional accountability.",
                "A liberdade reclama prestação de contas histórica (Tradução Alternativa Poética).",
                SegmentStatus::Approved,
            ),
        ];

        // Mark segment #5 (index 5) as a Contextual Exception ("Tradução Alternativa")
        let mut exceptions: Vec<ContextualExceptionRecord> = Vec::new();
        let exc = OmegaTPropagationEngine::register_contextual_exception(
            &segments,
            5,
            "A liberdade reclama prestação de contas histórica (Tradução Alternativa Poética).",
            "No capítulo poético final, 'requires accountability' assume registro clássico.",
            &mut exceptions,
        )
        .unwrap();
        assert!(exc.context_hash.starts_with("ctx-"));

        // Confirm segment #1 (index 1) -> should auto-propagate to segment #3, but SKIP segment #5!
        let outcome =
            OmegaTPropagationEngine::auto_propagate_confirmed_segment(&mut segments, 1, &exceptions);

        assert_eq!(outcome.updated_segment_indices, vec![3]);
        assert_eq!(outcome.skipped_exception_indices, vec![5]);
        assert_eq!(
            segments[3].target_text,
            "A liberdade exige responsabilização institucional."
        );
        assert_eq!(segments[3].status, SegmentStatus::Approved);
        // Segment #5 must keep its alternative contextual translation intact!
        assert_eq!(
            segments[5].target_text,
            "A liberdade reclama prestação de contas histórica (Tradução Alternativa Poética)."
        );
    }

    #[test]
    fn test_contextual_exception_hash_binds_translation_to_prev_and_next_neighbor_context() {
        use crate::omegat_propagation::compute_segment_context_hash;

        let h1 = compute_segment_context_hash(
            Some("Chapter 1: Constitutional Foundations"),
            "The Assembly voted unanimously.",
            Some("Article 4 entered into force."),
        );
        let h2 = compute_segment_context_hash(
            Some("Chapter 9: Student General Assembly in Sorbonne"),
            "The Assembly voted unanimously.",
            Some("Barricades were erected at night."),
        );
        let h1_repeat = compute_segment_context_hash(
            Some("  chapter 1: constitutional foundations "),
            "the assembly voted unanimously.",
            Some("Article 4 entered into force."),
        );

        assert_ne!(h1, h2, "Different neighbor contexts must yield distinct context hashes");
        assert_eq!(h1, h1_repeat, "Normalized identical context must yield deterministic hash");
    }

    #[test]
    fn test_global_regex_search_and_batch_replace_with_diff_preview_and_status_filters() {
        use crate::ocr::BoundingBox;
        use crate::omegat_propagation::{
            GlobalSearchScope, GlobalSearchStatusFilter, OmegaTPropagationEngine,
        };
        use crate::project::{SegmentStatus, TranslationSegment};

        let mut segments = vec![
            TranslationSegment {
                id: "seg-1".to_string(),
                index: 0,
                source_text: "Workers and students challenged power in 1968.".to_string(),
                target_text: "Trabalhadores e estudantes desafiaram o poder em 1968.".to_string(),
                ai_draft_snapshot: None,
                status: SegmentStatus::Approved,
                bbox: BoundingBox {
                    page: 1,
                    x: 0.1,
                    y: 0.1,
                    width: 0.8,
                    height: 0.1,
                },
            },
            TranslationSegment {
                id: "seg-2".to_string(),
                index: 1,
                source_text: "Factory committees united workers in Renault.".to_string(),
                target_text: "Comitês de fábrica uniram trabalhadores na Renault.".to_string(),
                ai_draft_snapshot: None,
                status: SegmentStatus::AiDraft,
                bbox: BoundingBox {
                    page: 1,
                    x: 0.1,
                    y: 0.25,
                    width: 0.8,
                    height: 0.1,
                },
            },
        ];

        // 1. Dry-run preview (`apply_in_place = false`) on ConfirmedOnly
        let preview_confirmed = OmegaTPropagationEngine::search_and_replace_segments(
            &mut segments,
            "trabalhadores",
            "operários",
            true,
            false,
            GlobalSearchScope::TargetOnly,
            GlobalSearchStatusFilter::ConfirmedOnly,
            &[],
            false,
        );
        assert_eq!(preview_confirmed.affected_segments_count, 1);
        assert!(preview_confirmed.previews[0]
            .after_preview_text
            .contains("operários e estudantes"));
        // Not applied yet because apply_in_place == false
        assert!(segments[0].target_text.contains("Trabalhadores"));

        // 2. Apply batch replacement across AllSegments
        let applied = OmegaTPropagationEngine::search_and_replace_segments(
            &mut segments,
            "trabalhadores",
            "operários",
            true,
            false,
            GlobalSearchScope::TargetOnly,
            GlobalSearchStatusFilter::AllSegments,
            &[],
            true,
        );
        assert_eq!(applied.affected_segments_count, 2);
        assert!(segments[0].target_text.contains("operários e estudantes"));
        assert!(segments[1].target_text.contains("uniram operários na Renault"));
    }
}
