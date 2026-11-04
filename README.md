# ✒️ Amanuensis — Estação de Tradução Assistida por IA Local, Memórias Auxiliares Híbridas, Suíte OCR & Biblioteca Viva Obsidian + Git

> 📖 **Documentação Completa e Guia Ilustrado Passo a Passo:** [**`docs/MANUAL_COMPLETO_V2.md`**](docs/MANUAL_COMPLETO_V2.md) (com 18 prints em alta resolução de todas as telas, menus, gavetas e fluxos).

**Amanuensis** é uma estação de tradução literária, acadêmica, técnica e editorial **100% Local-First (Zero-Telemetry)** construída em **Rust + macOS Cocoa/WKWebView/Vision + React 19 / TypeScript**. Ela combina a precisão determinística dos sistemas CAT mais respeitados pela comunidade de tradutores (**MemoQ**, **Déjà Vu**, **OmegaT**, **SDL Trados**, **Wordfast** e **Across**) com modelos locais compactos (`TranslateGemma 4B`, `Qwen 2.5 3B`, `Llama 3.2`) governados por um **Harness Evolutivo de Projeto (`.amanuensis/AGENT.md`)**.

---

## 🖼️ Tour Visual Rápido

### 1. Assistente Universal de Entrada (PDF Escaneado, PDF Digital, Word `.docx`, `.epub`, `.srt` ou Texto Colado `Cmd+V`)
![Assistente Passo 1 — Entrada Universal e Harness Pré-Tradução](docs/screenshots/01_onboarding_passo1_fluxo_universal.png)

### 2. Mesa de Tradução (Workbench de 3 Colunas) + Print do Scan Original ("Tirar a Teima")
![Mesa de Tradução Principal](docs/screenshots/04_workbench_mesa_de_traducao_visao_geral.png)

### 3. Extrator de Léxico da Obra & AutoAssemble Híbrido de Sub-Segmentos (Inspirado no Déjà Vu — Issue #3)
![Extrator de Léxico e AutoAssemble Híbrido](docs/screenshots/06_workbench_dejavu_extrator_lexico_e_autoassemble.png)

### 4. Auto-Propagação Inteligente, Exceções Contextuais (`ctx-...`) & Busca Regex Global (`⌘⇧F` — Inspirado no OmegaT — Issue #4)
![Busca Regex Global e Exceção Contextual](docs/screenshots/07_workbench_omegat_busca_regex_global_e_excecao.png)

### 5. Revisão Bilíngue Externa em Word (`.docx` Round-Trip — Trados), E-books `.epub` Chain Files & Legendas `.srt` CPS (Wordfast — Issue #5)
![Revisão Bilíngue Externa em Word (.docx Round-Trip)](docs/screenshots/08_workbench_trados_revisao_bilingue_docx_roundtrip.png)

### 6. Matriz de Consistência Intra-Obra, Notas do Tradutor `[N. da T.]` Publicáveis & Estágios Editoriais Sem Lock-in (Inspirado no Across — Issue #6)
![Matriz de Consistência Intra-Obra e Notas do Tradutor](docs/screenshots/10_workbench_across_matriz_qa_e_notas_nt.png)

### 7. Modo Zen de Foco Criativo Sem Estímulos de Tela (`⌘\`)
![Modo Zen de Foco Criativo](docs/screenshots/12_modo_zen_foco_criativo.png)

### 8. Biblioteca Viva Obsidian (`.canvas` JSON Canvas 1.0 + ADRs) & História Semântica no Git (Issue #1)
![Biblioteca Viva Obsidian e JSON Canvas](docs/screenshots/17_aba6_obsidian_biblioteca_viva_canvas_e_git.png)

### 9. Centro de Hardening de Segurança, Performance Nativa & Otimização de Espaço em Disco (Issue #7)
![Centro de Segurança, Performance e Espaço em Disco](docs/screenshots/18_aba7_seguranca_performance_e_espaco_em_disco.png)

---

## ⚙️ Módulos do Motor Nativo Rust (`crates/amanuensis-core/src/`)

| Módulo | Descrição |
| :--- | :--- |
| `tm.rs` | Memória de Tradução Híbrida SQLite em modo `WAL` + `mmap 256MB` (`FTS5` BM25 + `Levenshtein` + Vetor Denso via **Reciprocal Rank Fusion — RRF**), importação/exportação `.tmx` e `.csv` |
| `ocr.rs` | Suíte OCR para PDFs escaneados + `OcrFormattingHarness` (`OCR_FORMAT_HARNESS.md`) + `UniversalDocumentIngestor` (`.docx`, PDF digital nativo, `.srt`, `Cmd+V`) |
| `harness.rs` | Cérebro contextual isolado em `.amanuensis/` (`AGENT.md`, `glossary.toml`, `skills/*.md`, `style_rules.toml`) com aprendizado contínuo de pós-edição humana |
| `llm.rs` | Parser binário de modelos `GGUF` (`llama.cpp`), cálculo de diff palavra por palavra e auditoria determinística de números/glossário |
| `obsidian.rs` & `git_story.rs` | Geração de Cofre Obsidian completo, grafos `.canvas` (JSON Canvas 1.0), commits semânticos Git, genealogia por trecho e round-trip byte-preserving com 3 gates |
| `livedocs.rs` | `LiveCorpus` (`.amanuensis/corpus/`) zero-config e **Concordância de Substring Mais Longa (LSC)** para matches sub-frase mesmo abaixo de 50% de similaridade global |
| `dejavu_assemble.rs` | Extrator de Léxico Recorrente da Obra (2–5 palavras), **AutoAssemble Híbrido** e **AutoWrite Dinâmico** ancorado |
| `omegat_propagation.rs` | Auto-propagação instantânea de trechos repetidos, **Exceções Contextuais** por hash SHA-256 de vizinhança (`ctx-...`) e Busca/Substituição Regex Global |
| `bilingual_review_epub_srt.rs` | Tabela Word `.docx` Bilíngue de Revisão Externa (Round-Trip com evolução do `AGENT.md`), Chain Files `.epub` sem tag-soup e Validador CPS de legendas `.srt`/`.vtt` |
| `across_consistency_qa.rs` | Matriz de Consistência Intra-Obra, Estágios Editoriais Sem Lock-in e compilação de **Notas do Tradutor Publicáveis (`[N. da T.]`)** no rodapé sem vazar notas internas |
| `security_perf.rs` | Compactação SQLite (`FTS5 optimize + VACUUM`), Symlinks Zero-Copy para modelos `.gguf`, Criptografia em Repouso (`HMAC-SHA256`), Escudo Anti-XXE/Zip-Bomb, Token Efêmero Loopback CSRF e Sandbox Anti-Prompt-Injection (`<source_segment_untrusted>`) |

---

## 🛠️ Compilação, Testes e Empacotamento Nativo macOS (`.app` & `.dmg`)

```bash
# 1. Executar toda a suíte de 40 testes unitários e de integração completa (v1 + v2)
cargo test --workspace

# 2. Compilar o pacote nativo Amanuensis.app (~11 MB, LTO+Strip) e o instalador .dmg ULFO (~7,1 MB)
./scripts/build_installer.sh

# 3. (Opcional) Executar o tour automatizado E2E que testa e captura os 18 prints da documentação
./release/Amanuensis.app/Contents/MacOS/Amanuensis --capture-docs-screenshots docs/screenshots
```
