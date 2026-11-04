# 📜 Manual Completo e Guia Ilustrado — Amanuensis v2.0

> **Estação de Tradução Assistida por IA Local (GGUF / `llama.cpp`), Memória de Tradução Híbrida (SQLite FTS5 + RRF), LiveCorpus LSC, Suíte OCR Nativa, Biblioteca Viva Obsidian + Git e Hardening de Segurança**

---

## 🏛️ 1. Arquitetura Geral do Sistema (v1 + v2 Completo)

O **Amanuensis** foi desenhado para unir a precisão determinística dos sistemas CAT clássicos mais respeitados pela comunidade de tradutores (**MemoQ**, **Déjà Vu**, **OmegaT**, **SDL Trados**, **Wordfast** e **Across**) com a fluidez de modelos locais compactos (`TranslateGemma 4B`, `Qwen 2.5 3B`, `Llama 3.2`) governados por um **Harness Evolutivo de Projeto (`.amanuensis/AGENT.md`)** e execução **100% offline (Zero-Telemetry)**.

```mermaid
flowchart TD
    subgraph Ingest["1. Entrada Universal & Harness Pré-Tradução"]
        A1["🔍 PDF Escaneado (Apple Vision OCR + PDFKit)"]
        A2["📄 PDF Digital Nativo (Sem OCR)"]
        A3["📝 Word (.docx), E-book (.epub), Legenda (.srt/.vtt)"]
        A4["📋 Texto Colado (Cmd+V) / Markdown (.md)"]
        H_OCR["🛡️ OcrFormattingHarness (OCR_FORMAT_HARNESS.md)\nCura Silábica • Capítulos • Trechos Curtos • Auditoria 100%"]
        A1 & A2 & A3 & A4 --> H_OCR
    end

    subgraph Core["2. Mesa de Tradução (Workbench & Modo Zen)"]
        WB["⚡ Workbench de 3 Colunas + Print do Scan ('Tirar a Teima')"]
        ZEN["🧘 Modo Zen (Pergaminho Sépia / E-Ink / Sálvia)"]
        H_OCR --> WB & ZEN
    end

    subgraph Engines["3. Motores Determinísticos & Produtividade CAT (Issues #1 a #6)"]
        TM["🗄️ TM Híbrida SQLite WAL (FTS5 BM25 + Vetor Denso RRF)"]
        LC["📚 LiveCorpus & Concordância de Substring Mais Longa (LSC <50%)"]
        DV["🧩 Déjà Vu AutoAssemble Híbrido, AutoWrite & Extrator de Léxico"]
        OM["🔁 OmegaT Auto-Propagação, Exceções Contextuais (ctx-...) & Regex Global"]
        TR["📝 Trados Revisão .docx Round-Trip, EPUB Chain Files & Validador CPS"]
        AC["📊 Across Matriz de Consistência Intra-Obra, Notas [N. da T.] & Estágios"]
        OB["🔮 Biblioteca Viva Obsidian (.canvas + ADRs) & História Semântica Git"]
    end

    subgraph Security["4. Hardening de Segurança & Performance (Issue #7)"]
        SEC["🛡️ Sandbox Anti-Prompt-Injection (<source_segment_untrusted>)\nToken Efêmero Loopback CSRF • Anti-XXE • Criptografia HMAC-SHA256\nBinário Mach-O LTO+Strip (~11 MB .app / ~7,1 MB .dmg ULFO)"]
    end

    WB <--> TM & LC & DV & OM & TR & AC & OB
    WB --> SEC
```

---

## 🚀 2. Assistente de Entrada Universal, Especialidade & Diagnóstico de Hardware

### 2.1 Passo 1: Fluxo Universal de Entrada (4 Canais Sem Fricção)
O tradutor não precisa começar apenas por um scan óptico. Logo na abertura, o Assistente oferece **4 caminhos claros**:
1. **🔍 PDF Escaneado (Apple Vision OCR + PDFKit)**: leitura contínua em segundo plano de todas as páginas, barra de progresso estilo Windows XP, botão de parada a qualquer momento e reconstrução automática de palavras hifenizadas no fim da linha.
2. **📄 PDF Digital, Word (`.docx`), E-book (`.epub`), Markdown (`.md`) ou Legenda (`.srt`/`.vtt`)**: extração instantânea da camada de texto nativa sem gasto de tempo com OCR.
3. **📋 Colar Texto Copiado (`Cmd+V`)**: ideal para artigos, e-mails, despachos ou capítulos avulsos.
4. **🗄️ Ir Direto para Bancos Auxiliares & Modelos**: para organizar memórias TMX/CSV ou baixar modelos antes de abrir um livro.

Além disso, o **Harness de Estruturação Pré-Tradução (`OCR_FORMAT_HARNESS.md`)** divide blocos gigantescos em **trechos curtos e contextuais (1 a 2 frases)** com auditoria determinística de 100% de preservação lexical e numérica.

![Assistente Passo 1 — Fluxo Universal de Entrada e Harness Pré-Tradução](screenshots/01_onboarding_passo1_fluxo_universal.png)

### 2.2 Passo 2: Especialidade Editorial & Geração Automática do `.amanuensis/AGENT.md`
O usuário escolhe a área da obra (Ciências Sociais, Literatura, Direito, Medicina, Filosofia, TI ou especialidade customizada) e os idiomas de origem e destino. O Amanuensis compila automaticamente o arquivo `.amanuensis/AGENT.md` no disco com regras estilísticas e terminológicas da área.

![Assistente Passo 2 — Especialidade Editorial e Diretrizes do Projeto](screenshots/02_onboarding_passo2_dominio_e_estilo.png)

### 2.3 Passo 3: Diagnóstico de Hardware Local & Popup Comparativo de Benchmark
O software inspeciona os núcleos de CPU, a memória RAM disponível e a aceleração gráfica Apple Metal, recomendando o modelo ideal e exibindo um **popup comparativo contido dentro do card** (sem cortes na borda da janela) com velocidade estimada em palavras/segundo e fidelidade estilística.

![Assistente Passo 3 — Diagnóstico de Hardware e Benchmark Comparativo](screenshots/03_onboarding_passo3_hardware_e_benchmark_popup.png)

---

## ⚡ 3. Mesa de Tradução (Workbench de 3 Colunas) & Print "Tirar a Teima"

A **Mesa de Tradução (`1. Workbench de Tradução`)** organiza o trabalho em três painéis sincronizados:
- **Painel Esquerdo (Documento Original & Print do Scan "Tirar a Teima")**: exibe no topo o recorte óptico real da página escaneada correspondente ao trecho ativo (com botões `⬆️ Subir`, `⬇️ Descer` e `🖼️ Pág. Inteira`) para o tradutor tirar qualquer dúvida sobre caracteres borrados ou manchas de impressão no fac-símile original.
- **Painel Central (Editor de Segmentos Contextuais)**: cada trecho exibe o original à esquerda, a tradução editável à direita, diff visual palavra por palavra e uma barra de ferramentas completa por segmento.
- **Painel Direito (LiveCorpus, Concordância Sub-Frase LSC, Memória Híbrida & Glossário)**: reúne todas as sugestões determinísticas da memória e do corpus documental.

![Mesa de Tradução Principal — Visão Geral das 3 Colunas e Print do Scan](screenshots/04_workbench_mesa_de_traducao_visao_geral.png)

### Menus Superiores Nativos e na Janela (`Arquivo`, `Editar`, `Configurações`, `Modelos`, `PDFs & OCR`, `Obsidian & Git`)
Todos os recursos contam com menus cascata e atalhos diretos de teclado:

![Menu Dropdown de Modelos Locais, Caches e Atalhos](screenshots/05_menu_dropdown_modelos_e_pdfs.png)

---

## 🧩 4. Extrator de Léxico da Obra, AutoAssemble Híbrido & AutoWrite Dinâmico (Inspirado no Déjà Vu — Issue #3)

Inspirado nos recursos mais elogiados do **Atril Déjà Vu**:
1. **🔍 Extrator de Léxico Recorrente da Obra (`Build Project Lexicon`)**: varre todos os segmentos do projeto, filtra *stopwords* e lista os sintagmas multi-palavra (2 a 5 palavras) mais frequentes na obra para o tradutor travar a tradução canônica no `.amanuensis/glossary.toml` antes ou durante o trabalho.
2. **🧩 AutoAssemble Híbrido de Sub-Segmentos**: monta instantaneamente o esqueleto da tradução combinando fragmentos travados do Glossário/Léxico (`📌 Verde`), sub-frases da TM/LiveCorpus (`📚 Azul`) e costura morfológica local (`🧠 Âmbar`), exibindo a cobertura determinística percentual.
3. **⌨️ AutoWrite Dinâmico Não-Intrusivo**: enquanto o tradutor digita, sugere pílulas clicáveis ancoradas 100% no Glossário e nos fragmentos LSC (zero alucinação livre).

![Extrator de Léxico Recorrente da Obra e Esqueleto AutoAssemble Híbrido](screenshots/06_workbench_dejavu_extrator_lexico_e_autoassemble.png)

---

## 🔎 5. Auto-Propagação Inteligente, Exceções Contextuais (`ctx-...`) & Busca/Substituição Regex Global (Inspirado no OmegaT — Issue #4)

Inspirado na agilidade do **OmegaT**:
1. **🔁 Auto-Propagação Instantânea com Contador de Repetições (`🔁 Repete Nx na Obra`)**: ao confirmar um trecho que se repete ao longo do livro, todas as ocorrências idênticas são atualizadas automaticamente.
2. **🔀 Exceção Contextual (`Create Alternative Translation`)**: quando uma frase repetida exige tradução diferente num capítulo específico (por ironia, diálogo ou poesia), o botão **`🔀 Marcar Exceção Contextual`** vincula o trecho ao hash SHA-256 de vizinhança (`ctx-...`: parágrafo anterior + parágrafo posterior), blindando-o contra sobrescritas globais.
3. **🔎 Busca e Substituição Global com Expressões Regulares (`⌘⇧F`)**: suporta grupos de captura (`$1`, `$&`), filtros por escopo (`Original`, `Tradução`, `Ambos`) e status (`Confirmados`, `Rascunhos IA`, `Repetidos`), com pré-visualização de diff antes da substituição em lote.

![Busca e Substituição Global com Regex e Exceção Contextual](screenshots/07_workbench_omegat_busca_regex_global_e_excecao.png)

---

## 📝 6. Revisão Bilíngue Externa em Word (`.docx` Round-Trip), E-books `.epub` Chain Files & Legendas `.srt`/`.vtt` CPS (Inspirado no Trados & Wordfast — Issue #5)

### 6.1 Revisão Bilíngue Externa em Word (`.docx` Track-Changes Round-Trip)
Na realidade editorial brasileira e internacional, preparadores de texto e revisores trabalham no Microsoft Word ou LibreOffice Writer. O Amanuensis exporta uma tabela Word `.docx` nativa (`[#ID | Original | Tradução | Notas]`) e, ao reimportar o `.docx` revisado, exibe o diff de cada alteração sugerida pela revisora com a opção **`🛡️ Aceitar & Virar Regra no AGENT.md`**, evoluindo automaticamente o Harness do projeto!

![Revisão Bilíngue Externa em Word (.docx Round-Trip) com Evolução do AGENT.md](screenshots/08_workbench_trados_revisao_bilingue_docx_roundtrip.png)

### 6.2 E-books `.epub` (Multi-Chapter Chain Files sem Tag-Soup) & Legendas `.srt`/`.vtt` com Validador CPS
- **E-books `.epub`**: encadeia todos os capítulos `OEBPS/Text/cap*.xhtml` em uma visão contínua na Mesa de Tradução sem poluir a tela com tags HTML/CSS, reconstruindo os XHTMLs limpos na exportação.
- **Legendas `.srt` / `.vtt`**: valida em tempo real a taxa de leitura em **Caracteres Por Segundo (CPS)** (`🟢 Confortável ≤ 17 CPS`, `🟡 Atenção 17–20 CPS`, `🔴 Acima de 20 CPS`) e o limite de 42 caracteres por linha.

![Validador de Legendas .srt / .vtt com Diagnóstico de Caracteres Por Segundo (CPS)](screenshots/09_workbench_wordfast_epub_chain_e_srt_cps.png)

---

## 📊 7. Matriz de Consistência Intra-Obra, Notas do Tradutor `[N. da T.]` Publicáveis & Estágios Editoriais Sem Lock-in (Inspirado no Across — Issue #6)

Inspirado no controle de qualidade do **Across**, mas **sem qualquer bloqueio burocrático (Zero Lock-in)**:
1. **📊 Matriz de Consistência Intra-Obra (`Across QA Matrix`)**: audita toda a obra em busca de:
   - `🔁 Inconsistências de Alvo` (mesmo original traduzido de duas formas distintas sem marcação de `🔀 Exceção Contextual`),
   - `💥 Colisões Inversas` (frases originais diferentes traduzidas com a mesma frase em português),
   - `📌 Desvios de Glossário` (termos obrigatórios omitidos),
   - `💬 Deriva de Pontuação de Diálogo` (mistura de travessão ABNT `—` com aspas `"..."` entre capítulos, com padronização em 1 clique).
2. **📝 Sistema Duplo de Notas (`[N. da T.]` Publicável vs. Nota de Trabalho Interna)**:
   - **Nota do Tradutor Publicável (`📌 [N. da T.]`)**: compilada automaticamente como nota de rodapé real (`[^nt-1]: ... [N. da T.]`) ao exportar o livro em `.md` ou `.docx`.
   - **Nota de Trabalho Interna (`🔒 Privada`)**: lembrete filológico para o tradutor/editor que jamais vaza para a publicação final.
3. **Estágios Editoriais Sem Lock-in**: seletor por trecho (`1. Tradução Inicial` ➔ `2. Preparação & Revisão` ➔ `3. Cotejo Final Aprovado`) que organiza a revisão mantendo 100% dos segmentos livremente editáveis.

![Matriz de Consistência Intra-Obra, Estágios Editoriais e Notas do Tradutor [N. da T.]](screenshots/10_workbench_across_matriz_qa_e_notas_nt.png)

---

## 🕰️ 8. Genealogia Git Inline por Trecho & Modo Zen de Foco Criativo

### 8.1 Genealogia Git por Trecho (`🕰️ História Git deste Trecho`)
Cada segmento possui sua própria linha do tempo versionada (`Versão 0 Original` ➔ `Versão 1 Rascunho IA Local` ➔ `Versão 2 Pós-Edição Filológica Humana & ADR`), permitindo comparar diffs e restaurar qualquer versão anterior com 1 clique:

![Gaveta Inline de Genealogia Git por Trecho na Mesa de Tradução](screenshots/11_workbench_historia_git_do_trecho_e_harness_inline.png)

### 8.2 Modo Zen (`🧘 Modo Zen` / Atalho `⌘\`)
Para traduções literárias, poéticas ou filosóficas densas que exigem recolhimento visual, o **Modo Zen** oculta barras técnicas e apresenta apenas o trecho ativo emoldurado pelo parágrafo anterior e posterior em suave transparência, com atmosferas **Pergaminho Sépia**, **Noturno E-Ink** e **Folha de Chá (Sálvia)**, consulta silenciosa ao glossário e **AutoAssemble Híbrido** integrado:

![Modo Zen de Foco Criativo Sem Estímulos de Tela](screenshots/12_modo_zen_foco_criativo.png)

---

## 📚 9. Bancos Auxiliares (SQLite FTS5), Explorer de Mirrors Abertos & LiveCorpus LSC (Issue #2)

Na **Aba 2 (`2. Bancos Auxiliares`)**, o tradutor gerencia:
- **Memórias de Tradução SQLite FTS5 + Vetor Denso (RRF)**: importação e exportação em `.tmx` (padrão ISO) e `.csv`, com pesos ajustáveis por banco.
- **🌐 Explorer de Mirrors de Bancos Abertos**: download com 1 clique e barra de progresso de corpora consagrados (OPUS, Europarl, SciELO Acadêmico, Acquis Jurídico, IATE/UNTERM).
- **📚 LiveCorpus (`.amanuensis/corpus/`) & Concordância de Substring Mais Longa (LSC — Inspirado no MemoQ LiveDocs)**: permite arrastar livros anteriores do autor ou traduções antigas com **zero configuração**, alinhando parágrafos automaticamente, resgatando sub-frases contíguas de 2 a 8 palavras mesmo quando a frase inteira tem `< 50%` de similaridade global, e inspecionando a **Janela Expandida de 3 Parágrafos (`¶ Anterior + ¶ Atual + ¶ Posterior`)**.

![Aba 2 — Bancos Auxiliares SQLite FTS5, Mirrors Abertos e LiveCorpus LSC](screenshots/13_aba2_bancos_auxiliares_mirrors_e_livecorpus_lsc.png)

---

## 🔍 10. Conversor OCR de PDF Escaneado ➔ Markdown & PDF Pesquisável (`Ctrl+F`)

Na **Aba 3 (`3. Conversor PDF Escaneado → PDF/MD`)**, o tradutor pode converter qualquer livro ou documento escaneado em Markdown estruturado ou em um novo **PDF Pesquisável (`Ctrl+F`)** com camada de texto invisível sobre o scan original, auditado pelo **Harness de Estruturação de Scans (`OCR_FORMAT_HARNESS.md`)**:

![Aba 3 — Conversor de PDF Escaneado para Markdown e PDF Pesquisável](screenshots/14_aba3_conversor_ocr_pdf_escaneado_markdown.png)

---

## 🛡️ 11. O Harness Evolutivo do Projeto (`.amanuensis/AGENT.md`, Glossário & Skills)

Na **Aba 4 (`4. Harness (AGENT.md & Skills)`)**, o tradutor controla o cérebro contextual que governa o modelo local:
- **`.amanuensis/AGENT.md`**: diretrizes de voz autoral, registro estilístico e invariantes formais.
- **`.amanuensis/glossary.toml`**: termos travados com inserção rápida e verificação automática de QA.
- **`.amanuensis/skills/`**: skills modulares injetadas sob demanda (ex.: preservação de tabelas Markdown, des-hifenização de scans, rigor terminológico).
- **`.amanuensis/style_rules.toml`**: regras aprendidas automaticamente a partir das pós-edições humanas do tradutor e das revisões externas em `.docx`.

![Aba 4 — Harness Evolutivo do Projeto (AGENT.md, Glossário, Skills e Regras Aprendidas)](screenshots/15_aba4_harness_evolutivo_agent_md_glossario_skills.png)

---

## 🎛️ 12. Gerenciador Fiel de Modelos Locais (`.gguf` / `llama.cpp`) & Scanner de Disco

Na **Aba 5 (`5. Modelos Locais`)**, o tradutor dispõe de três sub-abas:
1. **Catálogo & Gerenciamento de Caches**: baixar modelos quantizados (`TranslateGemma 4B`, `Qwen 2.5 3B`, `Llama 3.2 1B`), alternar o modelo ativo ou apagar modelos liberando seus caches de tensores/KV Cache.
2. **Apontar Modelo Próprio (`llama.cpp` / `.gguf`)**: vincular qualquer arquivo `.gguf` local validando sua assinatura binária (`GGUF` magic bytes, versão, contagem de tensores e metadados).
3. **🔍 Scanner de Modelos no Disco**: varre `~/.ollama`, `~/.lmstudio`, `~/.cache/huggingface` ou qualquer SSD escolhido no Finder, classificando cada modelo encontrado como **🟢 Novo & Usável (Zero-Copy Symlink sem duplicar 4–8 GB)**, **⚠️ Duplicado Desperdiçando Espaço** ou **❌ Incompatível com a RAM/VRAM da Máquina**.

![Aba 5 — Gerenciador Fiel de Modelos Locais e Scanner de Diagnóstico no Disco](screenshots/16_aba5_gerenciador_fiel_modelos_e_scanner_disco.png)

---

## 🔮 13. Biblioteca Viva no Obsidian & História Semântica no Git (Issue #1)

Na **Aba 6 (`🔮 6. Obsidian & Git`)**, cada projeto de tradução transforma-se automaticamente em um **Cofre Obsidian (Knowledge Vault)** versionado por commits semânticos no Git:
- **`00_Indice_MOC.md` & `01_Manuscrito_Bilingue/`**: capítulos bilíngues com callouts nativos, block IDs (`^seg-N`) e wikilinks `[[Conceito]]`.
- **`02_Glossario_Conceitual/` & `03_Decisoes_de_Traducao_ADR/`**: notas atômicas para cada conceito chave e registros formais de decisão filológica (`ADR-001`, `ADR-002`).
- **`04_Grafos_e_Canvas/*.canvas` (JSON Canvas 1.0)**: mapas visuais interativos (`Mapa_Conceitual_da_Obra.canvas` e `Linha_Evolutiva_dos_Trechos_Criticos.canvas`) prontos para abrir no Obsidian.
- **Sincronização Bidirecional Byte-Preserving**: permite editar a tradução ou adicionar propriedades YAML e notas livres dentro do Obsidian e sincronizar de volta para o Amanuensis passando por **3 Gates Determinísticos de Validação** (YAML Frontmatter, Integridade de `[[Wikilinks]]` e Invariância Numérica).

![Aba 6 — Biblioteca Viva Obsidian, Visualizador JSON Canvas 1.0 e Crônica Git](screenshots/17_aba6_obsidian_biblioteca_viva_canvas_e_git.png)

---

## 🛡️ 14. Hardening de Segurança, Performance Extrema & Espaço em Disco (Issue #7)

Na **Aba 7 (`🛡️ 7. Segurança, Performance & Disco`)**, o Amanuensis reúne suas garantias de engenharia de sistemas e segurança corporativa/editorial:
1. **⚡ Performance Nativa (`crates/amanuensis-core/src/security_perf.rs`)**:
   - Compilação Rust Release com `opt-level = 3`, `lto = "fat"`, `codegen-units = 1`, `strip = "symbols"` e `panic = "abort"`.
   - Pipeline SQLite FTS5 em modo `PRAGMA journal_mode = WAL; synchronous = NORMAL; temp_store = MEMORY; mmap_size = 268435456` (256 MB memory-mapped I/O).
   - Virtualização de manuscritos extensos (>10.000 segmentos) mantendo latência de digitação `< 1,2 ms`.
2. **💾 Redução Drástica do Espaço Ocupado em Disco**:
   - Binários Mach-O enxutos (`strip -x`) e imagem de disco comprimida com `ULFO` (LZFSE): pacote completo **`Amanuensis.app` com apenas ~11 MB** e instalador **`.dmg` com apenas ~7,1 MB**.
   - **Compactação SQLite 1-Clique (`FTS5 Optimize + ANALYZE + WAL Checkpoint TRUNCATE + VACUUM`)**: desfragmenta os índices invertidos FTS5 e reduz o espaço ocupado pelos bancos `.sqlite3` em até 44%.
   - **Zero Duplicação de Modelos (`link_external_gguf_zero_copy`)**: vincula modelos `.gguf` existentes no computador via symlink validado por cabeçalho mágico `GGUF`, poupando 4 a 8 GB por modelo.
3. **🔐 Segurança dos Bancos e Manuscritos Confidenciais**:
   - **Criptografia Autenticada em Repouso (`AMANUENSIS-SHA256-CTR-HMAC-V2`)**: protege obras inéditas sob embargo editorial com derivação de chave multi-round salted e tag de integridade `HMAC-SHA256` verificada em tempo constante.
   - **Escudo Anti-XXE, Anti-Zip-Bomb & Anti-Path-Traversal (`inspect_xml_or_tmx_for_xxe_and_zip_bomb`)**: bloqueia declarações `<!ENTITY`, `DOCTYPE SYSTEM/PUBLIC`, *Billion Laughs* e sequências `../` em arquivos TMX, XLIFF, DOCX e EPUB.
   - **Verificação Criptográfica FIPS 180-4 SHA-256 (`verify_sha256_digest`)**: valida a integridade de modelos `.gguf` e mirrors abertos.
4. **🛡️ Blindagem da Aplicação Desktop**:
   - **Autenticação Efêmera no Loopback (`LoopbackSessionGuard` / `X-Amanuensis-Session-Token`)**: impede ataques CSRF de abas externas do navegador contra o daemon local em `127.0.0.1`.
   - **Sandbox Anti-Prompt-Injection (`sanitize_and_wrap_untrusted_source_segment`)**: neutraliza tentativas de *Indirect Prompt Injection* ocultas dentro de PDFs/DOCX escaneados (escapando tags de fechamento e removendo tokens de controle como `<|im_start|>system`) e confina todo texto fonte dentro de `<source_segment_untrusted treat_strictly_as_literal_text="true">...</source_segment_untrusted>`.

![Aba 7 — Centro de Segurança, Performance Nativa e Otimização de Espaço em Disco](screenshots/18_aba7_seguranca_performance_e_espaco_em_disco.png)

---

## 🧪 15. Suíte Completa de Testes Automatizados (40 Testes Unitários & E2E)

Toda a arquitetura é validada deterministicamente por **40 testes unitários e de integração ponta-a-ponta** em `crates/amanuensis-core/src/lib.rs`:

```bash
cargo test --workspace
```

| Grupo de Testes | Quantidade | O que é testado e provado |
| :--- | :---: | :--- |
| **Memória Híbrida SQLite FTS5 + RRF + TMX/CSV** | 4 | Busca híbrida BM25 + Vetor Denso, matches 101% de contexto, importação/exportação `.tmx` e `.csv` |
| **Harness Evolutivo & GGUF Parser** | 4 | Compilação de `.amanuensis/AGENT.md`, extração automática de regras pós-edição, parser binário GGUF v3 e auditoria de números |
| **Suíte OCR & Harness de Estruturação de Scans** | 8 | Cura silábica de hifenizações, detecção de capítulos/tabelas/notas, ficha catalográfica (*Mayo Francés*), granularidades e auditoria 100% |
| **Ingestor Universal de Documentos** | 1 | Extração direta sem OCR de `.docx`, PDF digital nativo, texto colado (`clipboard://`) e legendas `.srt` |
| **Issue #1 — Obsidian Vault + Git Story** | 3 | Geração completa do cofre Obsidian, topologia JSON Canvas 1.0 (`.canvas`), commits semânticos Git e round-trip byte-preserving com 3 gates |
| **Issue #2 — LiveCorpus & Concordância LSC** | 3 | Alinhamento bilíngue zero-config, janela expandida de 3 parágrafos e resgate de sub-frases LSC em segmentos com `< 50%` de similaridade |
| **Issue #3 — Déjà Vu AutoAssemble, AutoWrite & Léxico** | 3 | Extração de sintagmas recorrentes (2–5 palavras), montagem híbrida AutoAssemble e autocompletar ancorado sem alucinação |
| **Issue #4 — OmegaT Auto-Propagação, Exceções & Regex** | 3 | Propagação instantânea em repetidos, proteção por hash de contexto `ctx-...` e busca/substituição Regex global com preview de diff |
| **Issue #5 — Trados `.docx` Round-Trip, `.epub` & `.srt` CPS** | 3 | Exportação/reimportação de tabela Word `.docx` com evolução do Harness, Chain Files `.epub` sem tag-soup e validador CPS de legendas |
| **Issue #6 — Across Matriz QA, Notas `[N. da T.]` & Estágios** | 3 | Detecção de inconsistência de alvo, colisão inversa, desvio de glossário, deriva de diálogo e compilação de rodapés `[^nt-N]: ... [N. da T.]` |
| **Issue #7 — Segurança, Performance, Disco & Master E2E** | 5 | Compactação SQLite WAL/FTS5/VACUUM, Zero-Copy GGUF symlink + SHA-256, Anti-XXE/Zip-Bomb, Criptografia HMAC-SHA256, Loopback CSRF + Anti-Prompt-Injection e Teste Mestre Integrado v1+v2 |
| **TOTAL** | **40 Testes** | **100% Aprovados (`40 passed; 0 failed` em `0.08s`)** |

---

## ⌨️ 16. Tabela de Atalhos de Teclado

| Atalho | Ação |
| :--- | :--- |
| `Ctrl + M` / `⌘M` | Sugerir tradução para o trecho ativo usando a IA Local + Harness (`.amanuensis/AGENT.md`) |
| `Ctrl + Enter` / `⌘Enter` | Confirmar trecho ativo, salvar na Memória de Tradução, auto-propagar repetidos e evoluir o Harness |
| `Alt + ↓` / `Alt + ↑` | Navegar para o próximo trecho / trecho anterior |
| `⌘\` (Command + Backslash) | Alternar **Modo Zen** (Foco Criativo Sem Estímulos de Tela) |
| `⌘⇧F` (Command + Shift + F) | Abrir gaveta de **Busca e Substituição Global com Regex** |
| `⌘O` | Importar documento (`.pdf`, `.docx`, `.epub`, `.md`, `.txt`, `.srt`, `.vtt`) |
| `⇧⌘P` | Exportar PDF Pesquisável (`Ctrl+F`) com camada de texto sobre o scan |
| `⌘1` a `⌘7` | Alternar rapidamente entre as 7 abas principais da estação de trabalho |
