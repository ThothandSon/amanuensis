# ✒️ Amanuensis

**Amanuensis** é uma ferramenta moderna de tradução assistida por computador (CAT) e suíte de conversão de PDFs escaneados para **PDF Pesquisável + Markdown**, construída em **Rust + Tauri v2 + React 19 / TypeScript** para **Linux, macOS e Windows**.

## Recursos Principais

1. **Bancos de Tradução Auxiliares Híbridos (`crates/amanuensis-core/src/tm.rs`)**:
   - SQLite em modo WAL com busca híbrida **Reciprocal Rank Fusion (RRF)** combinando busca léxica rápida (`FTS5` BM25), distância de edição (`Levenshtein`) e embeddings vetoriais locais.
   - Suporte a uma **TM Principal** (leitura/escrita automática) e múltiplos **Bancos Auxiliares** com pesos configuráveis e importação/exportação **TMX 1.4b**.
2. **Harness Evolutivo por Projeto (`crates/amanuensis-core/src/harness.rs`)**:
   - Isolamento estrito em `.amanuensis/` por projeto contendo `AGENT.md`, `skills/*.md`, `glossary.toml` e `learned_rules.json`.
   - **Ciclo de Pós-Edição Anti-Alucinação**: compara automaticamente a sugestão do modelo pequeno local com a edição final do tradutor humano para extrair regras terminológicas e estilísticas.
3. **Suíte de Conversão de PDFs Escaneados (`crates/amanuensis-core/src/ocr.rs`)**:
   - Reconstrói a ordem de leitura, corrige palavras quebradas por hifenização de fim de linha (`de-hyphenation`), preserva tabelas Markdown e gera simultaneamente **Markdown Estruturado** e **PDF/1.7 Pesquisável** com camada de texto alinhada por *bounding boxes*.
4. **Temas Visuais Multiplataforma (`src/styles/themes.css`)**:
   - 5 temas prontos para uso: *Obsidian Studio (Dark)*, *Paper & Ink (Sépia Editorial)*, *Daylight Crisp (Light)*, *Nordic Frost* e *High Contrast WCAG AAA*.
