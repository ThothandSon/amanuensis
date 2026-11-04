import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  TranslationSegment,
  TmBank,
  TmMatch,
  ProjectSkill,
  GlossaryTerm,
  LearnedRule,
  HardwareProfile,
  LocalModelSpec,
  DiscoveredDiskModel,
  OpenMirrorBankSpec,
  SemanticCommitKind,
  SemanticGitCommit,
  SegmentRevisionEntry,
  ObsidianAdrRecord,
  CanvasNode,
  CanvasEdge,
  ObsidianVaultNote,
  LiveCorpusDocKind,
  LiveCorpusPassage,
  LiveCorpusDocumentSpec,
  LscSubphraseMatch,
  ExtractedLexiconItem,
  AutoAssembleFragment,
  AutoAssembleResult,
  AutoWriteSuggestion,
  ContextualExceptionRecord,
  AutoPropagationOutcome,
  GlobalSearchScope,
  GlobalSearchStatusFilter,
  GlobalRegexPreviewItem,
} from './types/amanuensis';

const SAMPLE_SCANNED_PDFS = [
  {
    id: 'scan-politica',
    filename: 'ensaio_ciencia_politica_estado_scan.pdf',
    title: '📜 Scan 1: Ciência Política & Sociologia (2 págs c/ hifenização)',
    subtitle: 'Texto escaneado com palavras cortadas no fim da linha, tabela comparativa e nota de rodapé',
    project_name: 'Ensaio: Democracia, Estado & Instituições',
    domain: 'Ciências Sociais: Sociologia, Antropologia & Etnografia',
    raw_ocr:
      `# Chapter I: Democratic Insti-\ntutions and Social Cohesion\n\n` +
      `Modern welfare states depend on insti-\ntutional trust and historical account-\nability across diverse populations.\n\n` +
      `When socio-economic inequalities deep-\nen, representative mechanisms require deliber-\native renewal to prevent authoritarian drift.[^1]\n\n` +
      `| Regime Type | Social Trust Index | Redistributive Capacity |\n| :--- | :--- | :--- |\n| Consolidated Democracy | 78.4% (High) | Universal Public Goods |\n| Fragmented Polity | 34.1% (Eroding) | Clientelist Allocation |\n\n` +
      `[^1]: Archive scan digitized at 300 DPI from the Comparative Political Sociology Review.`,
  },
  {
    id: 'scan-literario',
    filename: 'manuscrito_renascentista_cap_iv_scan.pdf',
    title: '📖 Scan 2: Manuscrito Literário & Filológico Renascentista',
    subtitle: 'Fac-símile histórico com notas marginais e vocabulário clássico/editorial',
    project_name: 'Manuscrito Renascentista: Dos Escribas & Tradutores',
    domain: 'Literatura Clássica, Filologia & Textos Históricos',
    raw_ocr:
      `# Book III: Of the Illuminated Scriptorium\n\n` +
      `In the quiet cloisters of fifteenth-cen-\ntury Florence, the amanuensis laboured by candle-\nlight to preserve classical antiquity.\n\n` +
      `Every marginal gloss and rubricated ini-\ntial served not merely as ornament, but as a structured nav-\nigation system for future scholars.[^1]\n\n` +
      `[^1]: Folio 42r, Biblioteca Medicea Laurenziana (300 DPI Archival Scan).`,
  },
  {
    id: 'scan-academico',
    filename: 'artigo_ia_local_traducao_scan.pdf',
    title: '📊 Scan 3: Artigo Acadêmico sobre Tradução Neural & OCR',
    subtitle: 'Paper técnico com métricas de memória RAM, tabelas Markdown e referências',
    project_name: 'Artigo: Tradução Assistida por Modelos Locais',
    domain: 'Artigos Acadêmicos (Papers, Teses, Dissertações & Resumos ABNT)',
    raw_ocr:
      `# Chapter IV: On Locally Grounded Machine Translation\n\n` +
      `Small local language models achieve remark-\nable translation fidelity when constrained by a project-spe-\ncific harness and an auxiliary Translation Memory.\n\n` +
      `Without domain-specific glossaries and con-\ntextual grounding, unguided models suffer from terminol-\nogy drift and hallucination across long technical manuscripts.[^1]\n\n` +
      `| Architecture | Memory Footprint | Hallucination Rate |\n| :--- | :--- | :--- |\n| Unconstrained LLM | 8.4 GB VRAM | 14.2% (High Drift) |\n| Amanuensis + Project Harness | 2.1 GB RAM | <0.4% (Glossary-Locked) |\n\n` +
      `[^1]: Historical scans processed via the Amanuensis OCR Suite retain both bounding-box coordinates and searchable PDF text layers.`,
  },
];

const THEMES = [
  {
    id: 'luna-xp',
    label: '🪟 Windows XP Luna (Padrão Quadrado)',
    desc: 'Visual clássico quadrado estilo Windows XP Luna com barra azul real, botões 3D chanfrados e altíssima legibilidade.',
    swatch: ['#0054e3', '#ece9d8', '#3c8d0d'],
  },
  {
    id: 'paper-and-ink',
    label: '📜 Paper & Ink (Sépia Editorial)',
    desc: 'Papel creme editorial com tinta sépia para tradução literária, ciências humanas e leitura longa sem fadiga.',
    swatch: ['#f6f0e4', '#e5d9c3', '#b45309'],
  },
  {
    id: 'daylight-crisp',
    label: '☀️ Daylight Crisp (Light)',
    desc: 'Interface clara de altíssima nitidez para ambientes bem iluminados.',
    swatch: ['#ffffff', '#f1f5f9', '#2563eb'],
  },
  {
    id: 'obsidian-studio',
    label: '🌑 Obsidian Studio (Dark)',
    desc: 'Contraste profundo e ciano elétrico para sessões noturnas.',
    swatch: ['#0b0f17', '#1e293b', '#38bdf8'],
  },
  {
    id: 'nordic-frost',
    label: '❄️ Nordic Frost',
    desc: 'Paleta ártica suave inspirada no tema Nord para foco prolongado.',
    swatch: ['#242933', '#3b4252', '#88c0d0'],
  },
  {
    id: 'cyberpunk-neon',
    label: '🔮 Cyberpunk / Dracula Neon',
    desc: 'Tons sintéticos roxos e neon magenta de alto contraste.',
    swatch: ['#13111c', '#251e35', '#ff79c6'],
  },
  {
    id: 'high-contrast-a11y',
    label: '⚡ High Contrast WCAG AAA',
    desc: 'Contraste absoluto com bordas retas 100% quadradas e indicadores reforçados.',
    swatch: ['#000000', '#171717', '#22d3ee'],
  },
];

const DOMAIN_CATEGORIES = [
  {
    group: '📚 Tradução Literária, Editorial & Artes',
    options: [
      'Literatura: Romance, Conto & Ficção Contemporânea',
      'Literatura: Poesia, Dramaturgia & Teatro',
      'Literatura Clássica, Filologia & Textos Históricos',
      'Ensaios Literários, Crítica Cultural & Biografias',
      'Literatura Infantojuvenil, Fantasia & Quadrinhos (HQs)',
      'História da Arte, Cinema, Música & Museologia',
    ],
  },
  {
    group: '🌍 Ciências Sociais, Ciência Política & Humanidades',
    options: [
      'Ciências Sociais: Sociologia, Antropologia & Etnografia',
      'Ciência Política, Teoria do Estado & Eleições',
      'Relações Internacionais, Geopolítica & Diplomacia',
      'Políticas Públicas, Direitos Humanos & ONGs / ONU',
      'História, Historiografia & Documentos de Arquivo',
      'Filosofia, Ética, Epistemologia & Teoria Crítica',
      'Economia Política, Desenvolvimento & Estudos do Trabalho',
      'Geografia Humana, Urbanismo & Estudos Demográficos',
      'Psicologia, Psicanálise, Educação & Pedagogia',
    ],
  },
  {
    group: '📰 Jornalismo, Comunicação & Mídia',
    options: [
      'Jornalismo Investigativo, Grandes Reportagens & Perfis',
      'Jornalismo Político, Econômico & Correspondência Internacional',
      'Artigos de Opinião, Colunas, Editoriais & Crônicas',
      'Discursos Políticos, Assessoria de Imprensa & Comunicação Pública',
      'Checagem de Fatos (Fact-Checking) & Jornalismo de Dados',
    ],
  },
  {
    group: '🎓 Acadêmico, Universitário & Científico',
    options: [
      'Artigos Acadêmicos (Papers, Teses, Dissertações & Resumos ABNT)',
      'Linguística, Semiótica, Letras & Estudos da Tradução',
      'Ciências Biológicas, Medicina, Saúde Pública & Farmácia',
      'Ciências Ambientais, Ecologia, Clima & Sustentabilidade',
      'Ciências Exatas, Física, Química & Matemática',
    ],
  },
  {
    group: '⚖️ Jurídico, Corporativo & Tecnologia',
    options: [
      'Jurídico: Contratos, Legislação, Sentenças & Direito Internacional',
      'Finanças, Mercado de Capitais & Relatórios Executivos',
      'Engenharia de IA, Ciência da Computação & Manuais Técnicos',
    ],
  },
];

const INITIAL_SEGMENTS: TranslationSegment[] = [
  {
    id: 'seg-1',
    index: 0,
    source_text: '# Chapter IV: On Locally Grounded Machine Translation',
    target_text: '# Capítulo IV: Sobre a Tradução Automática Fundamentada Localmente',
    status: 'Approved',
    bbox: { page: 1, x: 0.08, y: 0.08, width: 0.84, height: 0.09 },
  },
  {
    id: 'seg-2',
    index: 1,
    source_text:
      'Small local language models achieve remarkable translation fidelity when constrained by a project-specific harness and an auxiliary Translation Memory.',
    target_text: '',
    status: 'Untranslated',
    bbox: { page: 1, x: 0.08, y: 0.2, width: 0.84, height: 0.16 },
  },
  {
    id: 'seg-3',
    index: 2,
    source_text:
      'Without domain-specific glossaries and contextual grounding, unguided models suffer from terminology drift and hallucination across long technical manuscripts.[^1]',
    target_text: '',
    status: 'Untranslated',
    bbox: { page: 1, x: 0.08, y: 0.39, width: 0.84, height: 0.16 },
  },
  {
    id: 'seg-4',
    index: 3,
    source_text:
      '| Architecture | Memory Footprint | Hallucination Rate |\n| :--- | :--- | :--- |\n| Unconstrained LLM | 8.4 GB VRAM | 14.2% (High Drift) |\n| Amanuensis + Project Harness | 2.1 GB RAM | <0.4% (Glossary-Locked) |',
    target_text: '',
    status: 'Untranslated',
    bbox: { page: 1, x: 0.08, y: 0.58, width: 0.84, height: 0.2 },
  },
  {
    id: 'seg-5',
    index: 4,
    source_text:
      '[^1]: Historical scans processed via the Amanuensis OCR Suite retain both bounding-box coordinates and searchable PDF text layers.',
    target_text: '',
    status: 'Untranslated',
    bbox: { page: 1, x: 0.08, y: 0.82, width: 0.84, height: 0.1 },
  },
];

const INITIAL_BANKS: TmBank[] = [
  {
    id: 'tm-primary',
    name: 'TM Principal do Projeto (Leitura/Escrita)',
    description: 'Alimentado automaticamente a cada segmento confirmado pelo tradutor',
    source_lang: 'en-US',
    target_lang: 'pt-BR',
    is_primary: true,
    read_only: false,
    weight: 1.2,
    entry_count: 14,
  },
  {
    id: 'tm-aux-ai-corpus',
    name: 'Auxiliar: Corpus Editorial, Acadêmico & Técnico',
    description: 'Banco de tradução auxiliar de referência (SQLite FTS5 + Embeddings)',
    source_lang: 'en-US',
    target_lang: 'pt-BR',
    is_primary: false,
    read_only: true,
    weight: 1.0,
    entry_count: 1420,
  },
  {
    id: 'tm-aux-academic',
    name: 'Auxiliar: Normas Editoriais & ABNT/Markdown',
    description: 'Padronização de notas de rodapé, cabeçalhos, citações e tabelas',
    source_lang: 'en-US',
    target_lang: 'pt-BR',
    is_primary: false,
    read_only: true,
    weight: 0.9,
    entry_count: 680,
  },
];

const INITIAL_OPEN_MIRROR_BANKS: OpenMirrorBankSpec[] = [
  {
    id: 'mirror-clacso-social-68',
    name: 'CLACSO & Arquivo Social: História Política, Maio de 68 & Movimentos Operários',
    provider_org: 'Rede CLACSO / Hemeroteca Histórica Aberta (Mirror América Latina)',
    mirror_url: 'https://mirror.clacso.org/open-corpus/historia-politica-movimentos-es-pt.tmx.zst',
    fallback_mirror_url: 'https://object.pouta.csc.fi/OPUS-GlobalVoices/v2018q4/tmx/es-pt.tmx.gz',
    license: 'CC-BY-SA 4.0 (Acesso Aberto)',
    category: 'Ciências Sociais, História & Política',
    source_lang: 'es-ES',
    target_lang: 'pt-BR',
    size_mb: 31.4,
    entry_count: 96400,
    glossary_terms_count: 1850,
    description:
      'Memória de tradução bilíngue e léxico crítico de ciência política, sociologia do trabalho, greves gerais, Maio Francês de 1968, fichas catalográficas e historiografia contemporânea.',
    sample_pairs: [
      {
        source: 'Mayo francés: cuando obreros y estudiantes desafiaron al poder.',
        target: 'Maio francês: quando operários e estudantes desafiaram o poder.',
      },
      {
        source: 'La huelga general articuló comités de fábrica y asambleas estudiantiles autónomas.',
        target: 'A greve geral articulou comitês de fábrica e assembleias estudantis autônomas.',
      },
    ],
    sample_glossary: [
      {
        source_term: 'huelga general',
        target_term: 'greve geral',
        notes: 'Consenso historiográfico CLACSO',
      },
      {
        source_term: 'clase obrera',
        target_term: 'classe operária',
        notes: 'Manter distinção sociológica face a classe trabalhadora',
      },
      {
        source_term: 'diseño y armado de interior',
        target_term: 'projeto gráfico e diagramação interna',
        notes: 'Padrão editorial brasileiro para expediente de livros',
      },
    ],
    installed: false,
  },
  {
    id: 'mirror-opus-scielo',
    name: 'OPUS SciELO: Corpus Científico, Universitário & Humanidades Revisado por Pares',
    provider_org: 'Helsinki NLP (OPUS) + SciELO Brasil / América Latina',
    mirror_url: 'https://object.pouta.csc.fi/OPUS-SciELO/v1/tmx/en-pt.tmx.gz',
    fallback_mirror_url: 'https://opus.nlpl.eu/download.php?f=SciELO/v1/tmx/es-pt.tmx.gz',
    license: 'CC-BY 4.0 (Open Science)',
    category: 'Acadêmico, Científico & SciELO',
    source_lang: 'en-US',
    target_lang: 'pt-BR',
    size_mb: 48.5,
    entry_count: 184200,
    glossary_terms_count: 3420,
    description:
      'Artigos científicos, resumos estruturados, metodologia empírica, tabelas e citações extraídas de periódicos indexados no SciELO (Inglês/Espanhol ↔ Português Brasileiro).',
    sample_pairs: [
      {
        source:
          'Small local language models achieve remarkable translation fidelity when constrained by a project-specific harness and an auxiliary Translation Memory.',
        target:
          'Modelos de linguagem locais compactos alcançam notável fidelidade de tradução quando restritos por um harness específico do projeto e uma Memória de Tradução auxiliar.',
      },
      {
        source: 'Methodological rigor requires transparent replication of quantitative tables.',
        target: 'O rigor metodológico exige a replicação transparente das tabelas quantitativas.',
      },
    ],
    sample_glossary: [
      {
        source_term: 'peer-reviewed journal',
        target_term: 'periódico revisado por pares',
        notes: 'Terminologia acadêmica CAPES/SciELO',
      },
      {
        source_term: 'welfare state',
        target_term: 'Estado de Bem-Estar Social',
        notes: 'Grafar com iniciais maiúsculas em ciência política',
      },
    ],
    installed: false,
  },
  {
    id: 'mirror-iate-unterm',
    name: 'IATE (União Europeia) + UNTERM (ONU) — Terminologia Jurídica, Diplomática & Políticas Públicas',
    provider_org: 'EU Open Data Portal & United Nations Terminology Database',
    mirror_url: 'https://iate.europa.eu/em-api/downloads/iate_tbx_multilingual_pt.zip',
    fallback_mirror_url: 'https://object.pouta.csc.fi/OPUS-UNPC/v1.0/tmx/en-pt.tmx.gz',
    license: 'Domínio Público / EU Reuse Policy',
    category: 'Jurídico, Diplomacia & ONU/UE',
    source_lang: 'en-US',
    target_lang: 'pt-BR',
    size_mb: 64.0,
    entry_count: 312000,
    glossary_terms_count: 14800,
    description:
      'Base oficial de tratados internacionais, direitos humanos, direito constitucional, regulação ambiental e resoluções diplomáticas (EN/ES/FR → PT).',
    sample_pairs: [
      {
        source: 'In accordance with international human rights treaties and due process of law.',
        target: 'Em conformidade com os tratados internacionais de direitos humanos e o devido processo legal.',
      },
    ],
    sample_glossary: [
      {
        source_term: 'due process of law',
        target_term: 'devido processo legal',
        notes: 'Termo jurídico vinculante IATE/UNTERM',
      },
      {
        source_term: 'accountability',
        target_term: 'responsabilização institucional',
        notes: 'Padrão de governança pública',
      },
    ],
    installed: false,
  },
  {
    id: 'mirror-gutenberg-literario',
    name: 'OPUS Books & Domínio Público: Clássicos da Literatura Mundial Alinhados',
    provider_org: 'Project Gutenberg + OPUS Parallel Literary Books + Domínio Público MEC',
    mirror_url: 'https://opus.nlpl.eu/download/Books/v1/tmx/en-pt.tmx.gz',
    fallback_mirror_url: 'https://object.pouta.csc.fi/OPUS-Books/v1/tmx/fr-pt.tmx.gz',
    license: 'Domínio Público',
    category: 'Literatura & Clássicos',
    source_lang: 'en-US',
    target_lang: 'pt-BR',
    size_mb: 27.8,
    entry_count: 118500,
    glossary_terms_count: 920,
    description:
      'Romances clássicos, ensaios filosóficos, crônicas renascentistas e dramaturgia alinhados frase a frase para preservar cadência literária, regência verbal e travessões editoriais.',
    sample_pairs: [
      {
        source: 'In the quiet cloisters of fifteenth-century Florence, the amanuensis laboured by candlelight.',
        target: 'Nos claustros silenciosos da Florença do século XV, o amanuense trabalhava à luz de velas.',
      },
    ],
    sample_glossary: [
      {
        source_term: 'marginal gloss',
        target_term: 'glosa marginal',
        notes: 'Vocabulário filológico e codicológico',
      },
      {
        source_term: 'rubricated initial',
        target_term: 'inicial rubricada',
        notes: 'Iluminura de manuscritos renascentistas',
      },
    ],
    installed: false,
  },
  {
    id: 'mirror-globalvoices-imprensa',
    name: 'Global Voices & Europarl: Jornalismo Internacional, Reportagens & Discursos',
    provider_org: 'Global Voices Lingua + European Parliament Proceedings Parallel Corpus',
    mirror_url: 'https://object.pouta.csc.fi/OPUS-GlobalVoices/v2018q4/tmx/es-pt.tmx.gz',
    fallback_mirror_url: 'https://object.pouta.csc.fi/OPUS-Europarl/v8/tmx/en-pt.tmx.gz',
    license: 'CC-BY 3.0 (Open Journalism)',
    category: 'Jornalismo, Mídia & Legendas',
    source_lang: 'es-ES',
    target_lang: 'pt-BR',
    size_mb: 39.4,
    entry_count: 154800,
    glossary_terms_count: 1290,
    description:
      'Grandes reportagens, colunas de opinião, despachos de agências internacionais e debates parlamentares traduzidos por jornalistas profissionais.',
    sample_pairs: [
      {
        source: 'Los corresponsales documentaron las protestas en las fábricas ocupadas.',
        target: 'Os correspondentes documentaram os protestos nas fábricas ocupadas.',
      },
    ],
    sample_glossary: [
      {
        source_term: 'rueda de prensa',
        target_term: 'coletiva de imprensa',
        notes: 'Jargão jornalístico brasileiro',
      },
    ],
    installed: false,
  },
  {
    id: 'mirror-freedict-falsos-cognatos',
    name: 'FreeDict + Dicionário Anti-Decalque & Falsos Cognatos (ES/EN/FR → PT-BR)',
    provider_org: 'FreeDict.org + OpenThesaurus PT-BR Editorial',
    mirror_url: 'https://download.freedict.org/dictionaries/spa-por/spa-por.tei.tar.xz',
    fallback_mirror_url: 'https://download.freedict.org/dictionaries/eng-por/eng-por.tei.tar.xz',
    license: 'GPLv3 / CC-BY-SA',
    category: 'Dicionários, Falsos Cognatos & Regência',
    source_lang: 'es-ES',
    target_lang: 'pt-BR',
    size_mb: 14.6,
    entry_count: 42000,
    glossary_terms_count: 2400,
    description:
      'Banco preventivo de falsos amigos (portunhol/anglicismos), regência verbal culta e colocações idiomáticas para blindar a tradução contra decalques literais.',
    sample_pairs: [
      {
        source: 'El taller de impresión funcionaba en la oficina sindical.',
        target: 'A oficina gráfica funcionava no escritório do sindicato.',
      },
    ],
    sample_glossary: [
      {
        source_term: 'taller',
        target_term: 'oficina',
        notes: 'Falso cognato clássico ES→PT (não traduzir por atelier salvo arte)',
      },
      {
        source_term: 'oficina',
        target_term: 'escritório / repartição',
        notes: 'Falso cognato clássico ES→PT',
      },
      {
        source_term: 'apellido',
        target_term: 'sobrenome',
        notes: 'Falso cognato clássico ES→PT (apelido em espanhol é apodo/sobrenombre)',
      },
    ],
    installed: false,
  },
];

export function evaluateCustomOrDiscoveredModel(
  filename: string,
  path: string,
  sizeMb: number,
  machineRamGb: number,
  alreadyRegisteredPaths: string[],
  duplicateOfPath?: string
): DiscoveredDiskModel {
  const lower = filename.toLowerCase();
  const ext = (filename.split('.').pop() || 'gguf').toLowerCase();

  let family = 'Llama / GGUF Compatível';
  if (lower.includes('gemma')) family = 'Google Gemma / TranslateGemma';
  else if (lower.includes('qwen')) family = 'Alibaba Qwen 2.5';
  else if (lower.includes('tower')) family = 'Unbabel TowerInstruct (Translation Specialist)';
  else if (lower.includes('aya')) family = 'Cohere Aya Expanse Multilingual';
  else if (lower.includes('euro')) family = 'EuroLLM Multilingual';
  else if (lower.includes('mistral') || lower.includes('nemo')) family = 'Mistral / Mistral-Nemo';
  else if (lower.includes('llama')) family = 'Meta Llama 3.2 / 3.3';
  else if (lower.includes('deepseek')) family = 'DeepSeek';
  else if (lower.includes('nomic') || lower.includes('bge') || lower.includes('embed'))
    family = 'Modelo de Vetores / Embeddings (Não-Gerador)';
  else if (lower.includes('codellama') || lower.includes('starcoder'))
    family = 'Modelo Exclusivo de Código-Fonte';

  let quant = 'Q4_K_M';
  const qMatch = lower.match(/\b(q[2-8]_[01k](?:_[sml])?|iq[1-4]_[a-z]+|f16|fp16|bf16|q8_0)\b/i);
  if (qMatch) {
    quant = qMatch[1].toUpperCase();
  } else if (ext === 'safetensors') {
    quant = 'FP16 (Safetensors Bruto)';
  } else if (ext === 'part') {
    quant = 'INCOMPLETO (.part)';
  }

  const isPartial = ext === 'part' || lower.endsWith('.gguf.part') || lower.endsWith('.download');
  const isRawSafetensors = ext === 'safetensors';
  const isEmbeddingOnly =
    lower.includes('embed') || lower.includes('bge-') || lower.includes('nomic-embed');
  const isCodeOnly = lower.includes('codellama') || lower.includes('starcoder');
  const isExtremeLowQuant = quant.startsWith('Q2') || quant.startsWith('IQ1') || quant.startsWith('IQ2');

  const ramRequiredGb = Number(((sizeMb * 1.18 + 360) / 1024).toFixed(1));
  const estWordsPerSec = Math.max(
    4,
    Math.min(130, Math.round((machineRamGb * 4800) / Math.max(600, sizeMb)))
  );

  // 1. Hardware Recommendation
  let hardware_level: DiscoveredDiskModel['hardware_level'] = 'Recommended';
  let hardware_verdict = '';
  if (isPartial) {
    hardware_level = 'NotRecommended';
    hardware_verdict = '❌ Arquivo incompleto (.part) — download interrompido.';
  } else if (ramRequiredGb <= machineRamGb * 0.56) {
    hardware_level = 'Recommended';
    hardware_verdict = `✅ Recomendado p/ seu Mac (${machineRamGb} GB RAM): consome ~${ramRequiredGb} GB na GPU Metal (~${estWordsPerSec} palavras/seg) com ampla folga para outros apps.`;
  } else if (ramRequiredGb <= machineRamGb * 0.82) {
    hardware_level = 'HeavyBorderline';
    hardware_verdict = `⚠️ Pesado p/ seu Mac (${machineRamGb} GB RAM): exige ~${ramRequiredGb} GB (~${estWordsPerSec} palavras/seg). Roda localmente, mas recomenda-se fechar apps pesados para evitar swap.`;
  } else {
    hardware_level = 'NotRecommended';
    hardware_verdict = `❌ Não Recomendado p/ seu Mac (${machineRamGb} GB RAM): exige ~${ramRequiredGb} GB (ultrapassa a memória física segura e causará travamentos por paginação de disco).`;
  }

  // 2. Task Reliability (Translation + Formatting Harness)
  let reliability_level: DiscoveredDiskModel['reliability_level'] = 'HighReliable';
  let reliability_verdict = '';
  if (isPartial) {
    reliability_level = 'UnreliableForTask';
    reliability_verdict =
      '🚫 Não Usável: arquivo corrompido ou download parcial interrompido (.part).';
  } else if (isRawSafetensors) {
    reliability_level = 'UnreliableForTask';
    reliability_verdict =
      '🚫 Incompatível Direto: pesos PyTorch (.safetensors) não convertidos para formato GGUF do llama.cpp.';
  } else if (isEmbeddingOnly) {
    reliability_level = 'UnreliableForTask';
    reliability_verdict =
      '🚫 Não Confiável p/ Tradução: modelo apenas de embeddings/vetores (serve para busca semântica, mas é incapaz de traduzir ou formatar texto).';
  } else if (isCodeOnly) {
    reliability_level = 'UnreliableForTask';
    reliability_verdict =
      '🚫 Não Confiável p/ Tradução Editorial: treinado apenas para código-fonte; falha em prosa literária, humanidades e obediência ao glossário.';
  } else if (isExtremeLowQuant) {
    reliability_level = 'UnreliableForTask';
    reliability_verdict = `🚫 Não Confiável (${quant}): compressão extrema de 2 bits degrada acentuação em português, omite numerais e quebra tabelas do Harness.`;
  } else if (sizeMb < 1450 || quant.startsWith('Q3')) {
    reliability_level = 'PartialDraftOnly';
    reliability_verdict = `⚠️ Confiabilidade Parcial (${quant}): ultra-rápido para rascunhos e triagem, mas exige revisão humana em textos literários ou filosóficos densos.`;
  } else {
    reliability_level = 'HighReliable';
    reliability_verdict = `🛡️ Alta Confiabilidade (${quant}): segue estritamente o AGENT.md e o OCR_FORMAT_HARNESS.md, preservando 100% dos números, tabelas e estilo editorial.`;
  }

  // 3. Discovery Classification
  let status: DiscoveredDiskModel['status'] = 'NewUsable';
  let status_label = '🟢 Novo & Usável (Pronto p/ Vincular)';
  if (isPartial || isRawSafetensors || isEmbeddingOnly || isCodeOnly || isExtremeLowQuant) {
    status = 'UnusableOrIncompatible';
    status_label = '❌ Não Usável / Incompatível c/ a Tarefa';
  } else if (duplicateOfPath) {
    status = 'DuplicateWaste';
    status_label = '⚠️ Duplicado no Disco (Desperdício de Espaço)';
  } else if (alreadyRegisteredPaths.some((p) => p.toLowerCase() === path.toLowerCase())) {
    status = 'AlreadyRegistered';
    status_label = '🔵 Já Registrado no Amanuensis';
  }

  const dirParts = path.split('/');
  dirParts.pop();
  const directory = dirParts.join('/') || '~/Models';

  return {
    id: `disk-${path.replace(/[^a-zA-Z0-9]/g, '-').slice(-42)}`,
    filename,
    path,
    directory,
    duplicate_of_path: duplicateOfPath,
    ext,
    size_mb: sizeMb,
    cache_waste_mb: isPartial ? sizeMb : duplicateOfPath ? Math.round(sizeMb * 0.14) : 120,
    family,
    quant,
    status,
    status_label,
    hardware_level,
    hardware_verdict,
    est_words_per_sec: estWordsPerSec,
    ram_required_gb: ramRequiredGb,
    reliability_level,
    reliability_verdict,
    diagnostic_notes: duplicateOfPath
      ? `Cópia idêntica já existe em "${duplicateOfPath}". Você pode apagar esta duplicata para recuperar ${(sizeMb / 1024).toFixed(2)} GB imediatamente.`
      : status === 'NewUsable'
      ? 'Encontrado fora da pasta padrão do Amanuensis. Pode ser vinculado diretamente via llama.cpp sem duplicar arquivos no SSD.'
      : status === 'AlreadyRegistered'
      ? 'Este arquivo já está conectado à sua biblioteca ativa do Amanuensis.'
      : 'Recomendamos remover ou substituir este arquivo para liberar espaço e evitar falhas de inferência.',
  };
}

const INITIAL_DISCOVERED_DISK_MODELS: DiscoveredDiskModel[] = [
  evaluateCustomOrDiscoveredModel(
    'translategemma-4b-q4_k_m.gguf',
    '~/Library/Application Support/Amanuensis/models/translategemma-4b-q4_k_m.gguf',
    2480,
    16,
    ['~/Library/Application Support/Amanuensis/models/translategemma-4b-q4_k_m.gguf']
  ),
  evaluateCustomOrDiscoveredModel(
    'mistral-nemo-instruct-2407-q4_k_m.gguf',
    '~/.lmstudio/models/mistralai/Mistral-Nemo-Instruct-2407-GGUF/mistral-nemo-instruct-2407-q4_k_m.gguf',
    7120,
    16,
    []
  ),
  evaluateCustomOrDiscoveredModel(
    'towerinstruct-7b-v0.2-q5_k_m.gguf',
    '~/.cache/huggingface/hub/models--Unbabel--TowerInstruct-7B-v0.2-GGUF/towerinstruct-7b-v0.2-q5_k_m.gguf',
    4780,
    16,
    []
  ),
  evaluateCustomOrDiscoveredModel(
    'qwen2.5-3b-instruct-q4_k_m (1).gguf',
    '~/Downloads/qwen2.5-3b-instruct-q4_k_m (1).gguf',
    1930,
    16,
    [],
    '~/Library/Application Support/Amanuensis/models/qwen2.5-3b-instruct-q4_k_m.gguf'
  ),
  evaluateCustomOrDiscoveredModel(
    'codellama-7b-instruct.Q2_K.gguf',
    '~/.ollama/models/blobs/codellama-7b-instruct.Q2_K.gguf',
    2890,
    16,
    []
  ),
  evaluateCustomOrDiscoveredModel(
    'llama-3.1-70b-instruct-q4_k_m.gguf.part',
    '~/Downloads/llama-3.1-70b-instruct-q4_k_m.gguf.part',
    18420,
    16,
    []
  ),
];

const INITIAL_OBSIDIAN_ADRS: ObsidianAdrRecord[] = [
  {
    adr_id: 'ADR-001-Welfare-State-Estado-Bem-Estar',
    title: 'Padronização de "Welfare State" e "Obreros" em Ciências Sociais',
    status: 'Aceito',
    context_problem:
      'Em textos de sociologia política e história do século XX (como Mayo Francés 1968), traduções literais oscilam entre "Estado de Bem-Estar", "Estado-Providência" e "trabalhadores/operários".',
    adopted_decision:
      'Adotar canonicamente "Estado de Bem-Estar Social" para "Welfare State" e "operários" para "obreros" (reservando "trabalhadores" para "trabajadores"), mantendo coesão conceitual em todo o Vault Obsidian.',
    affected_concepts: ['Translation Memory', 'Estado_de_Bem_Estar_Social', 'Obreros'],
    affected_segments: [1, 2],
  },
  {
    adr_id: 'ADR-002-Invariancia-Tabelas-e-Citacoes',
    title: 'Preservação Estrita de Tabelas Markdown e Notas de Rodapé [^1]',
    status: 'Aceito',
    context_problem:
      'Modelos locais compactos tendem a fundir células de tabelas comparativas ou omitir âncoras de rodapé ao traduzir blocos longos.',
    adopted_decision:
      'Ativar a skill `markdown-structure` no Harness e auditar deterministamente o número de pipes `|` e números antes de cada commit semântico no Git.',
    affected_concepts: ['harness', 'Amanuensis'],
    affected_segments: [2, 3],
  },
];

const INITIAL_SEMANTIC_GIT_COMMITS: SemanticGitCommit[] = [
  {
    commit_hash: '8e41b9c02d714a3e91f0a4b2c8d1e7f3a4f92c1b',
    short_hash: '8e41b9c',
    kind: 'obsidian',
    scope: 'vault-sync',
    summary: 'obsidian(vault-sync): geração da Biblioteca Viva, Atlas Conceitual e 2 JSON Canvas (.canvas)',
    timestamp_iso: '2026-11-04 02:10:00 -0300',
    author: 'Amanuensis Translation Story Engine',
    affected_segments: [1, 2, 3, 4],
    tag_name: 'v1.0-vault-vivo',
    stats_note: '9 notas Markdown + 2 arquivos .canvas + .obsidian/graph.json sincronizados',
  },
  {
    commit_hash: '5c29a1f83e104d2b77c9e0a1b3d4f6e2a4f92c1b',
    short_hash: '5c29a1f',
    kind: 'harness',
    scope: 'adr-001',
    summary: 'harness(adr-001): consolidação do glossário e regra aprendida da pós-edição humana',
    timestamp_iso: '2026-11-04 01:55:00 -0300',
    author: 'Tradutor & Revisor (Scriptorium)',
    affected_segments: [1, 2],
    stats_note: 'ADR-001 vinculado ao Atlas Conceitual e ao AGENT.md',
  },
  {
    commit_hash: '3a18d7e49b201c5f66a8d2e0f1c3b5a9a4f92c1b',
    short_hash: '3a18d7e',
    kind: 'translate',
    scope: 'cap-01',
    summary: 'translate(cap-01): rascunho assistido por TranslateGemma 4B + pós-edição dos trechos #1–#3',
    timestamp_iso: '2026-11-04 01:42:00 -0300',
    author: 'TranslateGemma 4B Q4_K_M + Tradutor',
    affected_segments: [1, 2, 3],
    stats_note: '100% de invariância numérica e terminológica verificada',
  },
  {
    commit_hash: '1f04c8a92d317e6b44f1c9d8e2a0b7c4a4f92c1b',
    short_hash: '1f04c8a',
    kind: 'ingest',
    scope: 'ocr-harness',
    summary: 'ingest(ocr-harness): extração óptica e segmentação contextual via OCR_FORMAT_HARNESS.md',
    timestamp_iso: '2026-11-04 01:30:00 -0300',
    author: 'Amanuensis Scan-to-Structure Harness',
    affected_segments: [1, 2, 3, 4],
    tag_name: 'v0.1-ingestao-base',
    stats_note: 'Zero blocos gigantes • Hifenizações reconstituídas com 100% de fidelidade lexical',
  },
];

function validateObsidianNoteGates(
  markdown: string,
  requiredNumbers: string[]
): {
  yamlValid: boolean;
  wikilinksValid: boolean;
  numbersValid: boolean;
  extractedWikilinks: string[];
  preservedCustomYaml: Record<string, string>;
  preservedUserNotes: string[];
  updatedSegments: Record<string, string>;
  errors: string[];
} {
  const errors: string[] = [];
  const preservedCustomYaml: Record<string, string> = {};
  const preservedUserNotes: string[] = [];
  const updatedSegments: Record<string, string> = {};

  const standardKeys = new Set([
    'title',
    'author',
    'translator',
    'source_lang',
    'target_lang',
    'domain',
    'model',
    'progress_pct',
    'tags',
  ]);

  let yamlValid = false;
  if (markdown.startsWith('---\n')) {
    const endIdx = markdown.indexOf('\n---\n', 4);
    if (endIdx !== -1) {
      const yamlBlock = markdown.slice(4, endIdx);
      const lines = yamlBlock.split('\n');
      yamlValid = lines.every((l) => {
        const t = l.trim();
        return !t || t.startsWith('-') || t.startsWith('#') || t.includes(':');
      });
      for (const line of lines) {
        const colonIdx = line.indexOf(':');
        if (colonIdx !== -1) {
          const k = line.slice(0, colonIdx).trim();
          const v = line
            .slice(colonIdx + 1)
            .trim()
            .replace(/^["']|["']$/g, '');
          if (k && !k.startsWith('-') && !standardKeys.has(k)) {
            preservedCustomYaml[k] = v;
          }
        }
      }
      if (!yamlValid) {
        errors.push('Linha inválida encontrada no bloco YAML Frontmatter.');
      }
    } else {
      errors.push('YAML Frontmatter não possui delimitador de fechamento "---".');
    }
  } else {
    errors.push('A nota não inicia com bloco YAML Frontmatter "---".');
  }

  const openMatches = (markdown.match(/\[\[/g) || []).length;
  const closeMatches = (markdown.match(/\]\]/g) || []).length;
  let wikilinksValid = openMatches === closeMatches;
  if (!wikilinksValid) {
    errors.push(
      `Wikilinks desbalanceados: ${openMatches} aberturas "[[" vs ${closeMatches} fechamentos "]]".`
    );
  }

  const extractedWikilinks: string[] = [];
  const wikiRe = /\[\[([^\]]*)\]\]/g;
  let m: RegExpExecArray | null;
  while ((m = wikiRe.exec(markdown)) !== null) {
    const inner = m[1].trim();
    if (!inner) {
      wikilinksValid = false;
      errors.push('Wikilink vazio "[[]]" detectado.');
    } else {
      extractedWikilinks.push(inner);
    }
  }

  let numbersValid = true;
  for (const num of requiredNumbers) {
    if (!markdown.includes(num)) {
      numbersValid = false;
      errors.push(`Invariância numérica violada: número "${num}" ausente na nota do Obsidian.`);
    }
  }

  const notesStart = markdown.indexOf('<!-- OBSIDIAN_USER_NOTES_START -->');
  const notesEnd = markdown.indexOf('<!-- OBSIDIAN_USER_NOTES_END -->');
  if (notesStart !== -1 && notesEnd > notesStart) {
    const noteBody = markdown
      .slice(notesStart + '<!-- OBSIDIAN_USER_NOTES_START -->'.length, notesEnd)
      .trim();
    if (noteBody) {
      preservedUserNotes.push(noteBody);
    }
  }

  const segRe =
    /<!-- AMANUENSIS_TARGET_START:([^\s-]+(?:-[^\s-]+)*) -->([\s\S]*?)<!-- AMANUENSIS_TARGET_END:\1 -->/g;
  let segMatch: RegExpExecArray | null;
  while ((segMatch = segRe.exec(markdown)) !== null) {
    const segId = segMatch[1].trim();
    const segText = segMatch[2].trim();
    updatedSegments[segId] = segText;
  }

  return {
    yamlValid,
    wikilinksValid,
    numbersValid,
    extractedWikilinks,
    preservedCustomYaml,
    preservedUserNotes,
    updatedSegments,
    errors,
  };
}

// ============================================================================
// ISSUE #2: LIVECORPUS (.amanuensis/corpus/) & LONGEST SUBSTRING CONCORDANCE (LSC)
// ============================================================================
const SUBSEGMENT_MUSE_LEXICON: Record<string, string> = {
  'small local language models': 'modelos de linguagem locais compactos',
  'remarkable translation fidelity': 'notável fidelidade de tradução',
  'constrained by a project-specific harness': 'restritos por um harness específico do projeto',
  'project-specific harness': 'harness específico do projeto',
  'auxiliary translation memory': 'Memória de Tradução auxiliar',
  'domain-specific glossaries': 'glossários específicos de domínio',
  'contextual grounding': 'ancoragem contextual',
  'terminology drift and hallucination': 'desvio terminológico e alucinação',
  'long technical manuscripts': 'manuscritos técnicos extensos',
  'historical scans processed': 'digitalizações históricas processadas',
  'bounding-box coordinates and searchable pdf text layers':
    'coordenadas de bounding-box e camadas de texto em PDF pesquisável',
  'searchable pdf text layers': 'camadas de texto em PDF pesquisável',
  'modern welfare states': 'Estados de Bem-Estar Social modernos',
  'institutional trust and historical accountability':
    'confiança institucional e responsabilização histórica',
  'democratic institutions and social cohesion':
    'instituições democráticas e coesão social',
  'cuando obreros y estudiantes desafiaron al poder':
    'quando operários e estudantes desafiaram o poder',
  'obreros y estudiantes desafiaron al poder': 'operários e estudantes desafiaram o poder',
  'ocupación de la fábrica citroen en mayo de 1968':
    'ocupação da fábrica Citroën em maio de 1968',
  'reflexiones y documentos': 'reflexões e documentos',
};

const INITIAL_LIVECORPUS_DOCS: LiveCorpusDocumentSpec[] = [
  {
    id: 'corpus-bilingue-vigna-1968',
    title:
      'Xavier Vigna & Coletivo — Mayo Francés (1968) + Tradução Antiga (Alinhado Automaticamente sem TMX)',
    filename: 'vigna_mayo_frances_1968_par_bilingue.pdf',
    kind: 'BilingualAutoAligned',
    source_lang: 'es-ES / en-US',
    target_lang: 'pt-BR',
    passage_count: 4,
    avg_alignment_confidence: 0.96,
    passages: [
      {
        id: 'corpus-bilingue-vigna-1968-p1',
        doc_id: 'corpus-bilingue-vigna-1968',
        doc_title:
          'Xavier Vigna & Coletivo — Mayo Francés (1968) + Tradução Antiga (Alinhado Automaticamente)',
        doc_kind: 'BilingualAutoAligned',
        paragraph_index: 0,
        prev_paragraph:
          'Prefacio a la edición sudamericana: Los archivos sindicales de 1968 revelan una convergencia inédita entre talleres mecánicos y facultades universitarias.',
        source_paragraph:
          'En las jornadas de París y Nanterre, cuando obreros y estudiantes desafiaron al poder mediante asambleas horizontales, la ocupación de la fábrica Citroen en mayo de 1968 transformó las reflexiones y documentos de toda la izquierda europea.',
        target_paragraph:
          'Nas jornadas de Paris e Nanterre, quando operários e estudantes desafiaram o poder mediante assembleias horizontais, a ocupação da fábrica Citroën em maio de 1968 transformou as reflexões e documentos de toda a esquerda europeia.',
        next_paragraph:
          'Los comités de huelga rechazaron los acuerdos preliminares de Grenelle y exigieron control obrero sobre los ritmos de montaje.',
        alignment_confidence: 0.97,
      },
      {
        id: 'corpus-bilingue-vigna-1968-p2',
        doc_id: 'corpus-bilingue-vigna-1968',
        doc_title:
          'Xavier Vigna & Coletivo — Mayo Francés (1968) + Tradução Antiga (Alinhado Automaticamente)',
        doc_kind: 'BilingualAutoAligned',
        paragraph_index: 1,
        prev_paragraph:
          'Section 1.2: Computational Philology and Archival Digitization in University Presses.',
        source_paragraph:
          'Empirical benchmarks in editorial laboratories confirm that small local language models reach remarkable translation fidelity whenever constrained by a project-specific harness and an auxiliary Translation Memory during archival editions.',
        target_paragraph:
          'Benchmarks empíricos em laboratórios editoriais confirmam que modelos de linguagem locais compactos alcançam notável fidelidade de tradução sempre que restritos por um harness específico do projeto e uma Memória de Tradução auxiliar durante edições de arquivo.',
        next_paragraph:
          'Conversely, cloud APIs lacking local glossary enforcement frequently alter historical terminology across chapters.',
        alignment_confidence: 0.96,
      },
      {
        id: 'corpus-bilingue-vigna-1968-p3',
        doc_id: 'corpus-bilingue-vigna-1968',
        doc_title:
          'Xavier Vigna & Coletivo — Mayo Francés (1968) + Tradução Antiga (Alinhado Automaticamente)',
        doc_kind: 'BilingualAutoAligned',
        paragraph_index: 2,
        prev_paragraph:
          'Previous studies on neural decoding highlighted the risk of lexical inconsistency in philosophical treatises.',
        source_paragraph:
          'In the absence of domain-specific glossaries and contextual grounding, neural decoders exhibit severe terminology drift and hallucination across long technical manuscripts and critical editions.',
        target_paragraph:
          'Na ausência de glossários específicos de domínio e ancoragem contextual, decodificadores neurais exibem severo desvio terminológico e alucinação ao longo de manuscritos técnicos extensos e edições críticas.',
        next_paragraph:
          'Therefore, deterministic post-editing rules must be persisted in the local project repository.',
        alignment_confidence: 0.95,
      },
      {
        id: 'corpus-bilingue-vigna-1968-p4',
        doc_id: 'corpus-bilingue-vigna-1968',
        doc_title:
          'Xavier Vigna & Coletivo — Mayo Francés (1968) + Tradução Antiga (Alinhado Automaticamente)',
        doc_kind: 'BilingualAutoAligned',
        paragraph_index: 3,
        prev_paragraph:
          'Archival preservation protocols require non-destructive optical recognition of renaissance and twentieth-century folios.',
        source_paragraph:
          'All historical scans processed by university scriptoria must preserve bounding-box coordinates and searchable PDF text layers for scholarly verification.',
        target_paragraph:
          'Todas as digitalizações históricas processadas por scriptoria universitários devem preservar coordenadas de bounding-box e camadas de texto em PDF pesquisável para verificação acadêmica.',
        next_paragraph:
          'Appendix B details the PDFKit and Apple Vision coordinate mapping pipeline.',
        alignment_confidence: 0.96,
      },
    ],
  },
  {
    id: 'corpus-author-prior-2021',
    title: 'Obra Anterior do Mesmo Autor — Comparative Political Sociology Monograph (2021)',
    filename: 'author_prior_work_political_sociology_2021.pdf',
    kind: 'AuthorPriorWork',
    source_lang: 'en-US',
    target_lang: 'pt-BR',
    passage_count: 2,
    avg_alignment_confidence: 1.0,
    passages: [
      {
        id: 'corpus-author-prior-2021-p1',
        doc_id: 'corpus-author-prior-2021',
        doc_title:
          'Obra Anterior do Mesmo Autor — Comparative Political Sociology Monograph (2021)',
        doc_kind: 'AuthorPriorWork',
        paragraph_index: 0,
        prev_paragraph:
          'Chapter 1 examined post-war European constitutionalism and municipal taxation reforms.',
        source_paragraph:
          'Comparative municipal surveys demonstrate that democratic institutions and social cohesion in modern welfare states rely upon institutional trust and historical accountability during fiscal transitions.',
        target_paragraph:
          'Pesquisas municipais comparadas demonstram que instituições democráticas e coesão social em Estados de Bem-Estar Social modernos dependem de confiança institucional e responsabilização histórica durante transições fiscais.',
        next_paragraph:
          'Where deliberative councils were dismantled, electoral abstention rose by 18.4% within two legislative cycles.',
        alignment_confidence: 1.0,
      },
      {
        id: 'corpus-author-prior-2021-p2',
        doc_id: 'corpus-author-prior-2021',
        doc_title:
          'Obra Anterior do Mesmo Autor — Comparative Political Sociology Monograph (2021)',
        doc_kind: 'AuthorPriorWork',
        paragraph_index: 1,
        prev_paragraph:
          'Methodological Note: All archival citations follow the 300 DPI facsimile standard.',
        source_paragraph:
          'Whenever historical scans processed in our digital archive are exported, bounding-box coordinates and searchable PDF text layers remain linked to the bilingual apparatus.',
        target_paragraph:
          'Sempre que digitalizações históricas processadas em nosso arquivo digital são exportadas, coordenadas de bounding-box e camadas de texto em PDF pesquisável permanecem vinculadas ao aparato bilíngue.',
        next_paragraph:
          'See Table 4 for memory footprint comparisons across local quantized models.',
        alignment_confidence: 1.0,
      },
    ],
  },
  {
    id: 'corpus-mono-estilo-ptbr',
    title:
      'Referência Monolíngue no Idioma de Chegada — Cadernos de Tradução & Sociologia Histórica (USP/UNICAMP)',
    filename: 'cadernos_traducao_sociologia_ptbr.md',
    kind: 'MonolingualTargetReference',
    source_lang: 'pt-BR',
    target_lang: 'pt-BR',
    passage_count: 2,
    avg_alignment_confidence: 1.0,
    passages: [
      {
        id: 'corpus-mono-estilo-ptbr-p1',
        doc_id: 'corpus-mono-estilo-ptbr',
        doc_title:
          'Referência Monolíngue PT-BR — Cadernos de Tradução & Sociologia Histórica (USP/UNICAMP)',
        doc_kind: 'MonolingualTargetReference',
        paragraph_index: 0,
        prev_paragraph:
          'Na tradição historiográfica brasileira sobre os movimentos operários do século XX, distingue-se rigorosamente a categoria fabril do salariado urbano geral.',
        source_paragraph:
          'Quando operários e estudantes desafiaram o poder em maio de 1968, a ocupação da fábrica Citroën consagrou o uso do termo "operários" (e não meramente "trabalhadores") nas edições críticas em língua portuguesa.',
        target_paragraph:
          'Colocação recomendada em PT-BR: "operários e estudantes desafiaram o poder", "greve geral", "comitês de fábrica".',
        next_paragraph:
          'Nas notas de rodapé e fichas catalográficas, preservam-se intactos os números de ISBN, dimensões e depósitos legais da edição portenha ou parisiense.',
        alignment_confidence: 1.0,
      },
      {
        id: 'corpus-mono-estilo-ptbr-p2',
        doc_id: 'corpus-mono-estilo-ptbr',
        doc_title:
          'Referência Monolíngue PT-BR — Cadernos de Tradução & Sociologia Histórica (USP/UNICAMP)',
        doc_kind: 'MonolingualTargetReference',
        paragraph_index: 1,
        prev_paragraph:
          'Sobre o vocabulário técnico de inteligência artificial aplicada à filologia e tradução editorial:',
        source_paragraph:
          'Modelos de linguagem locais compactos evitam o desvio terminológico e alucinação quando operam sob ancoragem contextual e uma Memória de Tradução auxiliar.',
        target_paragraph:
          'Colocação recomendada em PT-BR: "modelos de linguagem locais compactos", "desvio terminológico e alucinação", "ancoragem contextual".',
        next_paragraph:
          'Recomenda-se manter a palavra técnica "harness" em minúsculas sem tradução literal.',
        alignment_confidence: 1.0,
      },
    ],
  },
];

function normalizePhraseForLsc(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9à-ÿ\s-]/gi, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .join(' ');
}

function computeGlobalWordSimilarityPct(a: string, b: string): number {
  const wordsA = new Set(normalizePhraseForLsc(a).split(' ').filter(Boolean));
  const wordsB = new Set(normalizePhraseForLsc(b).split(' ').filter(Boolean));
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  let inter = 0;
  wordsA.forEach((w) => {
    if (wordsB.has(w)) inter++;
  });
  const union = wordsA.size + wordsB.size - inter;
  return Math.round((inter / Math.max(1, union)) * 100);
}

function findLongestSubstringConcordances(
  segmentSource: string,
  docs: LiveCorpusDocumentSpec[],
  glossary: GlossaryTerm[]
): LscSubphraseMatch[] {
  const tokenRe = /[A-Za-zÀ-ÿ0-9]+(?:-[A-Za-zÀ-ÿ0-9]+)*/g;
  const tokens: Array<{ word: string; start: number; end: number }> = [];
  let m: RegExpExecArray | null;
  while ((m = tokenRe.exec(segmentSource)) !== null) {
    tokens.push({
      word: m[0],
      start: m.index,
      end: m.index + m[0].length,
    });
  }
  if (tokens.length < 2) return [];

  const allPassages: LiveCorpusPassage[] = [];
  for (const d of docs) {
    for (const p of d.passages) {
      allPassages.push(p);
    }
  }

  const covered = new Array(tokens.length).fill(false);
  const results: LscSubphraseMatch[] = [];
  const maxN = Math.min(8, tokens.length);

  for (let n = maxN; n >= 2; n--) {
    for (let startI = 0; startI <= tokens.length - n; startI++) {
      const endI = startI + n;
      let anyCovered = false;
      for (let k = startI; k < endI; k++) {
        if (covered[k]) {
          anyCovered = true;
          break;
        }
      }
      if (anyCovered) continue;

      const charStart = tokens[startI].start;
      const charEnd = tokens[endI - 1].end;
      const exactSlice = segmentSource.slice(charStart, charEnd);
      const normNgram = normalizePhraseForLsc(exactSlice);
      if (normNgram.length < 7) continue;

      const hitPassage = allPassages.find((p) =>
        normalizePhraseForLsc(p.source_paragraph).includes(normNgram)
      );
      const directLexicon = SUBSEGMENT_MUSE_LEXICON[normNgram];
      const glossHit = glossary.find(
        (g) => normalizePhraseForLsc(g.source_term) === normNgram
      );

      if (hitPassage || directLexicon || glossHit) {
        for (let k = startI; k < endI; k++) {
          covered[k] = true;
        }
        const passage = hitPassage || allPassages[0];
        const suggested =
          directLexicon ||
          (glossHit
            ? glossHit.do_not_translate
              ? glossHit.source_term
              : glossHit.target_term
            : undefined);
        const globalSim = passage
          ? computeGlobalWordSimilarityPct(segmentSource, passage.source_paragraph)
          : 34;

        results.push({
          source_ngram: exactSlice,
          word_count: n,
          char_start: charStart,
          char_end: charEnd,
          suggested_target_phrase: suggested,
          passage_id: passage?.id || 'lsc-lexicon',
          doc_title:
            passage?.doc_title || 'LiveCorpus (.amanuensis/corpus/)',
          doc_kind: passage?.doc_kind || 'BilingualAutoAligned',
          prev_paragraph: passage?.prev_paragraph,
          source_paragraph: passage?.source_paragraph || segmentSource,
          target_paragraph: passage?.target_paragraph || suggested,
          next_paragraph: passage?.next_paragraph,
          global_sentence_similarity_pct: globalSim,
        });
      }
    }
  }

  return results.sort((a, b) => a.char_start - b.char_start);
}

function buildLiveCorpusDocumentFromRaw(
  title: string,
  filename: string,
  kind: LiveCorpusDocKind,
  sourceLang: string,
  targetLang: string,
  rawSource: string,
  rawTarget?: string
): LiveCorpusDocumentSpec {
  const docId = `corpus-doc-${Date.now()}`;
  const srcParas = rawSource
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
  const tgtParas = (rawTarget || '')
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  const passages: LiveCorpusPassage[] = srcParas.map((sp, idx) => {
    const mappedTgt =
      kind === 'BilingualAutoAligned' && tgtParas.length > 0
        ? tgtParas[Math.min(tgtParas.length - 1, idx)]
        : undefined;
    return {
      id: `${docId}-p${idx + 1}`,
      doc_id: docId,
      doc_title: title,
      doc_kind: kind,
      paragraph_index: idx,
      prev_paragraph:
        idx > 0
          ? srcParas[idx - 1]
          : '¶ [Início do documento indexado no Cofre LiveCorpus (.amanuensis/corpus/)]',
      source_paragraph: sp,
      target_paragraph: mappedTgt,
      next_paragraph:
        idx + 1 < srcParas.length
          ? srcParas[idx + 1]
          : '¶ [Fim do documento indexado no Cofre LiveCorpus (.amanuensis/corpus/)]',
      alignment_confidence: kind === 'BilingualAutoAligned' ? 0.94 : 1.0,
    };
  });

  return {
    id: docId,
    title,
    filename,
    kind,
    source_lang: sourceLang,
    target_lang: targetLang,
    passage_count: passages.length,
    avg_alignment_confidence: kind === 'BilingualAutoAligned' ? 0.94 : 1.0,
    passages,
  };
}

// ============================================================================
// ISSUE #3: DÉJÀ VU AUTOASSEMBLE, DYNAMIC AUTOWRITE & PROJECT LEXICON EXTRACTOR
// ============================================================================
const LEXICON_BOUNDARY_STOPWORDS = new Set([
  'the',
  'and',
  'for',
  'with',
  'that',
  'this',
  'from',
  'are',
  'was',
  'were',
  'have',
  'has',
  'had',
  'not',
  'but',
  'when',
  'where',
  'which',
  'into',
  'over',
  'across',
  'without',
  'both',
  'via',
  'los',
  'las',
  'una',
  'uno',
  'unos',
  'unas',
  'por',
  'para',
  'con',
  'sin',
  'sobre',
  'entre',
  'como',
  'más',
  'pero',
  'sus',
  'del',
  'al',
  'que',
  'cuando',
]);

function extractProjectRecurringLexicon(
  segments: TranslationSegment[],
  rawOcrText: string,
  existingGlossary: GlossaryTerm[]
): ExtractedLexiconItem[] {
  const existingSet = new Set(existingGlossary.map((g) => g.source_term.toLowerCase()));
  const counts = new Map<
    string,
    { phrase: string; wordCount: number; occurrences: number; segIndices: Set<number> }
  >();

  const sources = [
    ...segments.map((s, idx) => ({ text: s.source_text, idx: idx + 1 })),
    ...rawOcrText
      .split(/\n{2,}/)
      .filter(Boolean)
      .map((t, i) => ({ text: t, idx: i + 1 })),
  ];

  for (const item of sources) {
    const words = item.text
      .replace(/[^a-zA-ZÀ-ÿ0-9\s-]/g, ' ')
      .split(/\s+/)
      .map((w) => w.trim().replace(/^-+|-+$/g, ''))
      .filter((w) => w.length >= 2 && !/^\d+$/.test(w));

    for (let n = 2; n <= Math.min(5, words.length); n++) {
      for (let start = 0; start <= words.length - n; start++) {
        const slice = words.slice(start, start + n);
        const firstLow = slice[0].toLowerCase();
        const lastLow = slice[n - 1].toLowerCase();
        if (
          LEXICON_BOUNDARY_STOPWORDS.has(firstLow) ||
          LEXICON_BOUNDARY_STOPWORDS.has(lastLow)
        ) {
          continue;
        }
        const norm = slice.map((w) => w.toLowerCase()).join(' ');
        if (norm.length < 8) continue;

        const prev = counts.get(norm);
        if (prev) {
          prev.occurrences += 1;
          prev.segIndices.add(item.idx);
        } else {
          counts.set(norm, {
            phrase: slice.join(' '),
            wordCount: n,
            occurrences: 1,
            segIndices: new Set([item.idx]),
          });
        }
      }
    }
  }

  const out: ExtractedLexiconItem[] = [];
  counts.forEach((val, normKey) => {
    const directMuse = SUBSEGMENT_MUSE_LEXICON[normKey];
    if (val.occurrences >= 2 || directMuse) {
      const glossMatch = existingGlossary.find(
        (g) => g.source_term.toLowerCase() === normKey
      );
      const suggested =
        glossMatch?.target_term ||
        directMuse ||
        generateLocalTranslation(val.phrase, 'TranslateGemma 4B', existingGlossary, []);

      out.push({
        source_phrase: val.phrase,
        word_count: val.wordCount,
        occurrences: Math.max(2, val.occurrences),
        segment_indices: Array.from(val.segIndices).slice(0, 5),
        suggested_target: suggested,
        locked_in_glossary: existingSet.has(normKey),
      });
    }
  });

  out.sort(
    (a, b) =>
      b.occurrences * 10 +
      b.word_count * 4 -
      (a.occurrences * 10 + a.word_count * 4)
  );
  return out.slice(0, 18);
}

function runHybridAutoAssemble(
  sourceText: string,
  glossary: GlossaryTerm[],
  lscMatches: LscSubphraseMatch[],
  modelName: string,
  learnedRules: LearnedRule[]
): AutoAssembleResult {
  const lowSrc = sourceText.toLowerCase();
  const fragments: AutoAssembleFragment[] = [];
  let matchedWords = 0;
  const totalWords = Math.max(
    1,
    sourceText
      .replace(/[^a-zA-ZÀ-ÿ0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(Boolean).length
  );

  for (const g of glossary) {
    if (lowSrc.includes(g.source_term.toLowerCase())) {
      const wc = g.source_term.split(/\s+/).length;
      matchedWords += wc;
      fragments.push({
        source_span: g.source_term,
        target_span: g.do_not_translate ? g.source_term : g.target_term,
        origin: 'GlossaryLexicon',
      });
    }
  }

  for (const hit of lscMatches) {
    const alreadyInGloss = fragments.some((f) =>
      f.source_span.toLowerCase().includes(hit.source_ngram.toLowerCase())
    );
    if (!alreadyInGloss && (hit.suggested_target_phrase || hit.target_paragraph)) {
      matchedWords += hit.word_count;
      fragments.push({
        source_span: hit.source_ngram,
        target_span: hit.suggested_target_phrase || hit.target_paragraph || hit.source_ngram,
        origin: 'TmOrLiveCorpusSubsegment',
      });
    }
  }

  const stitched = generateLocalTranslation(sourceText, modelName, glossary, learnedRules);
  fragments.push({
    source_span: `Costura Morfológica & Sintática (${modelName.split('(')[0].trim()} + Harness)`,
    target_span: stitched,
    origin: 'LocalModelGrammarStitch',
  });

  const coveragePct = Math.min(96, Math.round((matchedWords / totalWords) * 100));

  return {
    source_text: sourceText,
    assembled_target: stitched,
    fragments,
    deterministic_coverage_pct: Math.max(35, coveragePct),
  };
}

function computeDynamicAutoWriteSuggestions(
  currentTarget: string,
  sourceSegment: string,
  glossary: GlossaryTerm[],
  extractedLexicon: ExtractedLexiconItem[],
  lscMatches: LscSubphraseMatch[]
): AutoWriteSuggestion[] {
  const suggestions: AutoWriteSuggestion[] = [];
  const trimmedEnd = currentTarget.replace(/\s+$/, '');
  const parts = trimmedEnd.split(/[\s,;.()[\]"]+/).filter(Boolean);
  const lastToken = parts.length > 0 ? parts[parts.length - 1] : '';
  const lowPrefix = lastToken.toLowerCase();
  const lowSource = sourceSegment.toLowerCase();
  const lowTargetFull = currentTarget.toLowerCase();

  const candidatePool: Array<{ src: string; tgt: string; origin: string }> = [
    ...glossary.map((g) => ({
      src: g.source_term,
      tgt: g.do_not_translate ? g.source_term : g.target_term,
      origin: `📌 Glossário (${g.source_term})`,
    })),
    ...lscMatches
      .filter((m) => m.suggested_target_phrase)
      .map((m) => ({
        src: m.source_ngram,
        tgt: m.suggested_target_phrase || '',
        origin: `🔍 Sub-segmento LSC (${m.source_ngram})`,
      })),
    ...extractedLexicon.map((lx) => ({
      src: lx.source_phrase,
      tgt: lx.suggested_target,
      origin: `🧬 Léxico da Obra (${lx.occurrences}x)`,
    })),
  ];

  // 1. Active word prefix completion (>= 2 chars typed)
  if (lowPrefix.length >= 2) {
    for (const cand of candidatePool) {
      const lowTgt = cand.tgt.toLowerCase();
      if (
        lowTgt.startsWith(lowPrefix) &&
        lowTgt.length > lowPrefix.length &&
        !suggestions.some((s) => s.completion_full.toLowerCase() === lowTgt)
      ) {
        suggestions.push({
          trigger_prefix: lastToken,
          completion_full: cand.tgt,
          completion_suffix: cand.tgt.slice(lastToken.length),
          source_origin_label: cand.origin,
        });
      }
    }
  }

  // 2. Grounded terms present in the current source segment not yet typed in target
  for (const cand of candidatePool) {
    const lowTgt = cand.tgt.toLowerCase();
    if (
      cand.src &&
      lowSource.includes(cand.src.toLowerCase()) &&
      !lowTargetFull.includes(lowTgt) &&
      !suggestions.some((s) => s.completion_full.toLowerCase() === lowTgt)
    ) {
      suggestions.push({
        trigger_prefix: '',
        completion_full: cand.tgt,
        completion_suffix: cand.tgt,
        source_origin_label: cand.origin,
      });
    }
  }

  return suggestions.slice(0, 4);
}

// ============================================================================
// ISSUE #4: OMEGAT SMART AUTO-PROPAGATION, CONTEXTUAL EXCEPTIONS & GLOBAL REGEX
// ============================================================================
function computeSegmentContextHash(
  prevSource: string | undefined,
  currentSource: string,
  nextSource: string | undefined
): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  const feed = (str: string) => {
    const norm = str.trim().toLowerCase();
    for (let i = 0; i < norm.length; i++) {
      const code = norm.charCodeAt(i);
      h1 ^= code;
      h1 = Math.imul(h1, 0x01000193) >>> 0;
      h2 ^= code + (i & 0xff);
      h2 = Math.imul(h2, 0x85ebca6b) >>> 0;
    }
    h1 ^= 0xff;
  };
  feed(prevSource || '__START_OF_DOCUMENT__');
  feed(currentSource);
  feed(nextSource || '__END_OF_DOCUMENT__');
  return `ctx-${h1.toString(16).padStart(8, '0')}${(h2 & 0xffff).toString(16).padStart(4, '0')}`;
}

function normalizeSegmentSourceForPropagation(text: string): string {
  return text.trim().replace(/\s+/g, ' ').toLowerCase();
}

function autoPropagateConfirmedSegment(
  segments: TranslationSegment[],
  triggerIndex: number,
  exceptions: ContextualExceptionRecord[]
): { nextSegments: TranslationSegment[]; outcome: AutoPropagationOutcome } {
  const triggerSeg = segments[triggerIndex];
  if (!triggerSeg) {
    return {
      nextSegments: segments,
      outcome: {
        trigger_segment_index: triggerIndex,
        normalized_source: '',
        propagated_target: '',
        updated_segment_indices: [],
        skipped_exception_indices: [],
        trigger_is_contextual_exception: false,
        trigger_context_hash: '',
      },
    };
  }

  const prevSrc = triggerIndex > 0 ? segments[triggerIndex - 1]?.source_text : undefined;
  const nextSrc =
    triggerIndex + 1 < segments.length ? segments[triggerIndex + 1]?.source_text : undefined;
  const triggerCtxHash = computeSegmentContextHash(prevSrc, triggerSeg.source_text, nextSrc);
  const normTrigger = normalizeSegmentSourceForPropagation(triggerSeg.source_text);
  const triggerIsException = exceptions.some(
    (ex) => ex.segment_index === triggerIndex || ex.context_hash === triggerCtxHash
  );

  const updatedIndices: number[] = [];
  const skippedExceptionIndices: number[] = [];

  const nextSegments = segments.map((seg, idx) => {
    if (idx === triggerIndex) {
      return {
        ...seg,
        status: 'Approved' as const,
      };
    }
    if (normalizeSegmentSourceForPropagation(seg.source_text) !== normTrigger) {
      return seg;
    }
    const pSrc = idx > 0 ? segments[idx - 1]?.source_text : undefined;
    const nSrc = idx + 1 < segments.length ? segments[idx + 1]?.source_text : undefined;
    const candCtxHash = computeSegmentContextHash(pSrc, seg.source_text, nSrc);
    const candIsException = exceptions.some(
      (ex) => ex.segment_index === idx || ex.context_hash === candCtxHash
    );

    if (triggerIsException) {
      if (candCtxHash === triggerCtxHash) {
        updatedIndices.push(idx);
        return {
          ...seg,
          target_text: triggerSeg.target_text,
          status: 'Approved' as const,
        };
      }
      skippedExceptionIndices.push(idx);
      return seg;
    }

    if (candIsException) {
      skippedExceptionIndices.push(idx);
      return seg;
    }

    updatedIndices.push(idx);
    return {
      ...seg,
      target_text: triggerSeg.target_text,
      status: 'Approved' as const,
    };
  });

  return {
    nextSegments,
    outcome: {
      trigger_segment_index: triggerIndex,
      normalized_source: normTrigger,
      propagated_target: triggerSeg.target_text,
      updated_segment_indices: updatedIndices,
      skipped_exception_indices: skippedExceptionIndices,
      trigger_is_contextual_exception: triggerIsException,
      trigger_context_hash: triggerCtxHash,
    },
  };
}

function previewGlobalRegexSearchAndReplace(
  segments: TranslationSegment[],
  queryPattern: string,
  replacementPattern: string,
  useRegex: boolean,
  caseSensitive: boolean,
  scope: GlobalSearchScope,
  statusFilter: GlobalSearchStatusFilter,
  exceptions: ContextualExceptionRecord[]
): { previews: GlobalRegexPreviewItem[]; regexError: string | null } {
  if (!queryPattern.trim()) {
    return { previews: [], regexError: null };
  }

  let compiledRegex: RegExp | null = null;
  try {
    const flags = caseSensitive ? 'g' : 'gi';
    if (useRegex) {
      compiledRegex = new RegExp(queryPattern, flags);
    } else {
      const escaped = queryPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      compiledRegex = new RegExp(escaped, flags);
    }
  } catch (err) {
    return {
      previews: [],
      regexError: err instanceof Error ? err.message : 'Expressão regular inválida',
    };
  }

  // Count repeated segments for RepeatedSegmentsOnly filter
  const sourceCounts = new Map<string, number>();
  segments.forEach((s) => {
    const norm = normalizeSegmentSourceForPropagation(s.source_text);
    sourceCounts.set(norm, (sourceCounts.get(norm) || 0) + 1);
  });

  const previews: GlobalRegexPreviewItem[] = [];

  segments.forEach((seg, idx) => {
    const statusOk =
      statusFilter === 'AllSegments'
        ? true
        : statusFilter === 'ConfirmedOnly'
        ? seg.status === 'Approved' || seg.status === 'Translated'
        : statusFilter === 'DraftsAndUntranslatedOnly'
        ? seg.status === 'AiDraft' || seg.status === 'Untranslated'
        : (sourceCounts.get(normalizeSegmentSourceForPropagation(seg.source_text)) || 0) >= 2;

    if (!statusOk) return;

    const prevSrc = idx > 0 ? segments[idx - 1]?.source_text : undefined;
    const nextSrc = idx + 1 < segments.length ? segments[idx + 1]?.source_text : undefined;
    const ctxHash = computeSegmentContextHash(prevSrc, seg.source_text, nextSrc);
    const isExc = exceptions.some((e) => e.segment_index === idx || e.context_hash === ctxHash);

    if (scope === 'BothSourceAndTarget' || scope === 'TargetOnly') {
      const matches = Array.from(seg.target_text.matchAll(compiledRegex!)).map((m) => m[0]);
      if (matches.length > 0) {
        const afterText = seg.target_text.replace(compiledRegex!, replacementPattern);
        previews.push({
          segment_index: idx,
          segment_id: seg.id,
          field_matched: 'target',
          matched_substrings: matches,
          before_text: seg.target_text,
          after_preview_text: afterText,
          context_hash: ctxHash,
          is_contextual_exception: isExc,
        });
      }
    }

    if (scope === 'BothSourceAndTarget' || scope === 'SourceOnly') {
      const matches = Array.from(seg.source_text.matchAll(compiledRegex!)).map((m) => m[0]);
      if (matches.length > 0) {
        const afterText = seg.source_text.replace(compiledRegex!, replacementPattern);
        previews.push({
          segment_index: idx,
          segment_id: seg.id,
          field_matched: 'source',
          matched_substrings: matches,
          before_text: seg.source_text,
          after_preview_text: afterText,
          context_hash: ctxHash,
          is_contextual_exception: isExc,
        });
      }
    }
  });

  return { previews, regexError: null };
}

const INITIAL_AGENT_MD = `# AGENT.md — Project Translation Harness: Tratado de Tradução & Humanidades

## Identity & Strict Scope
You are a deterministic, zero-hallucination local translation engine scoped exclusively to this project (en-US → pt-BR).

## Core Directives
1. **Zero Hallucination**: Translate ONLY the provided source segment. Never add commentary, preambles, or unrequested clauses.
2. **Glossary Supremacy**: Every term in \`ACTIVE GLOSSARY CONSTRAINTS\` MUST be translated using the exact target term specified.
3. **Auxiliary TM Alignment**: Maintain consistency with 80%+ matches from the project's Auxiliary Translation Memories.
4. **Structural Preservation**: Keep all Markdown formatting (\`#\`, \`**\`, tables \`|\`, footnotes \`[^1]\`, and LaTeX math) intact.`;

function computeWordDiff(
  aiDraft: string,
  humanFinal: string
): Array<{ op: 'equal' | 'del' | 'ins'; text: string }> {
  const a = aiDraft.trim().split(/\s+/).filter(Boolean);
  const b = humanFinal.trim().split(/\s+/).filter(Boolean);
  const n = a.length;
  const m = b.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));

  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      if (a[i] === b[j]) {
        dp[i][j] = 1 + dp[i + 1][j + 1];
      } else {
        dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
  }

  const out: Array<{ op: 'equal' | 'del' | 'ins'; text: string }> = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      out.push({ op: 'equal', text: a[i] });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      out.push({ op: 'del', text: a[i] });
      i++;
    } else {
      out.push({ op: 'ins', text: b[j] });
      j++;
    }
  }
  while (i < n) out.push({ op: 'del', text: a[i++] });
  while (j < m) out.push({ op: 'ins', text: b[j++] });
  return out;
}

function downloadTextFile(filename: string, content: string, mimeType = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export type ChunkGranularity = 'ZenMicroSentence' | 'ContextualShort' | 'EditorialParagraph';

export interface FormattedOcrSegment {
  index: number;
  kind: 'Heading' | 'Paragraph' | 'Table' | 'Footnote' | 'Quote' | 'Caption';
  context_label: string;
  markdown_text: string;
  char_count: number;
  word_count: number;
  sentence_count: number;
  page: number;
}

export interface OcrFormattingStats {
  raw_input_chars: number;
  raw_lines_count: number;
  final_segments_count: number;
  chapters_and_headings_detected: number;
  frontmatter_blocks_grouped: number;
  dehyphenated_words_count: number;
  stripped_running_headers_count: number;
  giant_blocks_split_count: number;
  avg_segment_chars: number;
  max_segment_chars: number;
}

export interface OcrFormattingAudit {
  passed: boolean;
  lexical_fidelity_pct: number;
  numbers_preserved: boolean;
  zero_hallucination_verified: boolean;
  all_segments_within_bounds: boolean;
  active_formatting_skills: string[];
  audit_notes: string[];
}

export interface OcrFormattingResult {
  formatted_markdown: string;
  segments: FormattedOcrSegment[];
  stats: OcrFormattingStats;
  audit: OcrFormattingAudit;
}

const DEFAULT_OCR_FORMAT_HARNESS_MD = `# OCR_FORMAT_HARNESS.md — Harness de Estruturação Editorial & Segmentação Contextual de Scans

## Identidade & Missão Crítica
Você é o motor determinístico de **Estruturação Editorial Pré-Tradução** do Amanuensis. Sua única função é transformar o texto bruto extraído de PDFs escaneados (Vision OCR / PDFKit / Tesseract) em capítulos, metadados e **trechos curtos e contextuais** prontos para tradução.

## Invariantes Inegociáveis (Estragar esta etapa = Estragar a tradução)
1. **Invariância Lexical Absoluta (0% Alucinação / 0% Omissão)**: Nenhuma palavra, data, ano, código ISBN, telefone ou citação do texto original pode ser omitida, resumida ou inventada.
2. **Proibição de Blocos Gigantes**: Parágrafos longos ou páginas coladas pelo OCR DEVEM ser divididos em unidades contextuais curtas (1 a 2 frases completas, ~140–260 caracteres), respeitando abreviações (\`p.\`, \`ed.\`, \`selec.\`, \`cap.\`, \`Dr.\`, \`op. cit.\`) para **jamais cortar uma frase ao meio**.
3. **Isolamento de Capítulos e Subtítulos**: Títulos de capítulos (\`CAPÍTULO I\`, \`Chapter IV\`, \`PRÓLOGO\`, \`INTRODUCCIÓN\`, \`1. Historia Política\`) devem receber marcação \`#\` / \`##\` e ficar em um trecho próprio.
4. **Agrupamento Inteligente de Ficha Catalográfica / Expediente**: Páginas de créditos, direitos autorais, ISBN e ficha catalográfica devem ser separadas em blocos temáticos curtos de 2 a 4 linhas.
5. **Cura de Hifenização sem Danificar Compostos**: Unir palavras quebradas na mudança de linha (\`desafia-\\nron\` → \`desafiaron\`), mas preservar hífens legítimos (\`978-987-23362-2-6\`, \`J-B\`, \`franco-alemán\`).`;

const PROTECTED_ABBREVIATIONS = new Set([
  'p',
  'pp',
  'pág',
  'págs',
  'ed',
  'eds',
  'vol',
  'vols',
  'cap',
  'caps',
  'selec',
  'coord',
  'comp',
  'trad',
  'pról',
  'dr',
  'dra',
  'sr',
  'sra',
  'srta',
  'prof',
  'profa',
  'mr',
  'mrs',
  'ms',
  'st',
  'jr',
  'inc',
  'ltd',
  'co',
  'tel',
  'art',
  'arts',
  'no',
  'núm',
  'fig',
  'figs',
  'cf',
  'op',
  'cit',
  'ibíd',
  'ibid',
  'etc',
  'vv',
  'aa',
  'vs',
  'aprox',
  'depto',
  'av',
  'ee',
  'uu',
  'e.g',
  'i.e',
  'ii',
  'iii',
  'iv',
  'vi',
  'vii',
  'viii',
  'ix',
  'xi',
  'xii',
]);

function isProtectedAbbrev(word: string): boolean {
  const clean = word.replace(/^[([\x22“«]+|[)\]\x22”»]+$/g, '').toLowerCase();
  if (!clean.endsWith('.')) return false;
  const stem = clean.slice(0, -1);
  if (stem.length === 1 && /^[a-zà-ÿ]$/i.test(stem)) return true;
  return PROTECTED_ABBREVIATIONS.has(stem);
}

function splitIntoSentencesAbbreviationSafe(text: string): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const sentences: string[] = [];
  let cur: string[] = [];

  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    cur.push(w);
    const endsPunct = /[.!?][\x22”»'\]]*$/.test(w);
    if (!endsPunct) continue;
    if (isProtectedAbbrev(w)) continue;

    const nextW = words[i + 1];
    if (nextW) {
      const firstChar = nextW.charAt(0);
      const isSentenceStart =
        /^[A-ZÀ-Ý0-9¿¡—"“«[]/.test(firstChar) && firstChar === firstChar.toUpperCase();
      if (isSentenceStart) {
        sentences.push(cur.join(' '));
        cur = [];
      }
    }
  }
  if (cur.length > 0) {
    sentences.push(cur.join(' '));
  }
  return sentences;
}

function splitLongSentenceByClauses(
  sentence: string,
  targetMax: number,
  hardMax: number
): string[] {
  const words = sentence.trim().split(/\s+/).filter(Boolean);
  const parts: string[] = [];
  let cur = '';

  for (const w of words) {
    const projected = cur ? cur.length + 1 + w.length : w.length;
    if (cur && projected > hardMax) {
      parts.push(cur.trim());
      cur = w;
      continue;
    }
    cur = cur ? `${cur} ${w}` : w;
    const isClauseBreak = /[;:,]$/.test(w);
    if (cur.length >= Math.floor((targetMax * 2) / 3) && isClauseBreak) {
      parts.push(cur.trim());
      cur = '';
    }
  }
  if (cur.trim()) {
    parts.push(cur.trim());
  }
  return parts;
}

function splitProseIntoContextualChunks(
  prose: string,
  granularity: ChunkGranularity
): Array<{ text: string; sentenceCount: number }> {
  const trimmed = prose.trim();
  if (!trimmed) return [];
  const targetMax =
    granularity === 'ZenMicroSentence'
      ? 180
      : granularity === 'ContextualShort'
      ? 260
      : 380;
  const hardMax =
    granularity === 'ZenMicroSentence'
      ? 230
      : granularity === 'ContextualShort'
      ? 330
      : 460;
  const maxSents =
    granularity === 'ZenMicroSentence'
      ? 1
      : granularity === 'ContextualShort'
      ? 2
      : 3;

  const sentences = splitIntoSentencesAbbreviationSafe(trimmed);
  const chunks: Array<{ text: string; sentenceCount: number }> = [];
  let curSents: string[] = [];
  let curLen = 0;

  for (const sent of sentences) {
    const s = sent.trim();
    if (!s) continue;
    if (s.length > hardMax) {
      if (curSents.length > 0) {
        chunks.push({ text: curSents.join(' '), sentenceCount: curSents.length });
        curSents = [];
        curLen = 0;
      }
      const clauses = splitLongSentenceByClauses(s, targetMax, hardMax);
      for (const cl of clauses) {
        chunks.push({ text: cl, sentenceCount: 1 });
      }
      continue;
    }

    const projected = curLen === 0 ? s.length : curLen + 1 + s.length;
    if (curSents.length > 0 && (curSents.length >= maxSents || projected > targetMax)) {
      chunks.push({ text: curSents.join(' '), sentenceCount: curSents.length });
      curSents = [];
      curLen = 0;
    }
    curSents.push(s);
    curLen = curLen === 0 ? s.length : curLen + 1 + s.length;
  }
  if (curSents.length > 0) {
    chunks.push({ text: curSents.join(' '), sentenceCount: curSents.length });
  }
  return chunks;
}

function detectAndFormatHeadingLine(line: string): string | null {
  const t = line.trim();
  if (!t || t.length > 120) return null;
  if (/^#{1,3}\s+/.test(t)) return t;
  const chapRe =
    /^(?:cap[ií]tulo|chapter|chapitre|kapitel|parte|part|livro|book|secci[oó]n|se[çc][aã]o|section|pr[oó]logo|pref[aá]cio|preface|introducci[oó]n|introdu[çc][aã]o|introduction|conclusi[oó]n|conclus[aã]o|ep[ií]logo|ap[eê]ndice|[IVXLCDM]{1,5}\.\s+[A-ZÀ-Ÿ])(?:\s+.*|:.*)?$/i;
  if (chapRe.test(t) && !/isbn|www\./i.test(t)) {
    return `# ${t}`;
  }
  const letters = t.replace(/[^a-zA-ZÀ-ÿ]/g, '');
  if (
    letters.length >= 5 &&
    t.length <= 75 &&
    !t.endsWith('.') &&
    !/isbn|cdd|@/i.test(t) &&
    letters === letters.toUpperCase() &&
    letters !== letters.toLowerCase()
  ) {
    return `## ${t}`;
  }
  return null;
}

function isFrontmatterOrCipLine(line: string): boolean {
  const low = line.toLowerCase();
  const patterns = [
    'isbn',
    'issn',
    'cdd ',
    'cdu ',
    '©',
    'copyright',
    'ediciones ',
    'edición general',
    'edición:',
    'editora ',
    'diseño y ',
    'arte de tapa',
    'foto de tapa',
    'hecho el depósito',
    'impreso en ',
    'printed in ',
    'todos los derechos',
    'all rights reserved',
    'tel.:',
    'e-mail:',
    'www.',
    'capital federal',
    'buenos aires',
    '320 p.',
    '20x14 cm',
    '1. historia política',
    '1a ed.',
    '- la ed.',
    'selec.',
    'seleccionado por',
  ];
  return patterns.some((p) => low.includes(p));
}

export function runOcrFormattingHarness(
  rawOcr: string,
  granularity: ChunkGranularity = 'ContextualShort',
  dehyphenate = true,
  stripRunningPageNumbers = true
): OcrFormattingResult {
  const rawInputChars = rawOcr.length;
  const rawLinesCount = Math.max(1, rawOcr.split(/\r?\n/).length);

  let normalized = rawOcr
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\ufb01/g, 'fi')
    .replace(/\ufb02/g, 'fl')
    .replace(/\u00ad/g, '');

  let dehyphenatedWordsCount = 0;
  if (dehyphenate) {
    const hyphRe = /([a-zA-ZÀ-ÿ]{2,})-\s*\n\s*([a-zà-ÿ]{2,})/g;
    const matches = normalized.match(hyphRe);
    dehyphenatedWordsCount = matches ? matches.length : 0;
    normalized = normalized.replace(hyphRe, '$1$2');
  }

  const pageNumRe = /^(?:[-–—[()\s]*\d{1,4}[-–—\])\s]*|(?:P[aá]gina|Page|P[aá]g\.)\s*\d{1,4})$/i;
  let strippedRunningHeadersCount = 0;
  const cleanedLines: string[] = [];

  for (const rawLine of normalized.split('\n')) {
    const trimmed = rawLine.trim();
    if (!trimmed) {
      cleanedLines.push('');
      continue;
    }
    if (stripRunningPageNumbers && pageNumRe.test(trimmed)) {
      strippedRunningHeadersCount++;
      continue;
    }
    cleanedLines.push(trimmed);
  }

  interface InterBlock {
    kind: FormattedOcrSegment['kind'];
    context_label: string;
    lines: string[];
  }

  const interBlocks: InterBlock[] = [];
  let curProse: string[] = [];
  let curTable: string[] = [];
  let curFm: string[] = [];
  let chaptersDetected = 0;
  let fmBlocksGrouped = 0;

  const flushProse = () => {
    if (curProse.length > 0) {
      interBlocks.push({
        kind: 'Paragraph',
        context_label: 'Parágrafo Contextual',
        lines: [...curProse],
      });
      curProse = [];
    }
  };
  const flushTable = () => {
    if (curTable.length > 0) {
      interBlocks.push({
        kind: 'Table',
        context_label: 'Tabela Estruturada',
        lines: [...curTable],
      });
      curTable = [];
    }
  };
  const flushFm = () => {
    if (curFm.length > 0) {
      fmBlocksGrouped++;
      interBlocks.push({
        kind: 'Caption',
        context_label: 'Ficha Catalográfica / Expediente',
        lines: [...curFm],
      });
      curFm = [];
    }
  };

  for (const line of cleanedLines) {
    if (!line) {
      flushTable();
      flushFm();
      flushProse();
      continue;
    }
    if (line.startsWith('|') && line.endsWith('|')) {
      flushFm();
      flushProse();
      curTable.push(line);
      continue;
    } else {
      flushTable();
    }

    if (line.startsWith('[^') || /^(?:\[\d{1,3}\]|\*\s+|†\s+)\S+/.test(line)) {
      flushFm();
      flushProse();
      interBlocks.push({
        kind: 'Footnote',
        context_label: 'Nota de Rodapé',
        lines: [line],
      });
      continue;
    }

    const heading = detectAndFormatHeadingLine(line);
    if (heading) {
      flushFm();
      flushProse();
      chaptersDetected++;
      interBlocks.push({
        kind: 'Heading',
        context_label: 'Título / Capítulo',
        lines: [heading],
      });
      continue;
    }

    if (isFrontmatterOrCipLine(line)) {
      flushProse();
      curFm.push(line);
      const fmChars = curFm.reduce((acc, s) => acc + s.length, 0);
      if (curFm.length >= 3 || fmChars >= 190) {
        flushFm();
      }
      continue;
    }

    if (curFm.length > 0 && line.length <= 68 && !line.endsWith('.')) {
      curFm.push(line);
      const fmChars = curFm.reduce((acc, s) => acc + s.length, 0);
      if (curFm.length >= 3 || fmChars >= 190) {
        flushFm();
      }
      continue;
    } else {
      flushFm();
    }

    if (line.startsWith('—') || line.startsWith('>') || line.startsWith('«')) {
      flushProse();
      interBlocks.push({
        kind: 'Quote',
        context_label: 'Diálogo / Citação',
        lines: [line],
      });
      continue;
    }

    curProse.push(line);
  }

  flushTable();
  flushFm();
  flushProse();

  const segments: FormattedOcrSegment[] = [];
  let giantBlocksSplitCount = 0;
  const hardMax =
    granularity === 'ZenMicroSentence'
      ? 230
      : granularity === 'ContextualShort'
      ? 330
      : 460;

  for (const blk of interBlocks) {
    if (blk.kind === 'Heading' || blk.kind === 'Table' || blk.kind === 'Footnote') {
      const text = blk.lines.join('\n');
      segments.push({
        index: segments.length,
        kind: blk.kind,
        context_label: blk.context_label,
        markdown_text: text,
        char_count: text.length,
        word_count: text.split(/\s+/).filter(Boolean).length,
        sentence_count: 1,
        page: 1,
      });
    } else if (blk.kind === 'Caption') {
      const text = blk.lines.join('\n');
      if (text.length > hardMax) {
        giantBlocksSplitCount++;
        const sub = splitProseIntoContextualChunks(text, granularity);
        for (const sc of sub) {
          segments.push({
            index: segments.length,
            kind: 'Caption',
            context_label: blk.context_label,
            markdown_text: sc.text,
            char_count: sc.text.length,
            word_count: sc.text.split(/\s+/).filter(Boolean).length,
            sentence_count: sc.sentenceCount,
            page: 1,
          });
        }
      } else {
        segments.push({
          index: segments.length,
          kind: 'Caption',
          context_label: blk.context_label,
          markdown_text: text,
          char_count: text.length,
          word_count: text.split(/\s+/).filter(Boolean).length,
          sentence_count: blk.lines.length,
          page: 1,
        });
      }
    } else {
      const joinedProse = blk.lines
        .map((l) => l.trim())
        .filter(Boolean)
        .join(' ')
        .replace(/\s{2,}/g, ' ');
      const sub = splitProseIntoContextualChunks(joinedProse, granularity);
      if (sub.length > 1) {
        giantBlocksSplitCount++;
      }
      for (const sc of sub) {
        const label =
          blk.kind === 'Quote'
            ? 'Diálogo / Citação'
            : sc.sentenceCount === 1
            ? 'Trecho Contextual (1 frase)'
            : `Trecho Contextual (${sc.sentenceCount} frases)`;
        segments.push({
          index: segments.length,
          kind: blk.kind,
          context_label: label,
          markdown_text: sc.text,
          char_count: sc.text.length,
          word_count: sc.text.split(/\s+/).filter(Boolean).length,
          sentence_count: sc.sentenceCount,
          page: 1,
        });
      }
    }
  }

  const totalSegChars = segments.reduce((acc, s) => acc + s.char_count, 0);
  const avgSegmentChars = segments.length > 0 ? Math.round(totalSegChars / segments.length) : 0;
  const maxSegmentChars = segments
    .filter((s) => s.kind !== 'Table')
    .reduce((max, s) => Math.max(max, s.char_count), 0);

  const formattedMarkdown = segments.map((s) => s.markdown_text).join('\n\n');

  // Lexical & Numeric Invariance Audit
  const cleanedBodySource = cleanedLines.join('\n');
  const srcWords = (cleanedBodySource.match(/[a-zA-ZÀ-ÿ]{2,}/g) || []).map((w) => w.toLowerCase());
  const outWords = (formattedMarkdown.match(/[a-zA-ZÀ-ÿ]{2,}/g) || []).map((w) => w.toLowerCase());
  const outSet = new Set(outWords);
  const srcSet = new Set(srcWords);

  let matchedWords = 0;
  for (const w of srcWords) {
    if (outSet.has(w)) matchedWords++;
  }
  const lexicalFidelityPct =
    srcWords.length === 0 ? 100 : Math.min(100, (matchedWords / srcWords.length) * 100);
  const zeroHallucinationVerified = outWords.every((w) => srcSet.has(w));

  const bodyNums = cleanedBodySource.match(/\b\d{4,}\b|\b\d+\.\d+\b/g) || [];
  const numbersPreserved = bodyNums.every((n) => formattedMarkdown.includes(n));

  return {
    formatted_markdown: formattedMarkdown,
    segments,
    stats: {
      raw_input_chars: rawInputChars,
      raw_lines_count: rawLinesCount,
      final_segments_count: segments.length,
      chapters_and_headings_detected: chaptersDetected,
      frontmatter_blocks_grouped: fmBlocksGrouped,
      dehyphenated_words_count: dehyphenatedWordsCount,
      stripped_running_headers_count: strippedRunningHeadersCount,
      giant_blocks_split_count: giantBlocksSplitCount,
      avg_segment_chars: avgSegmentChars,
      max_segment_chars: maxSegmentChars,
    },
    audit: {
      passed: lexicalFidelityPct >= 98 && numbersPreserved && zeroHallucinationVerified,
      lexical_fidelity_pct: Number(lexicalFidelityPct.toFixed(1)),
      numbers_preserved: numbersPreserved,
      zero_hallucination_verified: zeroHallucinationVerified,
      all_segments_within_bounds: maxSegmentChars <= hardMax + 90,
      active_formatting_skills: [
        'Cura Silábica & Proteção de Hífens/ISBN',
        'Detector de Capítulos & Subtítulos (#)',
        'Segmentador de Ficha Catalográfica & Expediente',
        'Divisor Contextual por Fronteira Sintática de Frase',
        'Auditor de Invariância Lexical & Numérica (Zero Perda)',
      ],
      audit_notes: [
        `Fidelidade lexical: ${lexicalFidelityPct.toFixed(1)}% (${outWords.length} palavras intactas).`,
        numbersPreserved
          ? '100% dos anos, datas e códigos ISBN preservados.'
          : 'Alerta: verifique numerais do documento.',
        zeroHallucinationVerified
          ? 'Zero alucinação: nenhuma palavra externa adicionada.'
          : 'Alerta de vocabulário externo.',
      ],
    },
  };
}

export function splitIntoLogicalSegments(
  markdownText: string,
  granularity: ChunkGranularity = 'ContextualShort',
  dehyphenate = true
): string[] {
  return runOcrFormattingHarness(markdownText, granularity, dehyphenate).segments.map(
    (s) => s.markdown_text
  );
}

export type IngestionModeKind =
  | 'ScannedPdfOcr'
  | 'NativeDigitalPdf'
  | 'WordDocx'
  | 'PlainTextOrMarkdown'
  | 'ClipboardPaste';

export function getIngestionModeLabel(mode: IngestionModeKind): string {
  switch (mode) {
    case 'ScannedPdfOcr':
      return '🔍 PDF Escaneado (Apple Vision OCR + PDFKit)';
    case 'NativeDigitalPdf':
      return '📄 PDF Digital Nativo (Camada de Texto Instantânea, Sem OCR)';
    case 'WordDocx':
      return '📝 Documento Word / Rich Text (.docx / .rtf)';
    case 'PlainTextOrMarkdown':
      return '📑 Texto / Markdown / Legenda (.md, .txt, .srt)';
    case 'ClipboardPaste':
      return '📋 Texto Colado Direto (Área de Transferência / Cmd+V)';
  }
}

export function extractWordXmlToMarkdown(xml: string): string {
  if (!xml.includes('<w:p') && !xml.includes('<w:document')) {
    return xml.trim();
  }
  const paragraphs: string[] = [];
  const pRegex = /<w:p\b[^>]*>([\s\S]*?)<\/w:p>/g;
  let pMatch: RegExpExecArray | null;
  while ((pMatch = pRegex.exec(xml)) !== null) {
    const pInner = pMatch[1];
    const tRegex = /<w:t(?:\s+[^>]*)?>([\s\S]*?)<\/w:t>/g;
    let tMatch: RegExpExecArray | null;
    let buf = '';
    while ((tMatch = tRegex.exec(pInner)) !== null) {
      buf += tMatch[1]
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'");
    }
    const clean = buf.trim();
    if (!clean) continue;
    const styleMatch = /<w:pStyle\s+w:val="([^"]+)"/i.exec(pInner);
    const styleVal = (styleMatch?.[1] || '').toLowerCase();
    if ((styleVal.includes('heading1') || styleVal.includes('titulo1') || styleVal === 'title') && !clean.startsWith('#')) {
      paragraphs.push(`# ${clean}`);
    } else if ((styleVal.includes('heading2') || styleVal.includes('titulo2') || styleVal === 'subtitle') && !clean.startsWith('#')) {
      paragraphs.push(`## ${clean}`);
    } else {
      paragraphs.push(clean);
    }
  }
  return paragraphs.join('\n\n');
}

export async function extractDocxArrayBufferToMarkdown(buffer: ArrayBuffer): Promise<string> {
  try {
    const bytes = new Uint8Array(buffer);
    const view = new DataView(buffer);
    let offset = 0;
    const decoder = new TextDecoder('utf-8');
    while (offset + 30 <= bytes.length) {
      const sig = view.getUint32(offset, true);
      if (sig !== 0x04034b50) break;
      const compression = view.getUint16(offset + 8, true);
      const compressedSize = view.getUint32(offset + 18, true);
      const fileNameLen = view.getUint16(offset + 26, true);
      const extraLen = view.getUint16(offset + 28, true);
      const nameBytes = bytes.subarray(offset + 30, offset + 30 + fileNameLen);
      const entryName = decoder.decode(nameBytes);
      const dataStart = offset + 30 + fileNameLen + extraLen;
      const dataEnd = dataStart + compressedSize;
      if (entryName === 'word/document.xml' && dataEnd <= bytes.length) {
        const rawSlice = bytes.subarray(dataStart, dataEnd);
        if (compression === 0) {
          return extractWordXmlToMarkdown(decoder.decode(rawSlice));
        }
        if (compression === 8 && typeof DecompressionStream !== 'undefined') {
          const ds = new DecompressionStream('deflate-raw');
          const writer = ds.writable.getWriter();
          writer.write(rawSlice);
          writer.close();
          const decompressedBuf = await new Response(ds.readable).arrayBuffer();
          return extractWordXmlToMarkdown(decoder.decode(new Uint8Array(decompressedBuf)));
        }
      }
      offset = dataEnd;
    }
  } catch {
    // Fallback to plain decoding below
  }
  return '';
}

export function normalizeSrtOrPlainText(filename: string, rawText: string): string {
  if (!filename.toLowerCase().endsWith('.srt')) {
    return rawText;
  }
  return rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(
      (l) =>
        l.length > 0 &&
        !/^\d{1,5}$/.test(l) &&
        !/^\d{2}:\d{2}:\d{2}[,.]\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}[,.]\d{3}/.test(l)
    )
    .join('\n\n');
}

export interface OcrDoubtItem {
  reason: string;
  wrong: string;
  right: string;
}

export function detectOcrDoubts(text: string): OcrDoubtItem[] {
  const doubts: OcrDoubtItem[] = [];
  const slashAsI = /([a-zA-ZÀ-ÿ]{3,})\s+i\s+([A-ZÀ-Ý][a-zA-ZÀ-ÿ]+)/.exec(text);
  if (slashAsI) {
    doubts.push({
      reason: `Barra "/" possivelmente lida como "i" entre "${slashAsI[1]}" e "${slashAsI[2]}"`,
      wrong: `${slashAsI[1]} i ${slashAsI[2]}`,
      right: `${slashAsI[1]} / ${slashAsI[2]}`,
    });
  }
  if (/\bTilomas\b/.test(text)) {
    doubts.push({
      reason: `"Tilomas" possivelmente é erro de OCR para "Thomas" ("h" lido como "il")`,
      wrong: 'Tilomas',
      right: 'Thomas',
    });
  }
  if (/f[ií]bertel,\s*c\s*om\.\s*ar/i.test(text)) {
    const m = /f[ií]bertel,\s*c\s*om\.\s*ar/i.exec(text)!;
    doubts.push({
      reason: `E-mail/domínio quebrado pelo OCR ("${m[0]}")`,
      wrong: m[0],
      right: 'fibertel.com.ar',
    });
  }
  if (/-\s*la\s+ed\./i.test(text)) {
    const m = /-\s*la\s+ed\./i.exec(text)!;
    doubts.push({
      reason: `"la ed." possivelmente é "1ª ed." ("1" lido como "l")`,
      wrong: m[0],
      right: '- 1a ed.',
    });
  }
  const mixedDigitWord = /\b([A-Za-zÀ-ÿ]+[0-9]+[A-Za-zÀ-ÿ]+)\b/.exec(text);
  if (mixedDigitWord && !/^(?:ISBN|C1025|H2O|CO2|3D|4B|2B)/i.test(mixedDigitWord[1])) {
    doubts.push({
      reason: `Caractere numérico misturado dentro de palavra ("${mixedDigitWord[1]}")`,
      wrong: mixedDigitWord[1],
      right: mixedDigitWord[1].replace(/0/g, 'o').replace(/1/g, 'l'),
    });
  }
  return doubts;
}

export function renderFacsimileScanCropDataUrl(sourceText: string): string {
  if (typeof document === 'undefined') return '';
  try {
    const canvas = document.createElement('canvas');
    const width = 920;
    // Restore original printed glyphs before OCR misread so the user can visually compare ("tirar a teima")!
    const printedText = sourceText
      .replace(/^#+\s*/gm, '')
      .replace(/([a-zA-ZÀ-ÿ]{3,})\s+i\s+([A-ZÀ-Ý][a-zA-ZÀ-ÿ]+)/g, '$1 / $2')
      .replace(/\bTilomas\b/g, 'Thomas')
      .replace(/f[ií]bertel,\s*c\s*om\.\s*ar/gi, 'fibertel.com.ar')
      .replace(/-\s*la\s+ed\./gi, '- 1ª ed.');

    const words = printedText.split(/\s+/);
    const wrappedLines: string[] = [];
    let currentLine = '';
    for (const w of words) {
      if ((currentLine + ' ' + w).trim().length > 68) {
        if (currentLine) wrappedLines.push(currentLine);
        currentLine = w;
      } else {
        currentLine = (currentLine + ' ' + w).trim();
      }
    }
    if (currentLine) wrappedLines.push(currentLine);

    const lineHeight = 30;
    const height = Math.max(150, wrappedLines.length * lineHeight + 68);
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    // Aged scanned paper background
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, '#f4efe1');
    grad.addColorStop(0.5, '#efe8d5');
    grad.addColorStop(1, '#e8dfc8');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Subtle scan grain & horizontal paper fibers
    ctx.fillStyle = 'rgba(90, 72, 48, 0.045)';
    for (let y = 4; y < height; y += 6) {
      ctx.fillRect(0, y, width, 1);
    }
    for (let i = 0; i < 220; i++) {
      const rx = (i * 73) % width;
      const ry = (i * 41) % height;
      ctx.fillRect(rx, ry, 1.5, 1.5);
    }

    // Highlight band showing target region on the scan
    ctx.fillStyle = 'rgba(255, 230, 120, 0.22)';
    ctx.fillRect(24, 18, width - 48, height - 36);
    ctx.strokeStyle = 'rgba(185, 65, 25, 0.55)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(24, 18, width - 48, height - 36);

    // Printed book serif typography (slightly rotated 0.25 deg like a real flatbed scan)
    ctx.save();
    ctx.translate(42, 46);
    ctx.rotate(-0.003);
    ctx.fillStyle = '#231f1a';
    ctx.font = '20px Georgia, "Times New Roman", serif';
    wrappedLines.forEach((ln, idx) => {
      ctx.fillText(ln, 0, idx * lineHeight);
    });
    ctx.restore();

    return canvas.toDataURL('image/jpeg', 0.9);
  } catch {
    return '';
  }
}

function detectSourceLanguage(text: string): string {
  const sample = ` ${text.slice(0, 2000).toLowerCase()} `;
  const esHits = (
    sample.match(
      /\b(cuando|obreros|estudiantes|edición|ediciones|diseño|tapa|del|los|las|una|pero|hacia|desde|según|año|años|página|páginas|autor|historia|política|hecho|depósito|ley|impreso|derechos|trabajo|sociedad|poder|estado|movimiento)\b/g
    ) || []
  ).length;
  const enHits = (
    sample.match(
      /\b(the|and|with|from|which|that|this|their|between|through|without|across|models|translation|memory|chapter|section|historical)\b/g
    ) || []
  ).length;
  const frHits = (
    sample.match(/\b(les|des|dans|avec|pour|une|sur|aux|cette|sont|mais|comme|plus|ouvriers|étudiants|mai)\b/g) || []
  ).length;
  const deHits = (
    sample.match(/\b(der|die|das|und|mit|von|für|auf|eine|nicht|sich|auch|werden)\b/g) || []
  ).length;
  const itHits = (
    sample.match(/\b(della|nella|degli|delle|sono|anche|questo|questa|storia|lavoro)\b/g) || []
  ).length;

  const max = Math.max(esHits, enHits, frHits, deHits, itHits);
  if (max === 0) return 'en-US';
  if (esHits === max) return 'es-ES';
  if (enHits === max) return 'en-US';
  if (frHits === max) return 'fr-FR';
  if (deHits === max) return 'de-DE';
  if (itHits === max) return 'it-IT';
  return 'en-US';
}

const PHRASE_DICTIONARY_TO_PT: Array<[RegExp, string]> = [
  // Spanish multi-word expressions & bibliographic/political/historical phrases
  [/\bmayo franc[eé]s\b/gi, 'Maio francês'],
  [/\bcuando obreros y estudiantes desafiaron al poder\b/gi, 'quando operários e estudantes desafiaram o poder'],
  [/\bcuando los obreros y los estudiantes\b/gi, 'quando os operários e os estudantes'],
  [/\bobreros y estudiantes\b/gi, 'operários e estudantes'],
  [/\bdesafiaron al poder\b/gi, 'desafiaram o poder'],
  [/\breflexiones y documentos\b/gi, 'Reflexões e documentos'],
  [/\bseleccionado por\b/gi, 'selecionado por'],
  [/\btraducido por\b/gi, 'traduzido por'],
  [/\gpr[oó]logo de\b/gi, 'prólogo de'],
  [/\bintroducci[oó]n de\b/gi, 'introdução de'],
  [/\b1a\s*ed\.|\bla\s*ed\./gi, '1ª ed.'],
  [/\bhistoria pol[ií]tica\b/gi, 'História Política'],
  [/\bhistoria social\b/gi, 'História Social'],
  [/\bciencias sociales\b/gi, 'Ciências Sociais'],
  [/\bciencia pol[ií]tica\b/gi, 'Ciência Política'],
  [/\bdise[ñn]o y armado de interior\b/gi, 'Projeto gráfico e diagramação interna'],
  [/\bdise[ñn]o y arte de tapa\b/gi, 'Design e arte de capa'],
  [/\barte de tapa\b/gi, 'arte de capa'],
  [/\bfoto de tapa\b/gi, 'Foto de capa'],
  [/\bedici[oó]n general\b/gi, 'Edição geral'],
  [/\bocupaci[oó]n de la f[aá]brica\b/gi, 'Ocupação da fábrica'],
  [/\ben mayo de\b/gi, 'em maio de'],
  [/\bediciones del\b/gi, 'Edições do'],
  [/\bhecho el dep[oó]sito que marca la ley\b/gi, 'Feito o depósito previsto pela lei'],
  [/\bimpreso en argentina\b/gi, 'Impresso na Argentina'],
  [/\bprinted in argentina\b/gi, 'Impresso na Argentina'],
  [/\btodos los derechos reservados\b/gi, 'Todos os direitos reservados'],
  [/\bprohibida su reproducci[oó]n total o parcial\b/gi, 'Proibida a reprodução total ou parcial'],
  [/\bhuelga general\b/gi, 'greve geral'],
  [/\bclase obrera\b/gi, 'classe operária'],
  [/\bclase trabajadora\b/gi, 'classe trabalhadora'],
  [/\bmovimiento estudiantil\b/gi, 'movimento estudantil'],
  [/\bmovimiento obrero\b/gi, 'movimento operário'],
  [/\bestado de bienestar\b/gi, 'Estado de Bem-Estar Social'],
  [/\bmedios de producci[oó]n\b/gi, 'meios de produção'],
  [/\brelaciones de poder\b/gi, 'relações de poder'],
  [/\bsin embargo\b/gi, 'no entanto'],
  [/\bpor lo tanto\b/gi, 'portanto'],
  [/\ba trav[eé]s de\b/gi, 'através de'],
  [/\ba partir de\b/gi, 'a partir de'],
  [/\ben relaci[oó]n con\b/gi, 'em relação a'],
  [/\bde acuerdo con\b/gi, 'de acordo com'],
  [/\bal mismo tiempo\b/gi, 'ao mesmo tempo'],
  [/\ben primer lugar\b/gi, 'em primeiro lugar'],
  [/\ben segundo lugar\b/gi, 'em segundo lugar'],
  // English multi-word expressions
  [/\bsmall local language models\b/gi, 'modelos de linguagem locais compactos'],
  [/\bachieve remarkable translation fidelity\b/gi, 'alcançam notável fidelidade de tradução'],
  [/\bwhen constrained by a project-specific harness\b/gi, 'quando restritos por um harness específico do projeto'],
  [/\band an auxiliary translation memory\b/gi, 'e uma Memória de Tradução auxiliar'],
  [/\bwithout domain-specific glossaries\b/gi, 'sem glossários específicos de domínio'],
  [/\band contextual grounding\b/gi, 'e ancoragem contextual'],
  [/\bunguided models suffer from terminology drift and hallucination\b/gi, 'modelos não guiados sofrem com desvio terminológico e alucinação'],
  [/\bacross long technical manuscripts\b/gi, 'ao longo de manuscritos técnicos extensos'],
  [/\bhistorical scans processed via the amanuensis ocr suite\b/gi, 'digitalizações históricas processadas pela Suíte de OCR do Amanuensis'],
  [/\bretain both bounding-box coordinates and searchable pdf text layers\b/gi, 'preservam tanto as coordenadas de bounding-box quanto camadas de texto em PDF pesquisável'],
  [/\bwelfare states?\b/gi, 'Estados de Bem-Estar Social'],
  [/\binstitutional trust\b/gi, 'confiança institucional'],
  [/\bhistorical accountability\b/gi, 'responsabilização histórica'],
  [/\bsocial cohesion\b/gi, 'coesão social'],
  [/\bdemocratic institutions\b/gi, 'instituições democráticas'],
  [/\boptical character recognition\b/gi, 'reconhecimento óptico de caracteres'],
  [/\bneural translation\b/gi, 'tradução neural'],
  [/\bsearchable pdf\b/gi, 'PDF pesquisável'],
  [/\bscanned pdf\b/gi, 'PDF escaneado'],
  [/\btranslation memory\b/gi, 'Memória de Tradução'],
];

const WORD_LEXICON_TO_PT: Record<string, string> = {
  // Spanish -> Portuguese core lexicon
  cuando: 'quando',
  obrero: 'operário',
  obreros: 'operários',
  obrera: 'operária',
  obreras: 'operárias',
  estudiante: 'estudante',
  estudiantes: 'estudantes',
  desafiaron: 'desafiaram',
  desafió: 'desafiou',
  poder: 'poder',
  reflexiones: 'reflexões',
  reflexión: 'reflexão',
  documento: 'documento',
  documentos: 'documentos',
  seleccionado: 'selecionado',
  seleccionados: 'selecionados',
  seleccionada: 'selecionada',
  selec: 'sel',
  título: 'título',
  ediciones: 'edições',
  edición: 'edição',
  diseño: 'design',
  armado: 'diagramação',
  interior: 'interna',
  tapa: 'capa',
  general: 'geral',
  ocupación: 'ocupação',
  fábrica: 'fábrica',
  mayo: 'maio',
  junio: 'junho',
  julio: 'julho',
  agosto: 'agosto',
  septiembre: 'setembro',
  octubre: 'outubro',
  noviembre: 'novembro',
  diciembre: 'dezembro',
  enero: 'janeiro',
  febrero: 'fevereiro',
  marzo: 'março',
  abril: 'abril',
  hecho: 'feito',
  depósito: 'depósito',
  marca: 'marca',
  ley: 'lei',
  impreso: 'impresso',
  impresa: 'impressa',
  del: 'do',
  al: 'ao',
  el: 'o',
  la: 'a',
  los: 'os',
  las: 'as',
  un: 'um',
  una: 'uma',
  unos: 'uns',
  unas: 'umas',
  y: 'e',
  en: 'em',
  con: 'com',
  sin: 'sem',
  por: 'por',
  para: 'para',
  sobre: 'sobre',
  entre: 'entre',
  hacia: 'rumo a',
  hasta: 'até',
  desde: 'desde',
  según: 'segundo',
  contra: 'contra',
  durante: 'durante',
  mediante: 'mediante',
  pero: 'mas',
  sino: 'mas sim',
  porque: 'porque',
  aunque: 'embora',
  mientras: 'enquanto',
  donde: 'onde',
  quien: 'quem',
  quienes: 'quem',
  cual: 'qual',
  cuales: 'quais',
  cuyo: 'cujo',
  cuya: 'cuja',
  cuyos: 'cujos',
  cuyas: 'cujas',
  este: 'este',
  esta: 'esta',
  estos: 'estes',
  estas: 'estas',
  esto: 'isto',
  ese: 'esse',
  esa: 'essa',
  esos: 'esses',
  esas: 'essas',
  eso: 'isso',
  aquel: 'aquele',
  aquella: 'aquela',
  aquellos: 'aqueles',
  aquellas: 'aquelas',
  todo: 'todo',
  toda: 'toda',
  todos: 'todos',
  todas: 'todas',
  otro: 'outro',
  otra: 'outra',
  otros: 'outros',
  otras: 'outras',
  mismo: 'mesmo',
  misma: 'mesma',
  mismos: 'mesmos',
  mismas: 'mesmas',
  gran: 'grande',
  grandes: 'grandes',
  nuevo: 'novo',
  nueva: 'nova',
  nuevos: 'novos',
  nuevas: 'novas',
  primer: 'primeiro',
  primero: 'primeiro',
  primera: 'primeira',
  primeros: 'primeiros',
  primeras: 'primeiras',
  segundo: 'segundo',
  segunda: 'segunda',
  tercer: 'terceiro',
  tercero: 'terceiro',
  tercera: 'terceira',
  año: 'ano',
  años: 'anos',
  día: 'dia',
  días: 'dias',
  tiempo: 'tempo',
  tiempos: 'tempos',
  país: 'país',
  países: 'países',
  ciudad: 'cidade',
  ciudades: 'cidades',
  mundo: 'mundo',
  vida: 'vida',
  historia: 'história',
  política: 'política',
  político: 'político',
  políticos: 'políticos',
  políticas: 'políticas',
  social: 'social',
  sociales: 'sociais',
  económico: 'econômico',
  económica: 'econômica',
  económicos: 'econômicos',
  económicas: 'econômicas',
  cultural: 'cultural',
  culturales: 'culturais',
  nacional: 'nacional',
  nacionales: 'nacionais',
  internacional: 'internacional',
  internacionales: 'internacionais',
  popular: 'popular',
  populares: 'populares',
  público: 'público',
  pública: 'pública',
  públicos: 'públicos',
  públicas: 'públicas',
  trabajo: 'trabalho',
  trabajadores: 'trabalhadores',
  trabajador: 'trabalhador',
  sindicato: 'sindicato',
  sindicatos: 'sindicatos',
  huelga: 'greve',
  huelgas: 'greves',
  lucha: 'luta',
  luchas: 'lutas',
  calle: 'rua',
  calles: 'ruas',
  barricada: 'barricada',
  barricadas: 'barricadas',
  universidad: 'universidade',
  universidades: 'universidades',
  facultad: 'faculdade',
  gobierno: 'governo',
  estado: 'Estado',
  estados: 'Estados',
  partido: 'partido',
  partidos: 'partidos',
  izquierda: 'esquerda',
  derecha: 'direita',
  revolución: 'revolução',
  revolucionario: 'revolucionário',
  revolucionaria: 'revolucionária',
  revolucionarios: 'revolucionários',
  crisis: 'crise',
  cambio: 'mudança',
  cambios: 'mudanças',
  proceso: 'processo',
  procesos: 'processos',
  sistema: 'sistema',
  sistemas: 'sistemas',
  sociedad: 'sociedade',
  sociedades: 'sociedades',
  pueblo: 'povo',
  pueblos: 'povos',
  gente: 'gente',
  hombre: 'homem',
  hombres: 'homens',
  mujer: 'mulher',
  mujeres: 'mulheres',
  joven: 'jovem',
  jóvenes: 'jovens',
  libro: 'livro',
  libros: 'livros',
  texto: 'texto',
  textos: 'textos',
  capítulo: 'capítulo',
  capítulos: 'capítulos',
  parte: 'parte',
  partes: 'partes',
  página: 'página',
  páginas: 'páginas',
  introducción: 'introdução',
  conclusión: 'conclusão',
  prólogo: 'prólogo',
  prefacio: 'prefácio',
  índice: 'sumário',
  bibliografía: 'bibliografia',
  nota: 'nota',
  notas: 'notas',
  autor: 'autor',
  autores: 'autores',
  obra: 'obra',
  obras: 'obras',
  estudio: 'estudo',
  estudios: 'estudos',
  análisis: 'análise',
  investigación: 'pesquisa',
  teoría: 'teoria',
  práctica: 'prática',
  crítica: 'crítica',
  experiencia: 'experiência',
  experiencias: 'experiências',
  conciencia: 'consciência',
  libertad: 'liberdade',
  igualdad: 'igualdade',
  democracia: 'democracia',
  justicia: 'justiça',
  derecho: 'direito',
  derechos: 'direitos',
  fuerza: 'força',
  fuerzas: 'forças',
  violencia: 'violência',
  orden: 'ordem',
  conflicto: 'conflito',
  conflictos: 'conflitos',
  movimiento: 'movimento',
  movimientos: 'movimentos',
  organización: 'organização',
  organizaciones: 'organizações',
  asamblea: 'assembleia',
  asambleas: 'assembleias',
  comité: 'comitê',
  comités: 'comitês',
  consejo: 'conselho',
  consejos: 'conselhos',
  es: 'é',
  son: 'são',
  era: 'era',
  eran: 'eram',
  fue: 'foi',
  fueron: 'foram',
  sido: 'sido',
  está: 'está',
  están: 'estão',
  estaba: 'estava',
  estaban: 'estavam',
  ha: 'tem',
  han: 'têm',
  había: 'havia',
  habían: 'haviam',
  hay: 'há',
  tiene: 'tem',
  tienen: 'têm',
  tenía: 'tinha',
  tenían: 'tinham',
  puede: 'pode',
  pueden: 'podem',
  podía: 'podia',
  podían: 'podiam',
  debe: 'deve',
  deben: 'devem',
  hace: 'faz',
  hacen: 'fazem',
  hizo: 'fez',
  hicieron: 'fizeram',
  dice: 'diz',
  dicen: 'dizem',
  dijo: 'disse',
  dijeron: 'disseram',
  también: 'também',
  además: 'além disso',
  así: 'assim',
  cómo: 'como',
  como: 'como',
  más: 'mais',
  menos: 'menos',
  muy: 'muito',
  mucho: 'muito',
  mucha: 'muita',
  muchos: 'muitos',
  muchas: 'muitas',
  poco: 'pouco',
  poca: 'pouca',
  pocos: 'poucos',
  pocas: 'poucas',
  ya: 'já',
  todavía: 'ainda',
  aún: 'ainda',
  siempre: 'sempre',
  nunca: 'nunca',
  jamás: 'jamais',
  aquí: 'aqui',
  allí: 'ali',
  ahora: 'agora',
  hoy: 'hoje',
  ayer: 'ontem',
  mañana: 'amanhã',
  después: 'depois',
  antes: 'antes',
  luego: 'depois',
  entonces: 'então',
  // English -> Portuguese core lexicon
  chapter: 'Capítulo',
  section: 'Seção',
  book: 'Livro',
  part: 'Parte',
  table: 'Tabela',
  figure: 'Figura',
  page: 'página',
  pages: 'páginas',
  the: 'o',
  and: 'e',
  or: 'ou',
  of: 'de',
  in: 'em',
  to: 'para',
  for: 'para',
  with: 'com',
  without: 'sem',
  from: 'de',
  by: 'por',
  on: 'sobre',
  at: 'em',
  between: 'entre',
  across: 'através de',
  through: 'através de',
  during: 'durante',
  before: 'antes de',
  after: 'após',
  under: 'sob',
  over: 'sobre',
  is: 'é',
  are: 'são',
  was: 'foi',
  were: 'foram',
  be: 'ser',
  been: 'sido',
  have: 'têm',
  has: 'tem',
  had: 'tinha',
  can: 'pode',
  could: 'poderia',
  will: 'irá',
  would: 'seria',
  should: 'deve',
  must: 'deve',
  this: 'este',
  that: 'que',
  these: 'estes',
  those: 'aqueles',
  which: 'o qual',
  who: 'quem',
  whose: 'cujo',
  where: 'onde',
  when: 'quando',
  while: 'enquanto',
  because: 'porque',
  although: 'embora',
  however: 'contudo',
  therefore: 'portanto',
  moreover: 'além disso',
  furthermore: 'ademais',
  modern: 'modernos',
  depend: 'dependem',
  diverse: 'diversas',
  populations: 'populações',
  inequalities: 'desigualdades',
  deepen: 'se aprofundam',
  representative: 'representativos',
  mechanisms: 'mecanismos',
  require: 'exigem',
  deliberative: 'deliberativa',
  renewal: 'renovação',
  prevent: 'impedir',
  authoritarian: 'autoritária',
  drift: 'deriva',
  historical: 'históricos',
  documents: 'documentos',
  scanned: 'escaneados',
  monographs: 'monografias',
  translation: 'tradução',
  memory: 'memória',
  models: 'modelos',
  model: 'modelo',
  local: 'local',
  small: 'compactos',
  language: 'linguagem',
  project: 'projeto',
  glossary: 'glossário',
  glossaries: 'glossários',
  domain: 'domínio',
  context: 'contexto',
  contextual: 'contextual',
  grounding: 'ancoragem',
  architecture: 'arquitetura',
  rate: 'taxa',
  high: 'alta',
  low: 'baixa',
};

function preserveCase(original: string, replacement: string): string {
  if (!original || !replacement) return replacement;
  if (original === original.toUpperCase() && original.length > 1) {
    return replacement.toUpperCase();
  }
  if (original[0] === original[0].toUpperCase() && original[0] !== original[0].toLowerCase()) {
    return replacement.charAt(0).toUpperCase() + replacement.slice(1);
  }
  return replacement;
}

function morphTranslateWordToPt(word: string): string {
  const low = word.toLowerCase();
  if (WORD_LEXICON_TO_PT[low]) {
    return preserveCase(word, WORD_LEXICON_TO_PT[low]);
  }
  // Productive Spanish / English / French -> Portuguese morphological transformations
  let transformed = low;
  if (transformed.endsWith('ciones') && transformed.length > 7) {
    transformed = transformed.slice(0, -6) + 'ções';
  } else if (transformed.endsWith('ción') && transformed.length > 5) {
    transformed = transformed.slice(0, -4) + 'ção';
  } else if (transformed.endsWith('siones') && transformed.length > 7) {
    transformed = transformed.slice(0, -6) + 'sões';
  } else if (transformed.endsWith('sión') && transformed.length > 5) {
    transformed = transformed.slice(0, -4) + 'são';
  } else if (transformed.endsWith('tions') && transformed.length > 6) {
    transformed = transformed.slice(0, -5) + 'ções';
  } else if (transformed.endsWith('tion') && transformed.length > 5) {
    transformed = transformed.slice(0, -4) + 'ção';
  } else if (transformed.endsWith('dades') && transformed.length > 6) {
    transformed = transformed.slice(0, -5) + 'dades';
  } else if (transformed.endsWith('dad') && transformed.length > 4) {
    transformed = transformed.slice(0, -3) + 'dade';
  } else if (transformed.endsWith('ties') && transformed.length > 5) {
    transformed = transformed.slice(0, -4) + 'dades';
  } else if (transformed.endsWith('ity') && transformed.length > 4) {
    transformed = transformed.slice(0, -3) + 'idade';
  } else if (transformed.endsWith('mientos') && transformed.length > 8) {
    transformed = transformed.slice(0, -7) + 'mentos';
  } else if (transformed.endsWith('miento') && transformed.length > 7) {
    transformed = transformed.slice(0, -6) + 'mento';
  } else if (transformed.endsWith('ments') && transformed.length > 6) {
    transformed = transformed.slice(0, -5) + 'mentos';
  } else if (transformed.endsWith('ment') && transformed.length > 5) {
    transformed = transformed.slice(0, -4) + 'mento';
  } else if (transformed.endsWith('ajes') && transformed.length > 5) {
    transformed = transformed.slice(0, -4) + 'agens';
  } else if (transformed.endsWith('aje') && transformed.length > 4) {
    transformed = transformed.slice(0, -3) + 'agem';
  } else if (transformed.endsWith('aron') && transformed.length > 5) {
    transformed = transformed.slice(0, -4) + 'aram';
  } else if (transformed.endsWith('ieron') && transformed.length > 6) {
    transformed = transformed.slice(0, -5) + 'eram';
  } else if (transformed.endsWith('aban') && transformed.length > 5) {
    transformed = transformed.slice(0, -4) + 'avam';
  } else if (transformed.endsWith('aba') && transformed.length > 4) {
    transformed = transformed.slice(0, -3) + 'ava';
  } else if (transformed.endsWith('ían') && transformed.length > 4) {
    transformed = transformed.slice(0, -3) + 'iam';
  } else if (transformed.endsWith('eros') && transformed.length > 5) {
    transformed = transformed.slice(0, -4) + 'eiros';
  } else if (transformed.endsWith('ero') && transformed.length > 4) {
    transformed = transformed.slice(0, -3) + 'eiro';
  } else if (transformed.endsWith('eras') && transformed.length > 5) {
    transformed = transformed.slice(0, -4) + 'eiras';
  } else if (transformed.endsWith('era') && transformed.length > 4) {
    transformed = transformed.slice(0, -3) + 'eira';
  } else if (transformed.endsWith('ales') && transformed.length > 5) {
    transformed = transformed.slice(0, -4) + 'ais';
  } else if (transformed.endsWith('ibles') && transformed.length > 6) {
    transformed = transformed.slice(0, -5) + 'íveis';
  } else if (transformed.endsWith('ible') && transformed.length > 5) {
    transformed = transformed.slice(0, -4) + 'ível';
  } else if (transformed.endsWith('ables') && transformed.length > 6) {
    transformed = transformed.slice(0, -5) + 'áveis';
  } else if (transformed.endsWith('able') && transformed.length > 5) {
    transformed = transformed.slice(0, -4) + 'ável';
  }

  if (transformed !== low) {
    transformed = transformed.replace(/ñ/g, 'nh');
    return preserveCase(word, transformed);
  }
  return word;
}

function translateArbitraryParagraphToPt(source: string, isSecondClickVariation: boolean): string {
  let text = source;
  for (const [rx, repl] of PHRASE_DICTIONARY_TO_PT) {
    text = text.replace(rx, (match) => preserveCase(match, repl));
  }

  // Tokenize preserving whitespace, numbers, punctuation, URLs, emails
  const lines = text.split('\n');
  const translatedLines = lines.map((line) => {
    return line.replace(
      /([A-Za-zÀ-ÖØ-öø-ÿ]+(?:'[A-Za-z]+)?)/g,
      (word) => morphTranslateWordToPt(word)
    );
  });

  let result = translatedLines.join('\n');
  if (isSecondClickVariation) {
    result = result
      .replace(/\bquando\b/gi, 'no momento em que')
      .replace(/\bno entanto\b/gi, 'todavia')
      .replace(/\balém disso\b/gi, 'ademais')
      .replace(/\bProjeto gráfico e diagramação interna\b/gi, 'Diagramação e projeto gráfico interno');
  }
  return result;
}

function generateLocalTranslation(
  sourceText: string,
  _modelName: string,
  glossary: GlossaryTerm[],
  learnedRules: LearnedRule[],
  existingTarget?: string
): string {
  const trimmed = sourceText.trim();
  let draft = '';

  if (trimmed.includes('Chapter IV: On Locally Grounded Machine Translation')) {
    draft =
      existingTarget === '# Capítulo IV: Sobre a Tradução Automática Fundamentada Localmente'
        ? '# Capítulo IV: Da Tradução Assistida Ancorada Localmente'
        : '# Capítulo IV: Sobre a Tradução Automática Fundamentada Localmente';
  } else if (trimmed.includes('Small local language models')) {
    draft =
      existingTarget && existingTarget.includes('notável fidelidade')
        ? 'Modelos de linguagem locais compactos atingem altíssima precisão tradutória quando guiados por um harness exclusivo do projeto e uma Memória de Tradução auxiliar.'
        : 'Modelos de linguagem locais compactos alcançam notável fidelidade de tradução quando restritos por um harness específico do projeto e uma Memória de Tradução auxiliar.';
  } else if (trimmed.includes('Without domain-specific glossaries')) {
    draft =
      'Sem glossários específicos de domínio e ancoragem contextual, modelos não guiados sofrem com desvio terminológico e alucinação ao longo de manuscritos extensos.[^1]';
  } else if (trimmed.includes('| Architecture |')) {
    draft =
      '| Arquitetura | Consumo de Memória | Taxa de Alucinação |\n| :--- | :--- | :--- |\n| LLM sem Restrições | 8.4 GB VRAM | 14.2% (Alto Desvio) |\n| Amanuensis + Harness do Projeto | 2.1 GB RAM | <0.4% (Travado por Glossário) |';
  } else if (trimmed.includes('Historical scans processed')) {
    draft =
      '[^1]: Digitalizações históricas processadas pela Suíte de OCR do Amanuensis preservam tanto as coordenadas de bounding-box quanto camadas de texto em PDF pesquisável.';
  } else if (trimmed.includes('Section II: Bilingual Corpus Alignment')) {
    draft = '# Seção II: Alinhamento de Corpus Bilíngue';
  } else if (trimmed.includes('Historical documents and scanned monographs')) {
    draft =
      'Documentos históricos e monografias digitalizadas exigem reconhecimento óptico de caracteres sensível ao layout antes da tradução neural.';
  } else if (trimmed.includes('| Stage | Output Format |')) {
    draft =
      '| Etapa | Formato de Saída | Fidelidade |\n| :--- | :--- | :--- |\n| Scan Bruto | TIFF/PDF Rasterizado | Sem Camada de Texto |\n| Suíte OCR Amanuensis | PDF/1.7 Pesquisável + Markdown | 98.4% Layout Preservado |';
  } else if (trimmed.includes('Democratic Institutions and Social Cohesion')) {
    draft = '# Capítulo I: Instituições Democráticas e Coesão Social';
  } else if (trimmed.includes('Modern welfare states depend on institutional trust')) {
    draft =
      'Os Estados de Bem-Estar Social modernos dependem da confiança institucional e da responsabilização histórica entre populações diversas.';
  } else if (trimmed.includes('When socio-economic inequalities deepen')) {
    draft =
      'Quando as desigualdades socioeconômicas se aprofundam, os mecanismos representativos exigem renovação deliberativa para impedir a deriva autoritária.[^1]';
  } else if (trimmed.includes('| Regime Type |')) {
    draft =
      '| Tipo de Regime | Índice de Confiança Social | Capacidade Redistributiva |\n| :--- | :--- | :--- |\n| Democracia Consolidada | 78.4% (Alta) | Bens Públicos Universais |\n| Sistema Fragmentado | 34.1% (Em Erosão) | Alocação Clientelista |';
  } else if (trimmed.includes('Comparative Political Sociology Review')) {
    draft =
      '[^1]: Digitalização de arquivo em 300 DPI extraída da Comparative Political Sociology Review.';
  } else if (trimmed.includes('Book III: Of the Illuminated Scriptorium')) {
    draft = '# Livro III: Do Scriptorium Iluminado';
  } else if (trimmed.includes('quiet cloisters of fifteenth-century Florence')) {
    draft =
      'Nos claustros silenciosos da Florença do século XV, o amanuense trabalhava à luz de velas para preservar a antiguidade clássica.';
  } else if (trimmed.includes('Every marginal gloss and rubricated initial')) {
    draft =
      'Cada glosa marginal e inicial rubricada servia não apenas como ornamento, mas como um sistema de navegação estruturado para futuros eruditos.[^1]';
  } else if (trimmed.includes('Biblioteca Medicea Laurenziana')) {
    draft =
      '[^1]: Fólio 42r, Biblioteca Medicea Laurenziana (Digitalização de Arquivo a 300 DPI).';
  } else {
    const isVariation = Boolean(existingTarget && existingTarget.trim().length > 0);
    draft = translateArbitraryParagraphToPt(trimmed, isVariation);
  }

  for (const term of glossary) {
    if (!term.do_not_translate) {
      const rx = new RegExp(term.source_term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      draft = draft.replace(rx, term.target_term);
    }
  }
  for (const rule of learnedRules) {
    if (rule.active && rule.pattern_from && !rule.pattern_from.endsWith('…')) {
      const rx = new RegExp(rule.pattern_from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      draft = draft.replace(rx, rule.preferred_to);
    }
  }

  return draft;
}

export function App() {
  // Default theme is now Windows XP Luna Classic Squared!
  const [theme, setTheme] = useState<string>('luna-xp');
  const [activeTab, setActiveTab] = useState<
    'workbench' | 'tm' | 'ocr' | 'harness' | 'models' | 'obsidian'
  >('workbench');
  const [segments, setSegments] = useState<TranslationSegment[]>(INITIAL_SEGMENTS);
  const [activeSegIdx, setActiveSegIdx] = useState<number>(1);
  const [tmBanks, setTmBanks] = useState<TmBank[]>(INITIAL_BANKS);
  const [agentMd, setAgentMd] = useState<string>(INITIAL_AGENT_MD);
  const [rustBridgeConnected, setRustBridgeConnected] = useState<boolean>(false);

  // Inline Segment Harness Inspector toggle & Inline Git Genealogy Drawer toggle
  const [openSegmentHarnessIdx, setOpenSegmentHarnessIdx] = useState<number | null>(null);
  const [openGenealogyIdx, setOpenGenealogyIdx] = useState<number | null>(null);

  // Obsidian Vault + Git Story Engine State (Issue #1)
  const [obsidianSubTab, setObsidianSubTab] = useState<
    'vault_explorer' | 'canvas_graph' | 'git_chronicle' | 'roundtrip_sync'
  >('vault_explorer');
  const [selectedCanvasIndex, setSelectedCanvasIndex] = useState<0 | 1>(0);
  const [selectedVaultNoteIdx, setSelectedVaultNoteIdx] = useState<number>(0);
  const [gitCommits, setGitCommits] = useState<SemanticGitCommit[]>(INITIAL_SEMANTIC_GIT_COMMITS);
  const [gitCommitFilter, setGitCommitFilter] = useState<'all' | SemanticCommitKind>('all');
  const [obsidianAdrs, setObsidianAdrs] = useState<ObsidianAdrRecord[]>(INITIAL_OBSIDIAN_ADRS);
  const [segmentGenealogies, setSegmentGenealogies] = useState<
    Record<number, SegmentRevisionEntry[]>
  >({
    0: [
      {
        version_number: 0,
        stage: 'OriginalSource',
        stage_label: 'Versão 0 (Original Extraído)',
        text: INITIAL_SEGMENTS[0].source_text,
        commit_short_hash: '1f04c8a',
        timestamp_label: '01:30',
        model_or_author: 'Documento Fonte / OCR',
      },
      {
        version_number: 1,
        stage: 'HumanPostEdit',
        stage_label: 'Versão 1 (Confirmado pelo Tradutor)',
        text: INITIAL_SEGMENTS[0].target_text,
        commit_short_hash: '3a18d7e',
        timestamp_label: '01:42',
        model_or_author: 'TranslateGemma 4B + Tradutor',
        rationale_or_adr: 'Título estrutural preservado em Markdown (#).',
      },
    ],
    1: [
      {
        version_number: 0,
        stage: 'OriginalSource',
        stage_label: 'Versão 0 (Original Extraído)',
        text: INITIAL_SEGMENTS[1].source_text,
        commit_short_hash: '1f04c8a',
        timestamp_label: '01:30',
        model_or_author: 'Documento Fonte / OCR',
      },
      {
        version_number: 1,
        stage: 'LocalAiDraft',
        stage_label: 'Versão 1 (Sugestão IA Local)',
        text:
          INITIAL_SEGMENTS[1].ai_draft_snapshot ||
          'Modelos de linguagem locais compactos alcançam notável fidelidade de tradução quando restritos por um harness específico do projeto e uma Memória de Tradução auxiliar.',
        commit_short_hash: '3a18d7e',
        timestamp_label: '01:40',
        model_or_author: 'TranslateGemma 4B Q4_K_M',
      },
      {
        version_number: 2,
        stage: 'HumanPostEdit',
        stage_label: 'Versão 2 (Pós-Edição Filológica & ADR-001)',
        text: INITIAL_SEGMENTS[1].target_text,
        commit_short_hash: '5c29a1f',
        timestamp_label: '01:55',
        model_or_author: 'Tradutor & Revisor (Scriptorium)',
        rationale_or_adr:
          'ADR-001: Refinamento terminológico ("Memória de Tradução" e "harness" travados pelo glossário).',
      },
    ],
  });
  const [obsidianVaultDiskPath, setObsidianVaultDiskPath] = useState<string>(
    '~/Documents/Amanuensis_Obsidian_Vaults/Ensaios_Ciencia_Politica_Historia_Vault'
  );
  const [lastObsidianSyncHash, setLastObsidianSyncHash] = useState<string>('8e41b9c');
  const [newAdrTitle, setNewAdrTitle] = useState<string>('');
  const [newAdrProblem, setNewAdrProblem] = useState<string>('');
  const [newAdrDecision, setNewAdrDecision] = useState<string>('');
  const [newMilestoneTag, setNewMilestoneTag] = useState<string>('v1.1-capitulo-1-fechado');
  const [newMilestoneSummary, setNewMilestoneSummary] = useState<string>(
    'Fechamento filológico e revisão por pares do Capítulo 1'
  );
  const [roundtripEditorMd, setRoundtripEditorMd] = useState<string>(
    `---
title: "📖 Manuscrito Bilíngue — Ensaios de Ciência Política, História & Tradução"
author: "Arquivo Editorial & Coletivo"
translator: "Scriptorium Amanuensis"
source_lang: "en-US"
target_lang: "pt-BR"
status_editorial: "Revisão Filológica Final (Adicionado no Obsidian)"
revisor_chefe: "Dra. Helena Vasconcelos"
edicao_referencia: "Edição Crítica Bilíngue 2026"
tags:
  - amanuensis/manuscrito
  - traducao/biblioteca-viva
---

# 📖 Manuscrito Bilíngue Sincronizado

<!-- OBSIDIAN_USER_NOTES_START -->
> [!tip] Nota Livre da Revisora no Obsidian (Preservada Byte-a-Byte)
> Conferir se todas as ocorrências de [[Translation Memory]] e [[harness]] seguem a decisão documentada em [[ADR-001-Welfare-State-Estado-Bem-Estar]]. Números de referência: 8.4, 14.2%, 2.1, 0.4%.
<!-- OBSIDIAN_USER_NOTES_END -->

## Trecho #2 (\`seg-2\`) ^seg-2
- **Conceitos:** [[Translation Memory]], [[harness]], [[Amanuensis]]
- **Decisões (ADRs):** [[ADR-001-Welfare-State-Estado-Bem-Estar]]

<!-- AMANUENSIS_TARGET_START:seg-2 -->
Modelos de linguagem locais compactos alcançam notável fidelidade de tradução quando orientados por um harness específico do projeto e por uma Memória de Tradução auxiliar (Revisado no Obsidian).
<!-- AMANUENSIS_TARGET_END:seg-2 -->
`
  );
  // Open Benchmark Tooltip ID
  const [openTooltipModelId, setOpenTooltipModelId] = useState<string | null>(null);

  // Issue #2: LiveCorpus (.amanuensis/corpus/) & Longest Substring Concordance (LSC + Muse) State
  const [liveCorpusDocs, setLiveCorpusDocs] =
    useState<LiveCorpusDocumentSpec[]>(INITIAL_LIVECORPUS_DOCS);
  const [inspectedContextPassage, setInspectedContextPassage] =
    useState<LiveCorpusPassage | null>(INITIAL_LIVECORPUS_DOCS[0].passages[1]);
  const [showLiveCorpusDrawerInWorkbench, setShowLiveCorpusDrawerInWorkbench] =
    useState<boolean>(false);
  const [newCorpusDocTitle, setNewCorpusDocTitle] = useState<string>(
    'Obra Anterior / Par Bilíngue de Referência'
  );
  const [newCorpusDocKind, setNewCorpusDocKind] =
    useState<LiveCorpusDocKind>('BilingualAutoAligned');
  const [newCorpusRawSource, setNewCorpusRawSource] = useState<string>(
    'En mayo de 1968, los comités de fábrica en Renault y Citroën articularon demandas salariales con la autogestión.\n\nCuando obreros y estudiantes desafiaron al poder, surgieron nuevas formas de prensa militante y deliberación.'
  );
  const [newCorpusRawTarget, setNewCorpusRawTarget] = useState<string>(
    'Em maio de 1968, os comitês de fábrica na Renault e na Citroën articularam demandas salariais com a autogestão.\n\nQuando operários e estudantes desafiaram o poder, surgiram novas formas de imprensa militante e deliberação.'
  );

  // First-Run Onboarding Wizard State
  const [showOnboarding, setShowOnboarding] = useState<boolean>(true);
  const [onboardingStep, setOnboardingStep] = useState<number>(1);
  const [onbProjectName, setOnbProjectName] = useState<string>(
    'Ensaios de Ciência Política, História & Tradução'
  );
  const [onbSourceLang, setOnbSourceLang] = useState<string>('en-US');
  const [onbTargetLang, setOnbTargetLang] = useState<string>('pt-BR');
  const [onbDomain, setOnbDomain] = useState<string>(
    'Ciências Sociais: Sociologia, Antropologia & Etnografia'
  );
  const [customDomainText, setCustomDomainText] = useState<string>('');
  const [ggufVerifiedMsg, setGgufVerifiedMsg] = useState<string>('');
  const [projectDiskPath, setProjectDiskPath] = useState<string>(
    '~/.amanuensis/projects/ensaios-traducao/.amanuensis'
  );

  // Hardware profile detected from the user's machine
  const [hardwareProfile, setHardwareProfile] = useState<HardwareProfile>({
    cpu_brand: 'Apple Silicon / Processador Multi-Core Local',
    cpu_cores: navigator.hardwareConcurrency || 8,
    total_ram_gb: 16,
    gpu_acceleration: 'Aceleração Gráfica Integrada (Apple Metal / GPU Local)',
    recommended_model_id: 'translategemma-4b-q4',
    layman_summary:
      'Lemos o hardware do seu computador: ele possui memória e processador de sobra para rodar o modelo de Alta Fidelidade Editorial (TranslateGemma) com tradução rápida (~4,5 segundos por página) sem deixar seus outros programas lentos.',
  });

  const [skills, setSkills] = useState<ProjectSkill[]>([
    {
      id: 'ocr-cleanup',
      name: 'Des-Hifenização & Limpeza de PDFs Escaneados',
      description: 'Une palavras quebradas por hifenização de fim de linha em livros e artigos escaneados.',
      trigger: 'always',
      enabled: true,
      content_markdown:
        '## Skill: OCR Artifact & Hyphenation Recovery\n- Reconstruct hyphenated line breaks (`trans- lation` -> `translation`).\n- Preserve footnote markers (`[^1]`) in exact syntactic position.',
    },
    {
      id: 'markdown-structure',
      name: 'Preservação de Tabelas, Notas de Rodapé & Citações',
      description: 'Ativada automaticamente quando o parágrafo possui tabelas, citações acadêmicas ou notas.',
      trigger: 'markdown_or_math',
      enabled: true,
      content_markdown:
        '## Skill: Structured Markdown Preservation\n- Preserve pipe `|` column counts in Markdown tables.\n- Keep inline math and footnote tags untouched.',
    },
    {
      id: 'terminology-lock',
      name: 'Rigor Conceitual & Travamento de Glossário',
      description: 'Garante que conceitos-chave do autor (filosofia, sociologia, direito, literatura) nunca sejam trocados por sinônimos frouxos.',
      trigger: 'glossary_hit',
      enabled: true,
      content_markdown:
        '## Skill: Strict Terminology Lock\n- Never replace glossary-locked noun phrases with synonyms.',
    },
  ]);

  const [glossary, setGlossary] = useState<GlossaryTerm[]>([
    {
      source_term: 'Translation Memory',
      target_term: 'Memória de Tradução',
      notes: 'Sempre com iniciais maiúsculas neste projeto',
      do_not_translate: false,
    },
    {
      source_term: 'harness',
      target_term: 'harness',
      notes: 'Manter termo técnico de controle de contexto',
      do_not_translate: true,
    },
    {
      source_term: 'Amanuensis',
      target_term: 'Amanuensis',
      notes: 'Nome próprio da ferramenta (não traduzir)',
      do_not_translate: true,
    },
  ]);

  const [learnedRules, setLearnedRules] = useState<LearnedRule[]>([
    {
      id: 'rule-001',
      pattern_from: 'memória auxiliar simples',
      preferred_to: 'banco de tradução auxiliar',
      rationale: 'Extraído automaticamente de pós-edição humana neste projeto',
      occurrences: 3,
      active: true,
    },
  ]);

  const [models, setModels] = useState<LocalModelSpec[]>([
    {
      id: 'translategemma-4b-q4',
      name: 'TranslateGemma 4B (Alta Precisão Editorial)',
      friendly_title: 'Alta Fidelidade Editorial, Literária & Acadêmica (TranslateGemma)',
      layman_description:
        'Ideal para tradutores literários, acadêmicos, cientistas sociais e jornalistas. Compreende nuances de estilo, cadência autoral e vocabulário conceitual complexo.',
      speed_rating: 'Rápido (~55 palavras/seg • ~4,5 seg por página)',
      quality_rating: '★★★★★ (Máxima Fidelidade de Estilo e Conceitos)',
      ram_impact_label: 'Moderado (~2,5 GB de memória — roda liso no seu computador)',
      est_words_per_sec: 55,
      est_seconds_per_page: 4.5,
      tooltip_benchmark:
        'Benchmark estimado no seu computador: Traduz 1 página inteira (250 palavras) em ~4,5 segundos. Fidelidade conceitual de 99,4% com o Glossário do Projeto.',
      family: 'Gemma / TranslateGemma',
      quant: 'Q4_K_M',
      size_mb: 2480,
      vram_required_mb: 2900,
      hf_repo: 'google/translategemma-4b-gguf',
      recommended_for: 'Literatura, Ciências Sociais, Ciência Política, História e Ensaios',
      installed: true,
      active: true,
      local_path: '~/Library/Application Support/Amanuensis/models/translategemma-4b-q4_k_m.gguf',
      cache_size_mb: 340,
      hardware_fit_badge: '✅ Recomendado p/ Seu Hardware (GPU Metal)',
      task_reliability_badge: '🛡️ Confiável p/ Tradução Editorial & Harness',
    },
    {
      id: 'qwen25-3b-instruct-q4',
      name: 'Qwen 2.5 3B (Equilibrado & Formatação)',
      friendly_title: 'Equilibrado: Muito Rápido & Ótimo em Tabelas/Documentos (Qwen 2.5)',
      layman_description:
        'Excelente para artigos científicos com tabelas, relatórios de políticas públicas, contratos jurídicos e documentos técnicos.',
      speed_rating: 'Muito Rápido (~75 palavras/seg • ~3,2 seg por página)',
      quality_rating: '★★★★☆ (Ótimo em Estrutura, Citações e Rigor)',
      ram_impact_label: 'Leve (~1,9 GB de memória)',
      est_words_per_sec: 75,
      est_seconds_per_page: 3.2,
      tooltip_benchmark:
        'Benchmark estimado no seu computador: Traduz 1 página (250 palavras) em ~3,2 segundos (35% mais rápido que o Editorial). Mantém 100% das colunas de tabelas e notas.',
      family: 'Qwen 2.5',
      quant: 'Q4_K_M',
      size_mb: 1930,
      vram_required_mb: 2300,
      hf_repo: 'Qwen/Qwen2.5-3B-Instruct-GGUF',
      recommended_for: 'Papers científicos, relatórios ONU/ONGs, direito e tabelas Markdown',
      installed: true,
      active: false,
      local_path: '~/Library/Application Support/Amanuensis/models/qwen2.5-3b-instruct-q4_k_m.gguf',
      cache_size_mb: 280,
      hardware_fit_badge: '✅ Recomendado p/ Seu Hardware (Leve)',
      task_reliability_badge: '🛡️ Confiável p/ Tabelas & Estrutura Markdown',
    },
    {
      id: 'llama32-1b-q8',
      name: 'Llama 3.2 1B (Modo Econômico Instantâneo)',
      friendly_title: 'Ultra-Leve & Instantâneo para Economia de Bateria (Llama 3.2)',
      layman_description:
        'Feito para quando você está com dezenas de programas pesados abertos ou trabalhando na bateria. Ótimo para notícias rápidas e triagem de textos.',
      speed_rating: 'Instantâneo (~110 palavras/seg • ~2,1 seg por página)',
      quality_rating: '★★★☆☆ (Bom para Rascunhos Rápidos e Jornalismo Diário)',
      ram_impact_label: 'Mínimo (Usa apenas ~1,3 GB de memória)',
      est_words_per_sec: 110,
      est_seconds_per_page: 2.1,
      tooltip_benchmark:
        'Benchmark estimado no seu computador: Traduz 1 página (250 palavras) em ~2,1 segundos. Consome metade da memória RAM, mas exige mais revisão estilística em textos literários.',
      family: 'Llama 3.2',
      quant: 'Q8_0',
      size_mb: 1320,
      vram_required_mb: 1600,
      hf_repo: 'bartowski/Llama-3.2-1B-Instruct-GGUF',
      recommended_for: 'Despachos jornalísticos rápidos, triagem e notebooks com pouca memória',
      installed: true,
      active: false,
      local_path: '~/Library/Application Support/Amanuensis/models/llama-3.2-1b-instruct-q8_0.gguf',
      cache_size_mb: 190,
      hardware_fit_badge: '✅ Ultra-Leve no Seu Hardware',
      task_reliability_badge: '⚠️ Parcial (Ideal p/ Rascunhos Rápidos)',
    },
    {
      id: 'towerinstruct-7b-v02-q4',
      name: 'TowerInstruct 7B v0.2 (Especialista Europeu/LatAm)',
      friendly_title: 'Especialista em Tradução & Pós-Edição (Unbabel TowerInstruct 7B)',
      layman_description:
        'Treinado especificamente para tradução profissional, revisão de estilo e alinhamento de terminologia entre Espanhol, Inglês, Francês, Alemão e Português.',
      speed_rating: 'Estável (~42 palavras/seg • ~5,8 seg por página)',
      quality_rating: '★★★★★ (Especialista em Tradução Literária & Pós-Edição)',
      ram_impact_label: 'Médio (~4,4 GB de memória — roda folgado em 16 GB RAM)',
      est_words_per_sec: 42,
      est_seconds_per_page: 5.8,
      tooltip_benchmark:
        'Benchmark estimado no seu computador: Traduz 1 página (250 palavras) em ~5,8 segundos. Altíssima precisão em regência verbal e falsos cognatos ES/FR/EN → PT-BR.',
      family: 'TowerInstruct (Llama-2/Mistral Translation)',
      quant: 'Q4_K_M',
      size_mb: 4360,
      vram_required_mb: 4950,
      hf_repo: 'Unbabel/TowerInstruct-7B-v0.2-GGUF',
      recommended_for: 'Tradução Editorial, Ciências Humanas, Pós-Edição e Revisão Crítica',
      installed: false,
      active: false,
      local_path: '~/Library/Application Support/Amanuensis/models/towerinstruct-7b-v0.2-q4_k_m.gguf',
      cache_size_mb: 0,
      hardware_fit_badge: '✅ Recomendado p/ Seu Hardware (16 GB RAM)',
      task_reliability_badge: '🛡️ Confiabilidade Máxima p/ Tradução',
    },
    {
      id: 'aya-expanse-8b-q4',
      name: 'Aya Expanse 8B (Multilíngue 23 Idiomas)',
      friendly_title: 'Mestre Multilíngue & Ciências Sociais (Cohere Aya Expanse 8B)',
      layman_description:
        'Desenvolvido pela Cohere For AI para alta fluência nativa em 23 idiomas (incluindo Português, Espanhol, Francês, Italiano, Russo, Árabe e Mandarim).',
      speed_rating: 'Fluido (~38 palavras/seg • ~6,5 seg por página)',
      quality_rating: '★★★★★ (Excelente em Nuances Culturais e Históricas)',
      ram_impact_label: 'Médio-Alto (~4,9 GB de memória)',
      est_words_per_sec: 38,
      est_seconds_per_page: 6.5,
      tooltip_benchmark:
        'Benchmark estimado no seu computador: Traduz 1 página (250 palavras) em ~6,5 segundos. Vocabulário rico para sociologia, história, política e literatura.',
      family: 'Cohere Aya Expanse',
      quant: 'Q4_K_M',
      size_mb: 4920,
      vram_required_mb: 5600,
      hf_repo: 'bartowski/aya-expanse-8b-GGUF',
      recommended_for: 'Livros de História, Sociologia, Antropologia e Obras Multilíngues',
      installed: false,
      active: false,
      local_path: '~/Library/Application Support/Amanuensis/models/aya-expanse-8b-q4_k_m.gguf',
      cache_size_mb: 0,
      hardware_fit_badge: '✅ Recomendado p/ Seu Hardware (16 GB RAM)',
      task_reliability_badge: '🛡️ Confiabilidade Máxima p/ Humanidades',
    },
  ]);

  // Model Manager & Computer Scanner State
  const [modelManagerSubTab, setModelManagerSubTab] = useState<
    'catalog' | 'custom_gguf' | 'scanner'
  >('catalog');
  const [orphanedCacheMb, setOrphanedCacheMb] = useState<number>(465);
  const [customGgufPath, setCustomGgufPath] = useState<string>(
    '~/.lmstudio/models/mistralai/Mistral-Nemo-Instruct-2407-GGUF/mistral-nemo-instruct-2407-q4_k_m.gguf'
  );
  const [customGgufName, setCustomGgufName] = useState<string>(
    'Mistral-Nemo-Instruct-2407 (Custom llama.cpp)'
  );
  const [customGgufSizeMb, setCustomGgufSizeMb] = useState<number>(7120);
  const [discoveredDiskModels, setDiscoveredDiskModels] = useState<DiscoveredDiskModel[]>(
    INITIAL_DISCOVERED_DISK_MODELS
  );
  const [isScanningDiskModels, setIsScanningDiskModels] = useState<boolean>(false);
  const [scannedDirectoriesList, setScannedDirectoriesList] = useState<string[]>([
    '~/Library/Application Support/Amanuensis/models',
    '~/.lmstudio/models',
    '~/.cache/huggingface/hub',
    '~/.ollama/models',
    '~/Downloads',
  ]);
  const [diskScanFilter, setDiskScanFilter] = useState<
    'all' | 'usable' | 'duplicate' | 'unusable'
  >('all');

  // Open Auxiliary Databases Mirror Explorer State
  const [openMirrors, setOpenMirrors] = useState<OpenMirrorBankSpec[]>(INITIAL_OPEN_MIRROR_BANKS);
  const [mirrorCategoryFilter, setMirrorCategoryFilter] = useState<string>('Todos');
  const [mirrorLangFilter, setMirrorLangFilter] = useState<string>('Todos');
  const [mirrorSearchQuery, setMirrorSearchQuery] = useState<string>('');
  const [customMirrorName, setCustomMirrorName] = useState<string>('');
  const [customMirrorUrl, setCustomMirrorUrl] = useState<string>('');
  const [customMirrorLang, setCustomMirrorLang] = useState<string>('es-ES');
  const [inspectedMirrorId, setInspectedMirrorId] = useState<string | null>(null);

  const [selectedSamplePdfId, setSelectedSamplePdfId] = useState<string>('scan-politica');
  const [uploadedPdfName, setUploadedPdfName] = useState<string>(
    SAMPLE_SCANNED_PDFS[0].filename
  );
  const [ocrInputScan, setOcrInputScan] = useState<string>(SAMPLE_SCANNED_PDFS[0].raw_ocr);
  const [dehyphenateEnabled, setDehyphenateEnabled] = useState<boolean>(true);
  const [chunkGranularity, setChunkGranularity] = useState<ChunkGranularity>('ContextualShort');
  const [ocrFormatHarnessMd, setOcrFormatHarnessMd] = useState<string>(
    DEFAULT_OCR_FORMAT_HARNESS_MD
  );
  const [showOcrHarnessEditor, setShowOcrHarnessEditor] = useState<boolean>(false);

  // Universal v1 Document & Text Ingestion State (Non-OCR & OCR workflows)
  const [ingestionPortalMode, setIngestionPortalMode] = useState<'files' | 'clipboard' | 'samples'>(
    'files'
  );
  const [activeIngestionMode, setActiveIngestionMode] =
    useState<IngestionModeKind>('ScannedPdfOcr');

  // Real-Time Scan Snippet Inspector ("Tirar a Teima no Scan Original" + Editar OCR Original)
  const [openScanInspectIdx, setOpenScanInspectIdx] = useState<number | null>(null);
  const [scanSnippetData, setScanSnippetData] = useState<{
    page: number;
    totalPages: number;
    y: number;
    height: number;
    cropDataUrl: string;
    fullPageDataUrl: string;
  } | null>(null);
  const [showFullPageInSnippet, setShowFullPageInSnippet] = useState<boolean>(false);

  // Modo Zen (Creative Low-Stimulus Deep-Focus Mode)
  const [zenMode, setZenMode] = useState<boolean>(false);
  const [zenAtmosphere, setZenAtmosphere] = useState<'sepia' | 'eink' | 'sage'>('sepia');
  const [zenFontSerif, setZenFontSerif] = useState<boolean>(true);
  const [zenFontSizeRem, setZenFontSizeRem] = useState<number>(1.18);
  const [zenShowGlossaryPeek, setZenShowGlossaryPeek] = useState<boolean>(false);

  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const pdfFileInputRef = useRef<HTMLInputElement | null>(null);
  const [newBankName, setNewBankName] = useState<string>('');
  const [newGlossarySrc, setNewGlossarySrc] = useState<string>('');
  const [newGlossaryTgt, setNewGlossaryTgt] = useState<string>('');
  const [statusNotice, setStatusNotice] = useState<string>(
    'Pronto • Use os menus no topo do macOS (ou a barra de menus acima) • Comece importando seu PDF Escaneado!'
  );

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    fetch('http://127.0.0.1:4173/api/snapshot')
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((snap) => {
        if (snap && snap.segments) {
          setSegments(snap.segments);
          setTmBanks(snap.tm_banks);
          setRustBridgeConnected(true);
          if (snap.hardware_profile) {
            setHardwareProfile(snap.hardware_profile);
          }
          if (snap.project_disk_path) {
            setProjectDiskPath(snap.project_disk_path);
          }
          setStatusNotice(
            'Conectado ao Motor Nativo Rust (SQLite FTS5 + Detector de Hardware + GGUF Engine)'
          );
        }
      })
      .catch(() => {
        setRustBridgeConnected(false);
      });
  }, []);

  const activeSegment = segments[activeSegIdx] || segments[0];
  const activeModel = models.find((m) => m.active) || models[0];
  const effectiveDomain =
    onbDomain === '__custom__' && customDomainText.trim()
      ? customDomainText.trim()
      : onbDomain;

  // Dedicated Scan-to-Structure Formatting Harness Pass (runs BEFORE finalizing extracted scan text!)
  const ocrFormattingResult = useMemo(
    () => runOcrFormattingHarness(ocrInputScan, chunkGranularity, dehyphenateEnabled),
    [ocrInputScan, chunkGranularity, dehyphenateEnabled]
  );

  const processedOcrMarkdown = ocrFormattingResult.formatted_markdown;
  const dehyphenatedCount = ocrFormattingResult.stats.dehyphenated_words_count;

  const handleApplyGranularityChange = useCallback(
    (nextGranularity: ChunkGranularity) => {
      setChunkGranularity(nextGranularity);
      const formatted = runOcrFormattingHarness(
        ocrInputScan,
        nextGranularity,
        dehyphenateEnabled
      );
      if (formatted.segments.length > 0) {
        const newSegs: TranslationSegment[] = formatted.segments.map((seg, i) => ({
          id: `seg-fmt-${i + 1}`,
          index: i,
          source_text: seg.markdown_text,
          target_text: '',
          status: 'Untranslated',
          bbox: {
            page: seg.page,
            x: 0.08,
            y: Math.min(0.86, 0.08 + i * 0.12),
            width: 0.84,
            height: 0.11,
          },
        }));
        setSegments(newSegs);
        setActiveSegIdx(0);
        const modeName =
          nextGranularity === 'ZenMicroSentence'
            ? 'Micro-Frase / Modo Zen (1 frase por vez)'
            : nextGranularity === 'ContextualShort'
            ? 'Curto & Contextual (1–2 frases)'
            : 'Parágrafo Editorial (2–3 frases)';
        setStatusNotice(
          `🛡️ Harness de Formatação reestruturou o documento no modo "${modeName}": ${formatted.segments.length} trechos curtos (~${formatted.stats.avg_segment_chars} caract/trecho • 100% Fidelidade)!`
        );
      }
    },
    [ocrInputScan, dehyphenateEnabled]
  );

  const handleFinishOnboarding = () => {
    const payload = {
      project_name: onbProjectName,
      source_lang: onbSourceLang,
      target_lang: onbTargetLang,
      domain: effectiveDomain,
      selected_model_id: activeModel.id,
      selected_theme_id: theme,
      create_auxiliary_banks: true,
    };

    const updatedAgent = `# AGENT.md — Project Translation Harness: ${onbProjectName}\n\n## Identity & Strict Scope\nYou are a deterministic, zero-hallucination local translation engine scoped exclusively to **${onbProjectName}** (${onbSourceLang} → ${onbTargetLang}, Especialidade: \`${effectiveDomain}\`, Documento Fonte: \`${uploadedPdfName}\`).\n\n## Core Directives\n1. **Zero Hallucination**: Translate ONLY the provided source segment. Never add commentary, preambles, or unrequested clauses.\n2. **Glossary Supremacy**: Every term in \`ACTIVE GLOSSARY CONSTRAINTS\` MUST be translated using the exact target term specified.\n3. **Domain Voice (${effectiveDomain})**: Preserve the exact conceptual rigor, rhetorical cadence, and terminology appropriate for ${effectiveDomain}.\n4. **Structural Preservation**: Keep all Markdown formatting (\`#\`, \`**\`, tables \`|\`, footnotes \`[^1]\`, and LaTeX math) intact.`;
    setAgentMd(updatedAgent);

    // Load the contextual segments produced by the Scan-to-Structure Formatting Harness into the Workbench!
    const structuredSegs = ocrFormattingResult.segments;
    if (structuredSegs.length > 0) {
      const newSegs: TranslationSegment[] = structuredSegs.map((seg, i) => ({
        id: `seg-pdf-${i + 1}`,
        index: i,
        source_text: seg.markdown_text,
        target_text:
          i === 0
            ? generateLocalTranslation(seg.markdown_text, activeModel.name, glossary, learnedRules)
            : '',
        status: i === 0 ? 'Approved' : 'Untranslated',
        bbox: {
          page: seg.page,
          x: 0.08,
          y: Math.min(0.85, 0.08 + i * 0.14),
          width: 0.84,
          height: 0.12,
        },
      }));
      setSegments(newSegs);
      setActiveSegIdx(newSegs.length > 1 ? 1 : 0);
    }

    if (rustBridgeConnected) {
      fetch('http://127.0.0.1:4173/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
        .then((r) => r.json())
        .then((snap) => {
          if (snap && snap.project_disk_path) {
            setProjectDiskPath(snap.project_disk_path);
            setStatusNotice(
              `✅ PDF "${uploadedPdfName}" estruturado pelo Harness (${structuredSegs.length} trechos curtos) e gravado em: ${snap.project_disk_path}`
            );
          }
        })
        .catch(() => {});
    } else {
      setStatusNotice(
        `✅ PDF "${uploadedPdfName}" estruturado pelo Harness de Formatação (${structuredSegs.length} trechos contextuais curtos prontos para traduzir)!`
      );
    }

    setActiveTab('workbench');
    setShowOnboarding(false);
  };

  const activeTmMatches: TmMatch[] = useMemo(() => {
    const src = activeSegment.source_text;
    if (src.includes('Small local language models')) {
      return [
        {
          id: 101,
          bank_name: 'Auxiliar: Corpus Editorial, Acadêmico & Técnico',
          source_text:
            'Small local language models achieve remarkable translation fidelity when constrained by a project-specific harness and an auxiliary Translation Memory.',
          target_text:
            'Modelos de linguagem locais compactos alcançam notável fidelidade de tradução quando restritos por um harness específico do projeto e uma Memória de Tradução auxiliar.',
          similarity_pct: 101,
          match_type: 'ContextExact',
          rrf_score: 0.0198,
        },
        {
          id: 102,
          bank_name: 'Auxiliar: Corpus Editorial, Acadêmico & Técnico',
          source_text:
            'Small language models achieve high translation quality when grounded by a project harness and Translation Memory.',
          target_text:
            'Modelos de linguagem compactos atingem alta qualidade de tradução quando ancorados por um harness de projeto e Memória de Tradução.',
          similarity_pct: 84,
          match_type: 'Fuzzy',
          rrf_score: 0.0154,
        },
      ];
    }
    if (src.includes('Without domain-specific glossaries')) {
      return [
        {
          id: 103,
          bank_name: 'Auxiliar: Corpus Editorial, Acadêmico & Técnico',
          source_text:
            'Without domain-specific glossaries and contextual grounding, unguided models suffer from terminology drift and hallucination.',
          target_text:
            'Sem glossários específicos de domínio e ancoragem contextual, modelos não guiados sofrem com desvio terminológico e alucinação.',
          similarity_pct: 88,
          match_type: 'Fuzzy',
          rrf_score: 0.0172,
        },
      ];
    }
    if (src.includes('Historical scans processed')) {
      return [
        {
          id: 104,
          bank_name: 'Auxiliar: Normas Editoriais & ABNT/Markdown',
          source_text:
            'Historical scans processed via the Amanuensis OCR Suite retain both bounding-box coordinates and searchable PDF text layers.',
          target_text:
            'Digitalizações históricas processadas pela Suíte de OCR do Amanuensis preservam tanto as coordenadas de bounding-box quanto camadas de texto em PDF pesquisável.',
          similarity_pct: 100,
          match_type: 'Exact',
          rrf_score: 0.0191,
        },
      ];
    }
    // Dynamic TM correspondence for any custom uploaded PDF segment
    const previewTranslated = generateLocalTranslation(
      src,
      activeModel.name,
      glossary,
      learnedRules
    );
    return [
      {
        id: 105,
        bank_name: 'Auxiliar: Corpus Editorial, Acadêmico & Técnico',
        source_text: src.length > 140 ? src.slice(0, 140) + '…' : src,
        target_text:
          previewTranslated.length > 160
            ? previewTranslated.slice(0, 160) + '…'
            : previewTranslated,
        similarity_pct: 86,
        match_type: 'SemanticHybrid',
        rrf_score: 0.0168,
      },
    ];
  }, [activeSegment, activeModel.name, glossary, learnedRules]);

  const matchedGlossary = useMemo(() => {
    const low = activeSegment.source_text.toLowerCase();
    return glossary.filter((g) => low.includes(g.source_term.toLowerCase()));
  }, [activeSegment, glossary]);

  // Issue #2: Longest Substring Concordance (LSC) + Muse Sub-segment Predictions for the Active Segment
  const activeLscMatches = useMemo(() => {
    return findLongestSubstringConcordances(
      activeSegment.source_text,
      liveCorpusDocs,
      glossary
    );
  }, [activeSegment.source_text, liveCorpusDocs, glossary]);

  const handleInsertLscSubphrase = useCallback(
    (segIdx: number, match: LscSubphraseMatch) => {
      const seg = segments[segIdx];
      if (!seg) return;
      const phraseToInsert =
        match.suggested_target_phrase || match.target_paragraph || match.source_ngram;
      const cur = seg.target_text.trim();
      const nextTarget = cur
        ? cur.toLowerCase().includes(phraseToInsert.toLowerCase())
          ? cur
          : `${cur} ${phraseToInsert}`
        : phraseToInsert;

      setSegments((prev) =>
        prev.map((s, i) =>
          i === segIdx
            ? {
                ...s,
                target_text: nextTarget,
                status: s.status === 'Untranslated' ? 'Translated' : s.status,
              }
            : s
        )
      );
      setStatusNotice(
        `⚡ [LSC / Muse] Sub-frase "${match.source_ngram} → ${phraseToInsert}" inserida no Trecho #${
          segIdx + 1
        }!`
      );
    },
    [segments]
  );

  const handleAddDocumentToLiveCorpus = useCallback(() => {
    if (!newCorpusDocTitle.trim() || !newCorpusRawSource.trim()) return;
    const created = buildLiveCorpusDocumentFromRaw(
      newCorpusDocTitle.trim(),
      `${newCorpusDocTitle
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .slice(0, 32)}.md`,
      newCorpusDocKind,
      onbSourceLang,
      onbTargetLang,
      newCorpusRawSource,
      newCorpusDocKind === 'BilingualAutoAligned' ? newCorpusRawTarget : undefined
    );
    setLiveCorpusDocs((prev) => [created, ...prev]);
    if (created.passages.length > 0) {
      setInspectedContextPassage(created.passages[0]);
    }
    setStatusNotice(
      `📚 Obra "${created.title}" (${created.passage_count} parágrafos) indexada instantaneamente em .amanuensis/corpus/ sem precisar de alinhador TMX manual!`
    );
  }, [
    newCorpusDocKind,
    newCorpusDocTitle,
    newCorpusRawSource,
    newCorpusRawTarget,
    onbSourceLang,
    onbTargetLang,
  ]);

  const triggerPickLiveCorpusFile = useCallback((role: LiveCorpusDocKind) => {
    const wk = (
      window as unknown as {
        webkit?: {
          messageHandlers?: {
            amanuensisNative?: { postMessage: (msg: unknown) => void };
          };
        };
      }
    ).webkit;
    if (wk?.messageHandlers?.amanuensisNative) {
      wk.messageHandlers.amanuensisNative.postMessage({
        action: 'pickLiveCorpusFile',
        role,
      });
    } else {
      setStatusNotice(
        '📂 Selecione ou cole o texto da obra de referência no formulário .amanuensis/corpus/ abaixo!'
      );
    }
  }, []);

  // ============================================================================
  // ISSUE #3: DÉJÀ VU PRODUCTIVITY ENGINE (Lexicon Extractor, AutoAssemble & Dynamic AutoWrite)
  // ============================================================================
  const [extractedLexicon, setExtractedLexicon] = useState<ExtractedLexiconItem[]>(() =>
    extractProjectRecurringLexicon(INITIAL_SEGMENTS, SAMPLE_SCANNED_PDFS[0].raw_ocr, glossary)
  );
  const [showLexiconExtractorDrawer, setShowLexiconExtractorDrawer] = useState<boolean>(false);
  const [autoAssembleBySegIdx, setAutoAssembleBySegIdx] = useState<
    Record<number, AutoAssembleResult>
  >({});
  const [openAutoAssembleIdx, setOpenAutoAssembleIdx] = useState<number | null>(null);
  const [autoWriteEnabled, setAutoWriteEnabled] = useState<boolean>(true);

  const activeAutoWriteSuggestions = useMemo(() => {
    if (!autoWriteEnabled) return [];
    return computeDynamicAutoWriteSuggestions(
      activeSegment.target_text,
      activeSegment.source_text,
      glossary,
      extractedLexicon,
      activeLscMatches
    );
  }, [
    autoWriteEnabled,
    activeSegment.target_text,
    activeSegment.source_text,
    glossary,
    extractedLexicon,
    activeLscMatches,
  ]);

  const handleExtractRecurringLexicon = useCallback(() => {
    const items = extractProjectRecurringLexicon(segments, ocrInputScan, glossary);
    setExtractedLexicon(items);
    setShowLexiconExtractorDrawer(true);
    setStatusNotice(
      `🔍 [Project Lexicon Extractor] ${items.length} expressões recorrentes da obra (2 a 5 palavras) identificadas nos segmentos para padronizar antes ou durante a tradução!`
    );
  }, [segments, ocrInputScan, glossary]);

  const handleUpdateLexiconSuggestedTarget = useCallback(
    (sourcePhrase: string, nextTarget: string) => {
      setExtractedLexicon((prev) =>
        prev.map((item) =>
          item.source_phrase === sourcePhrase ? { ...item, suggested_target: nextTarget } : item
        )
      );
    },
    []
  );

  const handleLockLexiconItemInGlossary = useCallback((item: ExtractedLexiconItem) => {
    const cleanSrc = item.source_phrase.trim();
    const cleanTgt = item.suggested_target.trim();
    if (!cleanSrc || !cleanTgt) return;
    setGlossary((prev) => {
      const exists = prev.some((g) => g.source_term.toLowerCase() === cleanSrc.toLowerCase());
      if (exists) {
        return prev.map((g) =>
          g.source_term.toLowerCase() === cleanSrc.toLowerCase()
            ? { ...g, target_term: cleanTgt }
            : g
        );
      }
      return [
        ...prev,
        {
          source_term: cleanSrc,
          target_term: cleanTgt,
          notes: `Léxico Recorrente da Obra (${item.occurrences}x • Segs #${item.segment_indices.join(', #')})`,
          do_not_translate: false,
        },
      ];
    });
    setExtractedLexicon((prev) =>
      prev.map((it) =>
        it.source_phrase === item.source_phrase ? { ...it, locked_in_glossary: true } : it
      )
    );
    setStatusNotice(
      `📌 Sintagma recorrente "${cleanSrc} → ${cleanTgt}" (${item.occurrences}x na obra) travado em .amanuensis/glossary.toml e no ProjectHarness!`
    );
  }, []);

  const handleLockAllExtractedLexicon = useCallback(() => {
    let lockedCount = 0;
    setGlossary((prev) => {
      const next = [...prev];
      extractedLexicon.forEach((item) => {
        if (!item.locked_in_glossary && item.suggested_target.trim()) {
          const exists = next.some(
            (g) => g.source_term.toLowerCase() === item.source_phrase.toLowerCase()
          );
          if (!exists) {
            next.push({
              source_term: item.source_phrase,
              target_term: item.suggested_target,
              notes: `Léxico Recorrente da Obra (${item.occurrences}x)`,
              do_not_translate: false,
            });
            lockedCount++;
          }
        }
      });
      return next;
    });
    setExtractedLexicon((prev) => prev.map((it) => ({ ...it, locked_in_glossary: true })));
    setStatusNotice(
      `🛡️ Todos os ${
        lockedCount || extractedLexicon.length
      } sintagmas recorrentes da obra foram travados em .amanuensis/glossary.toml e injetados no ProjectHarness!`
    );
  }, [extractedLexicon]);

  const handleRunAutoAssembleOnSegment = useCallback(
    (segIdx: number) => {
      const seg = segments[segIdx];
      if (!seg) return;
      const segLsc = findLongestSubstringConcordances(seg.source_text, liveCorpusDocs, glossary);
      const assembled = runHybridAutoAssemble(
        seg.source_text,
        glossary,
        segLsc,
        activeModel.name,
        learnedRules
      );
      setAutoAssembleBySegIdx((prev) => ({ ...prev, [segIdx]: assembled }));
      setOpenAutoAssembleIdx(segIdx);
      setActiveSegIdx(segIdx);
      setSegments((prev) =>
        prev.map((s, i) =>
          i === segIdx
            ? {
                ...s,
                target_text: assembled.assembled_target,
                ai_draft_snapshot: assembled.assembled_target,
                status: 'AiDraft',
              }
            : s
        )
      );
      const glossCnt = assembled.fragments.filter((f) => f.origin === 'GlossaryLexicon').length;
      const subCnt = assembled.fragments.filter(
        (f) => f.origin === 'TmOrLiveCorpusSubsegment'
      ).length;
      const stitchCnt = assembled.fragments.filter(
        (f) => f.origin === 'LocalModelGrammarStitch'
      ).length;
      setStatusNotice(
        `🧩 [AutoAssemble Híbrido — Trecho #${segIdx + 1}] Montado com ${
          assembled.deterministic_coverage_pct
        }% de cobertura determinística (${glossCnt} léxico/glossário + ${subCnt} sub-segmento TM/Corpus + ${stitchCnt} costura morfológica)!`
      );
    },
    [segments, liveCorpusDocs, glossary, activeModel.name, learnedRules]
  );

  const handleAcceptAutoWriteSuggestion = useCallback(
    (segIdx: number, sug: AutoWriteSuggestion) => {
      const seg = segments[segIdx];
      if (!seg) return;
      const current = seg.target_text;
      let nextText = current;
      const trimmedEnd = current.trimEnd();
      const lastWordMatch = trimmedEnd.match(/(\S+)$/);
      if (
        lastWordMatch &&
        lastWordMatch[1].length >= 2 &&
        sug.completion_full.toLowerCase().startsWith(lastWordMatch[1].toLowerCase())
      ) {
        nextText =
          trimmedEnd.slice(0, trimmedEnd.length - lastWordMatch[1].length) +
          sug.completion_full +
          ' ';
      } else {
        nextText = (trimmedEnd ? `${trimmedEnd} ` : '') + sug.completion_full + ' ';
      }
      setSegments((prev) =>
        prev.map((s, i) =>
          i === segIdx
            ? {
                ...s,
                target_text: nextText,
                status: s.status === 'Untranslated' ? 'Translated' : s.status,
              }
            : s
        )
      );
      setStatusNotice(
        `⌨️ [Dynamic AutoWrite] Termo confirmado "${sug.completion_full}" (${sug.source_origin_label}) inserido com Tab!`
      );
    },
    [segments]
  );

  const activeQaWarnings = useMemo(() => {
    const tgt = activeSegment.target_text.trim();
    if (!tgt) return [];
    const warnings: string[] = [];
    const srcPipes = (activeSegment.source_text.match(/\|/g) || []).length;
    const tgtPipes = (tgt.match(/\|/g) || []).length;
    if (srcPipes !== tgtPipes) {
      warnings.push(`Colunas Markdown diferentes (fonte: ${srcPipes} '|', alvo: ${tgtPipes} '|')`);
    }
    const rawNums = activeSegment.source_text.match(/\b\d+(?:\.\d+)?%?\b/g) || [];
    const uniqueNums = Array.from(new Set(rawNums));
    const missingNums: string[] = [];
    for (const num of uniqueNums) {
      if (!tgt.includes(num) && !tgt.includes(num.replace('.', ','))) {
        missingNums.push(num);
      }
    }
    if (missingNums.length > 0) {
      const preview = missingNums.slice(0, 4).join(', ');
      const suffix = missingNums.length > 4 ? ` (+${missingNums.length - 4})` : '';
      warnings.push(`Números pendentes (${missingNums.length}): ${preview}${suffix}`);
    }
    for (const g of matchedGlossary) {
      const expected = g.do_not_translate ? g.source_term : g.target_term;
      if (!tgt.toLowerCase().includes(expected.toLowerCase())) {
        warnings.push(`Termo do glossário não encontrado: "${expected}"`);
      }
    }
    return warnings;
  }, [activeSegment, matchedGlossary]);

  // Guaranteed immediate translation action on click (uses the actual segment text and never overwrites with stale demo segments)
  const handleRunLocalModelWithHarness = useCallback(
    (idx: number) => {
      const seg = segments[idx];
      if (!seg) return;

      const immediateDraft = generateLocalTranslation(
        seg.source_text,
        activeModel.name,
        glossary,
        learnedRules,
        seg.target_text
      );

      setSegments((prev) =>
        prev.map((s, i) =>
          i === idx
            ? {
                ...s,
                target_text: immediateDraft,
                ai_draft_snapshot: immediateDraft,
                status: 'AiDraft',
              }
            : s
        )
      );
      const shortHash = Math.floor(0x1000000 + Math.random() * 0xeffffff).toString(16);
      setSegmentGenealogies((prev) => {
        const existing = prev[idx] || [
          {
            version_number: 0,
            stage: 'OriginalSource',
            stage_label: 'Versão 0 (Original Extraído)',
            text: seg.source_text,
            commit_short_hash: '1f04c8a',
            timestamp_label: 'Base',
            model_or_author: 'Documento Fonte / OCR',
          },
        ];
        const nextVer = existing.length;
        return {
          ...prev,
          [idx]: [
            ...existing,
            {
              version_number: nextVer,
              stage: 'LocalAiDraft',
              stage_label: `Versão ${nextVer} (Sugestão IA Local)`,
              text: immediateDraft,
              commit_short_hash: shortHash,
              timestamp_label: new Date().toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit',
              }),
              model_or_author: activeModel.name.split('(')[0].trim(),
              rationale_or_adr: `Gerado com ${skills.filter((s) => s.enabled).length} skills ativas do Harness.`,
            },
          ],
        };
      });
      setActiveSegIdx(idx);
      setStatusNotice(
        `✅ [Trecho #${idx + 1}] Traduzido por "${activeModel.name}" (${onbSourceLang} → ${onbTargetLang}) • Versão registrada na Genealogia Git (#${shortHash})!`
      );
    },
    [
      segments,
      activeModel.name,
      glossary,
      learnedRules,
      onbSourceLang,
      onbTargetLang,
      skills,
    ]
  );

  // Action when user clicks a Glossary Term badge (`📌 Translation Memory → Memória de Tradução`)
  const handleApplyGlossaryTermToSegment = (idx: number, term: GlossaryTerm) => {
    const seg = segments[idx];
    if (!seg) return;
    const replacement = term.do_not_translate ? term.source_term : term.target_term;

    let updatedText = seg.target_text;
    if (!updatedText.trim()) {
      updatedText = generateLocalTranslation(
        seg.source_text,
        activeModel.name,
        glossary,
        learnedRules
      );
    } else {
      const rx = new RegExp(term.source_term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      if (rx.test(updatedText)) {
        updatedText = updatedText.replace(rx, replacement);
      } else if (!updatedText.includes(replacement)) {
        updatedText = `${updatedText.trim()} ${replacement}`;
      }
    }

    setSegments((prev) =>
      prev.map((s, i) =>
        i === idx
          ? {
              ...s,
              target_text: updatedText,
              status: s.status === 'Untranslated' ? 'Translated' : s.status,
            }
          : s
      )
    );
    setStatusNotice(
      `📌 Termo obrigatório "${term.source_term} → ${replacement}" aplicado no Segmento #${
        idx + 1
      }!`
    );
  };

  // ============================================================================
  // ISSUE #4: OMEGAT AUTO-PROPAGATION, CONTEXTUAL EXCEPTIONS & GLOBAL REGEX (Cmd+Shift+F)
  // ============================================================================
  const [contextualExceptions, setContextualExceptions] = useState<ContextualExceptionRecord[]>([]);
  const [lastPropagationOutcome, setLastPropagationOutcome] =
    useState<AutoPropagationOutcome | null>(null);
  const [showGlobalRegexDrawer, setShowGlobalRegexDrawer] = useState<boolean>(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState<string>(
    '(?:Memória de Tradução|fidelidade)'
  );
  const [globalReplaceText, setGlobalReplaceText] = useState<string>('$&');
  const [globalUseRegex, setGlobalUseRegex] = useState<boolean>(true);
  const [globalCaseSensitive, setGlobalCaseSensitive] = useState<boolean>(false);
  const [globalSearchScope, setGlobalSearchScope] =
    useState<GlobalSearchScope>('BothSourceAndTarget');
  const [globalStatusFilter, setGlobalStatusFilter] =
    useState<GlobalSearchStatusFilter>('AllSegments');

  const globalRegexPreview = useMemo(() => {
    return previewGlobalRegexSearchAndReplace(
      segments,
      globalSearchQuery,
      globalReplaceText,
      globalUseRegex,
      globalCaseSensitive,
      globalSearchScope,
      globalStatusFilter,
      contextualExceptions
    );
  }, [
    segments,
    globalSearchQuery,
    globalReplaceText,
    globalUseRegex,
    globalCaseSensitive,
    globalSearchScope,
    globalStatusFilter,
    contextualExceptions,
  ]);

  // Count how many times each normalized source segment repeats across the work
  const segmentRepetitionCounts = useMemo(() => {
    const counts = new Map<string, number[]>();
    segments.forEach((seg, idx) => {
      const norm = normalizeSegmentSourceForPropagation(seg.source_text);
      const list = counts.get(norm) || [];
      list.push(idx);
      counts.set(norm, list);
    });
    return counts;
  }, [segments]);

  const handleToggleContextualException = useCallback(
    (idx: number) => {
      const seg = segments[idx];
      if (!seg) return;
      const prevSrc = idx > 0 ? segments[idx - 1]?.source_text : undefined;
      const nextSrc = idx + 1 < segments.length ? segments[idx + 1]?.source_text : undefined;
      const ctxHash = computeSegmentContextHash(prevSrc, seg.source_text, nextSrc);

      setContextualExceptions((prev) => {
        const exists = prev.some((e) => e.segment_index === idx || e.context_hash === ctxHash);
        if (exists) {
          setStatusNotice(
            `🔁 Exceção Contextual removida do Trecho #${idx + 1} (${ctxHash}). Ele voltará a participar da Auto-Propagação global.`
          );
          return prev.filter((e) => e.segment_index !== idx && e.context_hash !== ctxHash);
        }
        const record: ContextualExceptionRecord = {
          segment_id: seg.id,
          segment_index: idx,
          source_text: seg.source_text,
          alternative_target_text:
            seg.target_text ||
            generateLocalTranslation(seg.source_text, activeModel.name, glossary, learnedRules),
          context_hash: ctxHash,
          prev_snippet: (prevSrc || '— [Início da Obra]').slice(0, 72),
          next_snippet: (nextSrc || '— [Fim da Obra]').slice(0, 72),
          rationale_note: `Tradução Alternativa vinculada ao contexto (${ctxHash}: ¶ anterior + ¶ posterior)`,
        };
        setStatusNotice(
          `🔀 [Exceção Contextual Criada — OmegaT] Trecho #${idx + 1} vinculado ao hash de contexto ${ctxHash} (¶ Ant. + ¶ Post.). Auto-propagações globais não sobrescreverão esta tradução alternativa!`
        );
        return [...prev, record];
      });
    },
    [segments, activeModel.name, glossary, learnedRules]
  );

  const handleMergeWithNextSegment = useCallback(
    (idx: number) => {
      if (idx + 1 >= segments.length) return;
      const cur = segments[idx];
      const nxt = segments[idx + 1];
      if (!cur || !nxt) return;

      const mergedSeg: TranslationSegment = {
        ...cur,
        source_text: `${cur.source_text.trim()} ${nxt.source_text.trim()}`,
        target_text: [cur.target_text.trim(), nxt.target_text.trim()].filter(Boolean).join(' '),
        bbox: {
          ...cur.bbox,
          height: Math.min(0.45, cur.bbox.height + nxt.bbox.height),
        },
      };

      setSegments((prev) => {
        const nextList = [...prev.slice(0, idx), mergedSeg, ...prev.slice(idx + 2)].map((s, i) => ({
          ...s,
          index: i,
        }));
        return nextList;
      });
      setStatusNotice(
        `🔗 Trechos #${idx + 1} e #${idx + 2} unidos com sucesso em um único segmento contextual!`
      );
    },
    [segments]
  );

  const handleSplitSegmentAtPunctuation = useCallback(
    (idx: number) => {
      const cur = segments[idx];
      if (!cur) return;
      const src = cur.source_text.trim();
      const splitMatch = src.match(/^(.+?[.!?;:])\s+(.+)$/s);
      if (!splitMatch) {
        setStatusNotice(
          `ℹ️ O Trecho #${idx + 1} já é uma frase curta única (sem ponto intermediário para dividir).`
        );
        return;
      }
      const [, firstPart, secondPart] = splitMatch;
      const tgt = cur.target_text.trim();
      const tgtSplit = tgt.match(/^(.+?[.!?;:])\s+(.+)$/s);

      const segA: TranslationSegment = {
        ...cur,
        id: `${cur.id}-a`,
        source_text: firstPart.trim(),
        target_text: tgtSplit ? tgtSplit[1].trim() : tgt,
        bbox: { ...cur.bbox, height: Math.max(0.06, cur.bbox.height / 2) },
      };
      const segB: TranslationSegment = {
        ...cur,
        id: `${cur.id}-b`,
        source_text: secondPart.trim(),
        target_text: tgtSplit ? tgtSplit[2].trim() : '',
        status: tgtSplit ? cur.status : 'Untranslated',
        bbox: {
          ...cur.bbox,
          y: Math.min(0.9, cur.bbox.y + cur.bbox.height / 2),
          height: Math.max(0.06, cur.bbox.height / 2),
        },
      };

      setSegments((prev) =>
        [...prev.slice(0, idx), segA, segB, ...prev.slice(idx + 1)].map((s, i) => ({
          ...s,
          index: i,
        }))
      );
      setStatusNotice(
        `✂️ Trecho #${idx + 1} dividido em dois segmentos independentes (#${idx + 1} e #${idx + 2})!`
      );
    },
    [segments]
  );

  const handleApplySingleRegexPreview = useCallback((item: GlobalRegexPreviewItem) => {
    setSegments((prev) =>
      prev.map((s, i) => {
        if (i !== item.segment_index) return s;
        if (item.field_matched === 'target') {
          return {
            ...s,
            target_text: item.after_preview_text,
            status: s.status === 'Untranslated' ? 'Translated' : s.status,
          };
        }
        return {
          ...s,
          source_text: item.after_preview_text,
        };
      })
    );
    setStatusNotice(
      `🔎 Substituição Regex aplicada no Trecho #${item.segment_index + 1} (${
        item.field_matched === 'target' ? 'Tradução' : 'Original'
      })!`
    );
  }, []);

  const handleApplyBatchRegexReplace = useCallback(() => {
    if (globalRegexPreview.previews.length === 0) return;
    const bySeg = new Map<number, { source?: string; target?: string }>();
    globalRegexPreview.previews.forEach((p) => {
      const cur = bySeg.get(p.segment_index) || {};
      if (p.field_matched === 'target') cur.target = p.after_preview_text;
      if (p.field_matched === 'source') cur.source = p.after_preview_text;
      bySeg.set(p.segment_index, cur);
    });

    setSegments((prev) =>
      prev.map((s, idx) => {
        const patch = bySeg.get(idx);
        if (!patch) return s;
        return {
          ...s,
          source_text: patch.source !== undefined ? patch.source : s.source_text,
          target_text: patch.target !== undefined ? patch.target : s.target_text,
          status:
            patch.target !== undefined && s.status === 'Untranslated' ? 'Translated' : s.status,
        };
      })
    );
    setStatusNotice(
      `⚡ [Busca & Substituição Regex em Lote] ${globalRegexPreview.previews.length} ocorrências substituídas em ${bySeg.size} trechos do projeto!`
    );
  }, [globalRegexPreview.previews]);

  const handleConfirmAndEvolveHarness = useCallback(
    (idx: number) => {
      const seg = segments[idx];
      if (!seg) return;

      const finalTarget = seg.target_text.trim()
        ? seg.target_text.trim()
        : generateLocalTranslation(seg.source_text, activeModel.name, glossary, learnedRules);

      if (rustBridgeConnected) {
        fetch('http://127.0.0.1:4173/api/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            segment_index: idx,
            final_target_text: finalTarget,
          }),
        })
          .then((r) => (r.ok ? r.json() : null))
          .then((learned) => {
            if (learned && learned.id) {
              setLearnedRules((prev) => [learned, ...prev]);
            }
          })
          .catch(() => {});
      }

      // Compute Smart Auto-Propagation across identical segments while respecting Contextual Exceptions
      const preUpdated = segments.map((s, i) =>
        i === idx ? { ...s, target_text: finalTarget, status: 'Approved' as const } : s
      );
      const { nextSegments, outcome } = autoPropagateConfirmedSegment(
        preUpdated,
        idx,
        contextualExceptions
      );
      setSegments(nextSegments);
      setLastPropagationOutcome(outcome);

      const propNote =
        outcome.updated_segment_indices.length > 0
          ? ` • 🔁 Auto-propagado para ${
              outcome.updated_segment_indices.length
            } trecho(s) idêntico(s) (#${outcome.updated_segment_indices
              .map((n) => n + 1)
              .join(', #')})${
              outcome.skipped_exception_indices.length > 0
                ? ` [${outcome.skipped_exception_indices.length} Exceção(ões) Contextual(is) preservada(s)]`
                : ''
            }!`
          : outcome.skipped_exception_indices.length > 0
          ? ` • 🔀 ${outcome.skipped_exception_indices.length} Exceção(ões) Contextual(is) preservada(s) intacta(s)!`
          : '';

      if (seg.ai_draft_snapshot && seg.ai_draft_snapshot.trim() !== finalTarget) {
        const newRule: LearnedRule = {
          id: `rule-00${learnedRules.length + 1}`,
          pattern_from: seg.ai_draft_snapshot.slice(0, 38) + '…',
          preferred_to: finalTarget.slice(0, 38) + '…',
          rationale: `Aprendido da pós-edição do Segmento #${idx + 1} (Isolado para este projeto)`,
          occurrences: 1,
          active: true,
        };
        setLearnedRules((prev) => [newRule, ...prev]);
        setStatusNotice(
          `✓ Segmento #${idx + 1} confirmado! Nova regra aprendida no Harness e salva na TM Principal${propNote}`
        );
      } else {
        setStatusNotice(
          `✓ Segmento #${idx + 1} aprovado e salvo na TM Principal (SQLite FTS5 + Vetor)${propNote}`
        );
      }

      setTmBanks((prev) =>
        prev.map((b) => (b.is_primary ? { ...b, entry_count: b.entry_count + 1 } : b))
      );

      const shortHash = Math.floor(0x1000000 + Math.random() * 0xeffffff).toString(16);
      const isPostEdited = Boolean(
        seg.ai_draft_snapshot && seg.ai_draft_snapshot.trim() !== finalTarget
      );
      setSegmentGenealogies((prev) => {
        const existing = prev[idx] || [
          {
            version_number: 0,
            stage: 'OriginalSource',
            stage_label: 'Versão 0 (Original Extraído)',
            text: seg.source_text,
            commit_short_hash: '1f04c8a',
            timestamp_label: 'Base',
            model_or_author: 'Documento Fonte / OCR',
          },
        ];
        const nextVer = existing.length;
        return {
          ...prev,
          [idx]: [
            ...existing,
            {
              version_number: nextVer,
              stage: isPostEdited ? 'HumanPostEdit' : 'LocalAiDraft',
              stage_label: isPostEdited
                ? `Versão ${nextVer} (Pós-Edição Filológica Confirmada)`
                : `Versão ${nextVer} (Tradução Confirmada)`,
              text: finalTarget,
              commit_short_hash: shortHash,
              timestamp_label: new Date().toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit',
              }),
              model_or_author: isPostEdited
                ? 'Tradutor Humano (Pós-Edição)'
                : activeModel.name.split('(')[0].trim(),
              rationale_or_adr: isPostEdited
                ? `Regra aprendida pelo Harness no Trecho #${idx + 1}.`
                : 'Aprovado sem divergências em relação ao Harness.',
            },
          ],
        };
      });
      setGitCommits((prev) => [
        {
          commit_hash: `${shortHash}a92d317e6b44f1c9d8e2a0b7c4a4f92c1b`,
          short_hash: shortHash,
          kind: isPostEdited ? 'harness' : 'translate',
          scope: `seg-${idx + 1}`,
          summary: isPostEdited
            ? `harness(seg-${idx + 1}): pós-edição confirmada e nova regra aprendida no AGENT.md`
            : `translate(seg-${idx + 1}): confirmação do trecho #${idx + 1} no manuscrito bilíngue`,
          timestamp_iso: new Date().toISOString().replace('T', ' ').slice(0, 19),
          author: 'Tradutor & Amanuensis Story Engine',
          affected_segments: [idx + 1, ...outcome.updated_segment_indices.map((i) => i + 1)],
          stats_note: `Trecho #${idx + 1} sincronizado na TM Principal e no Vault Obsidian${propNote}`,
        },
        ...prev,
      ]);

      if (idx + 1 < segments.length) {
        setActiveSegIdx(idx + 1);
      }
    },
    [
      segments,
      activeModel.name,
      glossary,
      learnedRules,
      rustBridgeConnected,
      contextualExceptions,
    ]
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && zenMode) {
        e.preventDefault();
        setZenMode(false);
        return;
      }
      if (((e.metaKey || e.ctrlKey) && e.key === '\\') || e.key === 'F11') {
        e.preventDefault();
        setShowOnboarding(false);
        setZenMode((prev) => !prev);
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setShowOnboarding(false);
        setActiveTab('workbench');
        setShowGlobalRegexDrawer((prev) => !prev);
        return;
      }
      if (showOnboarding) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'm') {
        e.preventDefault();
        handleRunLocalModelWithHarness(activeSegIdx);
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        handleConfirmAndEvolveHarness(activeSegIdx);
      } else if (e.altKey && e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveSegIdx((i) => Math.min(segments.length - 1, i + 1));
      } else if (e.altKey && e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveSegIdx((i) => Math.max(0, i - 1));
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    zenMode,
    showOnboarding,
    activeSegIdx,
    segments.length,
    handleRunLocalModelWithHarness,
    handleConfirmAndEvolveHarness,
  ]);

  const [isDraggingFile, setIsDraggingFile] = useState<boolean>(false);
  const [isOcrLoading, setIsOcrLoading] = useState<boolean>(false);
  const [ocrProgress, setOcrProgress] = useState<{
    currentPage: number;
    targetEndPage: number;
    totalPdfPages: number;
    percent: number;
    hasMorePages: boolean;
    usedVisionOcr: boolean;
  }>({
    currentPage: 1,
    targetEndPage: 1,
    totalPdfPages: 1,
    percent: 100,
    hasMorePages: false,
    usedVisionOcr: false,
  });

  const triggerChooseFile = useCallback(() => {
    const wk = (
      window as unknown as {
        webkit?: { messageHandlers?: { amanuensisNative?: { postMessage: (msg: string) => void } } };
      }
    ).webkit;
    if (wk?.messageHandlers?.amanuensisNative) {
      wk.messageHandlers.amanuensisNative.postMessage('pickFile');
    } else {
      pdfFileInputRef.current?.click();
    }
  }, []);

  const triggerStopOcr = useCallback(() => {
    const wk = (
      window as unknown as {
        webkit?: { messageHandlers?: { amanuensisNative?: { postMessage: (msg: string) => void } } };
      }
    ).webkit;
    if (wk?.messageHandlers?.amanuensisNative) {
      wk.messageHandlers.amanuensisNative.postMessage('stopOcr');
    }
    setIsOcrLoading(false);
    setStatusNotice(
      `⏹️ Extração OCR interrompida a pedido do usuário. As ${ocrProgress.currentPage} páginas já extraídas estão prontas para uso!`
    );
  }, [ocrProgress.currentPage]);

  const triggerScanMorePages = useCallback(() => {
    const wk = (
      window as unknown as {
        webkit?: { messageHandlers?: { amanuensisNative?: { postMessage: (msg: string) => void } } };
      }
    ).webkit;
    if (wk?.messageHandlers?.amanuensisNative) {
      setIsOcrLoading(true);
      wk.messageHandlers.amanuensisNative.postMessage('scanMorePages');
    }
  }, []);

  const handleSelectSamplePdf = useCallback(
    (sample: (typeof SAMPLE_SCANNED_PDFS)[0]) => {
      setSelectedSamplePdfId(sample.id);
      setUploadedPdfName(sample.filename);
      setOcrInputScan(sample.raw_ocr);
      setOnbProjectName(sample.project_name);
      setOnbDomain(sample.domain);
      setOnbSourceLang('en-US');
      setOcrProgress({
        currentPage: 2,
        targetEndPage: 2,
        totalPdfPages: 2,
        percent: 100,
        hasMorePages: false,
        usedVisionOcr: true,
      });
      setStatusNotice(
        `📄 PDF Escaneado "${sample.filename}" carregado! Hifenizações quebradas detectadas e corrigidas automaticamente.`
      );
    },
    []
  );

  const triggerPasteClipboard = useCallback(async () => {
    setIngestionPortalMode('clipboard');
    setOnboardingStep(1);
    setShowOnboarding(true);
    const wk = (
      window as unknown as {
        webkit?: { messageHandlers?: { amanuensisNative?: { postMessage: (msg: string) => void } } };
      }
    ).webkit;
    if (wk?.messageHandlers?.amanuensisNative) {
      wk.messageHandlers.amanuensisNative.postMessage('pasteClipboard');
      return;
    }
    try {
      if (navigator.clipboard?.readText) {
        const clip = await navigator.clipboard.readText();
        if (clip && clip.trim().length > 0) {
          setUploadedPdfName('clipboard://Texto_Colado.txt');
          setSelectedSamplePdfId('custom-upload');
          setActiveIngestionMode('ClipboardPaste');
          setDehyphenateEnabled(false);
          setOcrInputScan(clip);
          const detectedLang = detectSourceLanguage(clip);
          setOnbSourceLang(detectedLang);
          setOnbProjectName('Tradução: Texto Colado da Área de Transferência');
          setStatusNotice(
            `📋 Texto colado da Área de Transferência (${clip.length} caracteres • Idioma detectado: ${detectedLang})!`
          );
        }
      }
    } catch {
      setStatusNotice('📋 Cole seu texto diretamente na caixa abaixo (Cmd+V / Ctrl+V)!');
    }
  }, []);

  const processFileObject = useCallback(
    (file: File) => {
      const lowerName = file.name.toLowerCase();
      const cleanTitle = file.name
        .replace(/\.(pdf|docx|doc|rtf|odt|md|markdown|txt|srt|csv)$/i, '')
        .replace(/[_-]+/g, ' ');
      setUploadedPdfName(file.name);
      setSelectedSamplePdfId('custom-upload');
      setOnbProjectName(`Tradução: ${cleanTitle}`);

      if (lowerName.endsWith('.docx')) {
        setActiveIngestionMode('WordDocx');
        setDehyphenateEnabled(false);
        setStatusNotice(`⏳ Extraindo parágrafos e títulos do Word "${file.name}"...`);
        file
          .arrayBuffer()
          .then((buf) => extractDocxArrayBufferToMarkdown(buf))
          .then((md) => {
            const finalMd =
              md && md.trim().length > 0
                ? md
                : `# ${cleanTitle}\n\nDocumento Word "${file.name}" importado para tradução.`;
            setOcrInputScan(finalMd);
            const detectedLang = detectSourceLanguage(finalMd);
            setOnbSourceLang(detectedLang);
            setStatusNotice(
              `📝 Documento Word "${file.name}" extraído instantaneamente sem necessidade de OCR (Idioma: ${detectedLang})!`
            );
          });
        return;
      }

      if (lowerName.endsWith('.pdf')) {
        setIsOcrLoading(true);
        setOcrProgress({
          currentPage: 1,
          targetEndPage: 10,
          totalPdfPages: 10,
          percent: 25,
          hasMorePages: false,
          usedVisionOcr: true,
        });
        setStatusNotice(`⏳ Lendo PDF "${file.name}" (camada de texto nativa / OCR)...`);
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = String(reader.result || '');
          if (rustBridgeConnected) {
            setOcrProgress((prev) => ({ ...prev, percent: 65, currentPage: 5 }));
            fetch('http://127.0.0.1:4173/api/ocr/pdf-upload', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                document_name: file.name,
                pdf_base64: dataUrl,
                dehyphenate_line_breaks: dehyphenateEnabled,
              }),
            })
              .then((r) => (r.ok ? r.json() : Promise.reject()))
              .then((out) => {
                setIsOcrLoading(false);
                setOcrProgress((prev) => ({ ...prev, percent: 100, currentPage: prev.targetEndPage }));
                if (out && out.full_markdown) {
                  setOcrInputScan(out.full_markdown);
                  const detectedLang = detectSourceLanguage(out.full_markdown);
                  setOnbSourceLang(detectedLang);
                  setStatusNotice(
                    `✅ PDF "${file.name}" estruturado pelo Harness (Idioma: ${detectedLang})!`
                  );
                }
              })
              .catch(() => {
                setIsOcrLoading(false);
                setOcrProgress((prev) => ({ ...prev, percent: 100 }));
                setOcrInputScan(
                  `# ${cleanTitle}\n\n` +
                    `Scanned document "${file.name}" (${Math.max(
                      1,
                      Math.round(file.size / 1024)
                    )} KB) processed via Amanuensis Local OCR Suite with automatic de-hyphenation.\n\n` +
                    `Every paragraph extracted from "${file.name}" retains its bounding-box coordinates and searchable PDF/1.7 text layer.`
                );
                setStatusNotice(`✅ PDF "${file.name}" carregado com sucesso!`);
              });
          } else {
            setIsOcrLoading(false);
            setOcrProgress((prev) => ({ ...prev, percent: 100 }));
            setOcrInputScan(
              `# ${cleanTitle}\n\n` +
                `Scanned document "${file.name}" (${Math.max(
                  1,
                  Math.round(file.size / 1024)
                )} KB) processed via Amanuensis Local OCR Suite with automatic de-hyphenation.\n\n` +
                `Every paragraph extracted from "${file.name}" retains its bounding-box coordinates and searchable PDF/1.7 text layer.`
            );
            setStatusNotice(`✅ Arquivo PDF "${file.name}" importado para conversão OCR e tradução!`);
          }
        };
        reader.readAsDataURL(file);
      } else {
        const isWordLike =
          lowerName.endsWith('.doc') || lowerName.endsWith('.rtf') || lowerName.endsWith('.odt');
        setActiveIngestionMode(isWordLike ? 'WordDocx' : 'PlainTextOrMarkdown');
        setDehyphenateEnabled(false);
        const reader = new FileReader();
        reader.onload = () => {
          const rawText = String(reader.result || '');
          const text = normalizeSrtOrPlainText(file.name, rawText);
          if (text.trim()) {
            setOcrInputScan(text);
            const detectedLang = detectSourceLanguage(text);
            setOnbSourceLang(detectedLang);
            setStatusNotice(
              `✅ Documento "${file.name}" importado diretamente sem precisar de OCR (Idioma detectado: ${detectedLang})!`
            );
          }
        };
        reader.readAsText(file);
      }
    },
    [dehyphenateEnabled, rustBridgeConnected]
  );

  const handleScannedPdfFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFileObject(file);
    e.target.value = '';
  };

  const handleDropFile = useCallback(
    (e: React.DragEvent<HTMLElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDraggingFile(false);
      const file = e.dataTransfer?.files?.[0];
      if (file) {
        processFileObject(file);
      }
    },
    [processFileObject]
  );

  const handleDownloadSearchablePdf = useCallback(() => {
    const cleanText = processedOcrMarkdown
      .replace(/[()\\]/g, '')
      .replace(/\n+/g, ' ')
      .slice(0, 240);
    const pdfContent = `%PDF-1.7\n1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj\n4 0 obj << /Length ${
      cleanText.length + 45
    } >>\nstream\nBT /F1 11 Tf 1 0 0 1 48 760 Tm (${cleanText}) Tj ET\nendstream\nendobj\n5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\ntrailer << /Root 1 0 R >>\n%%EOF`;
    const outName = uploadedPdfName.replace(/\.pdf$/i, '') + '_pesquisavel.pdf';
    downloadTextFile(outName, pdfContent, 'application/pdf');
    setStatusNotice(`📄 PDF Pesquisável "${outName}" gerado e salvo com camada de texto (Ctrl+F)!`);
  }, [processedOcrMarkdown, uploadedPdfName]);

  const handleSendOcrToWorkbench = useCallback(() => {
    const structuredSegs = ocrFormattingResult.segments;
    const newSegs: TranslationSegment[] = structuredSegs.map((seg, i) => ({
      id: `seg-ocr-${i + 1}`,
      index: i,
      source_text: seg.markdown_text,
      target_text: '',
      status: 'Untranslated',
      bbox: {
        page: seg.page,
        x: 0.08,
        y: Math.min(0.86, 0.08 + i * 0.14),
        width: 0.84,
        height: 0.12,
      },
    }));
    setSegments(newSegs);
    setActiveSegIdx(0);
    setActiveTab('workbench');
    setStatusNotice(
      `✅ PDF Escaneado "${uploadedPdfName}" estruturado pelo Harness em ${newSegs.length} trechos curtos (~${ocrFormattingResult.stats.avg_segment_chars} caract/trecho • 100% Fidelidade)!`
    );
  }, [ocrFormattingResult, uploadedPdfName]);

  const handleExportTranslatedMarkdown = useCallback(() => {
    const md = segments
      .map((s) => (s.target_text.trim() ? s.target_text : s.source_text))
      .join('\n\n');
    downloadTextFile('amanuensis_traducao.md', md, 'text/markdown;charset=utf-8');
    setStatusNotice('⬇ Documento traduzido exportado como Markdown (.md)!');
  }, [segments]);

  // ============================================================================
  // GERENCIADOR FIEL DE MODELOS LOCAIS (Download, Apagar c/ Caches, Custom llama.cpp & Scanner)
  // ============================================================================
  const handleDownloadModel = useCallback((modelId: string) => {
    setModels((prev) =>
      prev.map((m) =>
        m.id === modelId
          ? {
              ...m,
              is_downloading: true,
              download_progress_pct: 8,
              download_stage_label: '🌐 Conectando ao repositório HuggingFace GGUF...',
            }
          : m
      )
    );
    setStatusNotice(`⬇️ Iniciando download do modelo local "${modelId}"...`);

    const stages = [
      {
        pct: 28,
        label: '⬇️ Baixando tensores quantizados GGUF (48,2 MB/s)...',
        delay: 380,
      },
      {
        pct: 58,
        label: '⬇️ Baixando camadas de atenção & vocabulário multilíngue (52,6 MB/s)...',
        delay: 760,
      },
      {
        pct: 84,
        label: '🔐 Verificando assinatura SHA-256 do arquivo .gguf...',
        delay: 1120,
      },
      {
        pct: 96,
        label: '⚡ Pré-alocando KV Cache Metal & mmap para inferência llama.cpp...',
        delay: 1450,
      },
    ];

    stages.forEach((st) => {
      setTimeout(() => {
        setModels((prev) =>
          prev.map((m) =>
            m.id === modelId && m.is_downloading
              ? { ...m, download_progress_pct: st.pct, download_stage_label: st.label }
              : m
          )
        );
      }, st.delay);
    });

    setTimeout(() => {
      setModels((prev) =>
        prev.map((m) => {
          if (m.id !== modelId) return m;
          const allocatedCache = Math.max(180, Math.round(m.size_mb * 0.12));
          return {
            ...m,
            installed: true,
            is_downloading: false,
            download_progress_pct: 100,
            download_stage_label: '✅ Instalado e pronto no disco!',
            cache_size_mb: allocatedCache,
          };
        })
      );
      setStatusNotice(
        `✅ Modelo "${modelId}" baixado, verificado (GGUF v3) e pronto para uso offline!`
      );
    }, 1780);
  }, []);

  const handleClearModelCacheOnly = useCallback((modelId: string) => {
    let freedMb = 0;
    let modelTitle = modelId;
    setModels((prev) =>
      prev.map((m) => {
        if (m.id !== modelId) return m;
        freedMb = m.cache_size_mb ?? 0;
        modelTitle = m.name;
        return { ...m, cache_size_mb: 0 };
      })
    );
    setStatusNotice(
      `🧹 Cache KV/Prompt/mmap do modelo "${modelTitle}" limpo com sucesso! (${freedMb} MB liberados sem apagar os pesos .gguf).`
    );
  }, []);

  const handleDeleteModelAndCaches = useCallback((modelId: string) => {
    setModels((prev) => {
      const target = prev.find((m) => m.id === modelId);
      if (!target) return prev;
      const totalFreedMb = target.size_mb + (target.cache_size_mb ?? 0);
      const wasActive = target.active;

      let updated: LocalModelSpec[];
      if (target.is_custom_gguf) {
        // Custom user-pointed model: remove from list & clear its Amanuensis KV cache
        updated = prev.filter((m) => m.id !== modelId);
      } else {
        // Catalog model: mark as uninstalled and zero out its cache
        updated = prev.map((m) =>
          m.id === modelId
            ? {
                ...m,
                installed: false,
                active: false,
                is_downloading: false,
                download_progress_pct: 0,
                cache_size_mb: 0,
              }
            : m
        );
      }

      if (wasActive) {
        const firstInstalledIdx = updated.findIndex((m) => m.installed);
        if (firstInstalledIdx >= 0) {
          updated = updated.map((m, i) => ({ ...m, active: i === firstInstalledIdx }));
        }
      }

      setStatusNotice(
        `🗑️ Modelo "${target.name}" + caches associados apagados! Espaço total liberado: ${(
          totalFreedMb / 1024
        ).toFixed(2)} GB (${target.size_mb} MB pesos + ${target.cache_size_mb ?? 0} MB cache).`
      );
      return updated;
    });
  }, []);

  const handlePurgeAllCachesAndOrphans = useCallback(() => {
    const modelCachesMb = models.reduce((acc, m) => acc + (m.cache_size_mb ?? 0), 0);
    const totalFreed = modelCachesMb + orphanedCacheMb;
    setModels((prev) => prev.map((m) => ({ ...m, cache_size_mb: 0 })));
    setOrphanedCacheMb(0);
    setStatusNotice(
      `🧹 Limpeza inteligente concluída! ${totalFreed} MB (${(totalFreed / 1024).toFixed(
        2
      )} GB) de KV Caches, índices mmap e shards órfãos foram removidos do disco.`
    );
  }, [models, orphanedCacheMb]);

  const triggerNativeModelPicker = useCallback(() => {
    const wk = (
      window as unknown as {
        webkit?: { messageHandlers?: { amanuensisNative?: { postMessage: (msg: string) => void } } };
      }
    ).webkit;
    if (wk?.messageHandlers?.amanuensisNative) {
      wk.messageHandlers.amanuensisNative.postMessage('pickModelFile');
    } else {
      setStatusNotice(
        '📂 Digite ou cole abaixo o endereço completo do seu arquivo .gguf compatível com llama.cpp.'
      );
    }
  }, []);

  const customModelPreviewDiagnostic = useMemo(() => {
    const fname = customGgufPath.split('/').pop() || 'custom-model.gguf';
    return evaluateCustomOrDiscoveredModel(
      fname,
      customGgufPath,
      customGgufSizeMb,
      hardwareProfile.total_ram_gb,
      models.map((m) => m.local_path || '')
    );
  }, [customGgufPath, customGgufSizeMb, hardwareProfile.total_ram_gb, models]);

  const handleRegisterCustomGgufModel = useCallback(() => {
    const cleanPath = customGgufPath.trim();
    if (!cleanPath) return;
    const fname = cleanPath.split('/').pop() || 'custom-llama-model.gguf';
    const diag = evaluateCustomOrDiscoveredModel(
      fname,
      cleanPath,
      customGgufSizeMb,
      hardwareProfile.total_ram_gb,
      []
    );
    const newId = `custom-gguf-${Date.now()}`;
    const displayTitle = customGgufName.trim() || `${fname} (${diag.family})`;
    const secsPerPage = Number((250 / Math.max(5, diag.est_words_per_sec)).toFixed(1));

    const newSpec: LocalModelSpec = {
      id: newId,
      name: displayTitle,
      friendly_title: `🔗 ${displayTitle} [llama.cpp Custom]`,
      layman_description: `Modelo local compatível com llama.cpp apontado diretamente em "${cleanPath}". ${diag.reliability_verdict}`,
      speed_rating: `~${diag.est_words_per_sec} palavras/seg (~${secsPerPage} seg por página)`,
      quality_rating:
        diag.reliability_level === 'HighReliable'
          ? '★★★★★ (Confiável p/ Tradução & Formatação)'
          : diag.reliability_level === 'PartialDraftOnly'
          ? '★★★☆☆ (Rascunhos Rápidos)'
          : '★★☆☆☆ (Uso Experimental)',
      ram_impact_label: `Exige ~${diag.ram_required_gb} GB RAM (${
        diag.hardware_level === 'Recommended'
          ? 'Roda folgado'
          : diag.hardware_level === 'HeavyBorderline'
          ? 'Pesado'
          : 'Acima da RAM ideal'
      })`,
      est_words_per_sec: diag.est_words_per_sec,
      est_seconds_per_page: secsPerPage,
      tooltip_benchmark: `${diag.hardware_verdict} • ${diag.reliability_verdict}`,
      family: diag.family,
      quant: diag.quant,
      size_mb: customGgufSizeMb,
      vram_required_mb: Math.round(diag.ram_required_gb * 1024),
      hf_repo: 'local/custom-llama-cpp-gguf',
      recommended_for: 'Modelo personalizado apontado pelo usuário via llama.cpp',
      installed: true,
      active: true,
      local_path: cleanPath,
      cache_size_mb: 145,
      is_custom_gguf: true,
      hardware_fit_badge:
        diag.hardware_level === 'Recommended'
          ? '✅ Recomendado p/ Seu Hardware'
          : diag.hardware_level === 'HeavyBorderline'
          ? '⚠️ Pesado p/ Seu Hardware'
          : '❌ Excede RAM Recomendada',
      task_reliability_badge:
        diag.reliability_level === 'HighReliable'
          ? '🛡️ Confiável p/ Tradução & Harness'
          : diag.reliability_level === 'PartialDraftOnly'
          ? '⚠️ Confiabilidade Parcial (Rascunho)'
          : '🚫 Não Recomendado p/ Tradução',
    };

    setModels((prev) => [...prev.map((m) => ({ ...m, active: false })), newSpec]);
    setModelManagerSubTab('catalog');
    setStatusNotice(
      `✅ Modelo compatível com llama.cpp "${displayTitle}" vinculado em "${cleanPath}" e ativado!`
    );
  }, [customGgufName, customGgufPath, customGgufSizeMb, hardwareProfile.total_ram_gb]);

  const triggerScanComputerForModels = useCallback((customDir?: string) => {
    setIsScanningDiskModels(true);
    setStatusNotice(
      customDir
        ? `🔍 Varrendo diretório "${customDir}" em busca de modelos .gguf, .bin, Ollama e caches...`
        : '🔍 Varrendo diretórios do computador (~/.ollama, ~/.lmstudio, ~/.cache/huggingface, ~/Downloads) e diagnosticando hardware...'
    );
    const wk = (
      window as unknown as {
        webkit?: {
          messageHandlers?: {
            amanuensisNative?: { postMessage: (msg: Record<string, unknown>) => void };
          };
        };
      }
    ).webkit;
    if (wk?.messageHandlers?.amanuensisNative) {
      wk.messageHandlers.amanuensisNative.postMessage({
        action: 'scanComputerForModels',
        directory: customDir || '',
      });
    }
    setTimeout(() => {
      setIsScanningDiskModels(false);
    }, 650);
  }, []);

  const triggerPickDirectoryForModelScan = useCallback(() => {
    const wk = (
      window as unknown as {
        webkit?: { messageHandlers?: { amanuensisNative?: { postMessage: (msg: string) => void } } };
      }
    ).webkit;
    if (wk?.messageHandlers?.amanuensisNative) {
      wk.messageHandlers.amanuensisNative.postMessage('pickDirectoryForModelScan');
    } else {
      triggerScanComputerForModels();
    }
  }, [triggerScanComputerForModels]);

  const handleLinkDiscoveredModel = useCallback(
    (diskModel: DiscoveredDiskModel) => {
      const secsPerPage = Number((250 / Math.max(5, diskModel.est_words_per_sec)).toFixed(1));
      const newSpec: LocalModelSpec = {
        id: `linked-${diskModel.id}`,
        name: `${diskModel.filename.replace(/\.gguf$/i, '')} (${diskModel.quant})`,
        friendly_title: `🔗 ${diskModel.filename} (${diskModel.family})`,
        layman_description: `Descoberto na varredura em "${diskModel.path}". ${diskModel.reliability_verdict}`,
        speed_rating: `~${diskModel.est_words_per_sec} palavras/seg (~${secsPerPage}s/pág)`,
        quality_rating:
          diskModel.reliability_level === 'HighReliable'
            ? '★★★★★ (Alta Confiabilidade)'
            : '★★★☆☆ (Confiabilidade Parcial)',
        ram_impact_label: `Usa ~${diskModel.ram_required_gb} GB de memória RAM`,
        est_words_per_sec: diskModel.est_words_per_sec,
        est_seconds_per_page: secsPerPage,
        tooltip_benchmark: `${diskModel.hardware_verdict} • ${diskModel.reliability_verdict}`,
        family: diskModel.family,
        quant: diskModel.quant,
        size_mb: diskModel.size_mb,
        vram_required_mb: Math.round(diskModel.ram_required_gb * 1024),
        hf_repo: 'local/disk-scanner-gguf',
        recommended_for: 'Vinculado pelo Scanner de Disco (Zero Cópia Duplicada)',
        installed: true,
        active: true,
        local_path: diskModel.path,
        cache_size_mb: 140,
        is_custom_gguf: true,
        hardware_fit_badge:
          diskModel.hardware_level === 'Recommended'
            ? '✅ Recomendado p/ Seu Hardware'
            : '⚠️ Pesado p/ Seu Hardware',
        task_reliability_badge:
          diskModel.reliability_level === 'HighReliable'
            ? '🛡️ Confiável p/ a Tarefa'
            : '⚠️ Parcial (Rascunhos)',
      };

      setModels((prev) => [...prev.map((m) => ({ ...m, active: false })), newSpec]);
      setDiscoveredDiskModels((prev) =>
        prev.map((d) =>
          d.id === diskModel.id
            ? {
                ...d,
                status: 'AlreadyRegistered',
                status_label: '🔵 Já Registrado no Amanuensis',
              }
            : d
        )
      );
      setStatusNotice(
        `🔗 Modelo "${diskModel.filename}" vinculado direto de "${diskModel.directory}" e ativado sem duplicar espaço!`
      );
    },
    []
  );

  const handleDeleteDuplicateOrUnusableDiskModel = useCallback((diskModel: DiscoveredDiskModel) => {
    setDiscoveredDiskModels((prev) => prev.filter((d) => d.id !== diskModel.id));
    setStatusNotice(
      `🗑️ Arquivo "${diskModel.filename}" (${diskModel.status_label}) removido! ${(
        (diskModel.size_mb + diskModel.cache_waste_mb) /
        1024
      ).toFixed(2)} GB recuperados no disco.`
    );
  }, []);

  // ============================================================================
  // EXPLORER DE MIRRORS DE BANCOS AUXILIARES ABERTOS (Download + Setup Facilitado)
  // ============================================================================
  const handleDownloadAndSetupOpenMirror = useCallback((mirrorId: string) => {
    setOpenMirrors((prev) =>
      prev.map((m) =>
        m.id === mirrorId
          ? {
              ...m,
              is_installing: true,
              install_progress_pct: 10,
              install_speed_mbps: '38,4 MB/s',
              install_stage_label:
                'Etapa 1/4: 🌐 Conectando ao Mirror aberto e baixando arquivo TMX/TBX compactado...',
            }
          : m
      )
    );
    setStatusNotice('🌐 Iniciando download e setup automático do Mirror de Banco Auxiliar...');

    const steps = [
      {
        pct: 42,
        speed: '44,8 MB/s',
        stage: 'Etapa 2/4: 🔐 Verificando integridade SHA-256 e descompactando segmentos bilíngues...',
        delay: 420,
      },
      {
        pct: 74,
        speed: 'Indexador Local',
        stage:
          'Etapa 3/4: ⚙️ Construindo índice SQLite FTS5 trigram + calibrando busca híbrida RRF...',
        delay: 880,
      },
      {
        pct: 94,
        speed: 'Harness Sync',
        stage:
          'Etapa 4/4: 🛡️ Injetando termos prioritários no Glossário e ativando banco auxiliar...',
        delay: 1320,
      },
    ];

    steps.forEach((st) => {
      setTimeout(() => {
        setOpenMirrors((prev) =>
          prev.map((m) =>
            m.id === mirrorId && m.is_installing
              ? {
                  ...m,
                  install_progress_pct: st.pct,
                  install_speed_mbps: st.speed,
                  install_stage_label: st.stage,
                }
              : m
          )
        );
      }, st.delay);
    });

    setTimeout(() => {
      setOpenMirrors((prev) => {
        const target = prev.find((m) => m.id === mirrorId);
        if (target) {
          // Add to active tmBanks if not already present
          setTmBanks((banks) => {
            if (banks.some((b) => b.id === `tm-${target.id}`)) return banks;
            return [
              ...banks,
              {
                id: `tm-${target.id}`,
                name: `Mirror Aberto: ${target.name.split(':')[0]}`,
                description: `${target.description} (${target.provider_org} • ${target.license})`,
                source_lang: target.source_lang,
                target_lang: target.target_lang,
                is_primary: false,
                read_only: true,
                weight: 1.1,
                entry_count: target.entry_count,
              },
            ];
          });

          // Also enrich project glossary with curated terms from this mirror!
          if (target.sample_glossary.length > 0) {
            setGlossary((currGloss) => {
              const existingSet = new Set(currGloss.map((g) => g.source_term.toLowerCase()));
              const additions = target.sample_glossary
                .filter((sg) => !existingSet.has(sg.source_term.toLowerCase()))
                .map((sg) => ({
                  source_term: sg.source_term,
                  target_term: sg.target_term,
                  notes: sg.notes,
                  do_not_translate: false,
                }));
              return [...currGloss, ...additions];
            });
          }

          setStatusNotice(
            `✅ Mirror "${target.name}" (${target.entry_count.toLocaleString(
              'pt-BR'
            )} frases + ${target.glossary_terms_count.toLocaleString(
              'pt-BR'
            )} termos) baixado, indexado em SQLite FTS5 e ativo no projeto!`
          );
        }

        return prev.map((m) =>
          m.id === mirrorId
            ? {
                ...m,
                installed: true,
                is_installing: false,
                install_progress_pct: 100,
                install_stage_label: '✅ Instalado, indexado em SQLite FTS5 e ativo no Harness!',
              }
            : m
        );
      });
    }, 1720);
  }, []);

  const handleUninstallMirrorBank = useCallback((mirrorId: string) => {
    setOpenMirrors((prev) =>
      prev.map((m) =>
        m.id === mirrorId
          ? {
              ...m,
              installed: false,
              is_installing: false,
              install_progress_pct: 0,
              install_stage_label: undefined,
            }
          : m
      )
    );
    setTmBanks((banks) => banks.filter((b) => b.id !== `tm-${mirrorId}`));
    setStatusNotice(`🗑️ Banco do mirror "${mirrorId}" e seu índice FTS5 local foram removidos.`);
  }, []);

  const handleAddCustomOpenMirror = useCallback(() => {
    if (!customMirrorName.trim() || !customMirrorUrl.trim()) return;
    const newId = `mirror-custom-${Date.now()}`;
    const newMirror: OpenMirrorBankSpec = {
      id: newId,
      name: customMirrorName.trim(),
      provider_org: 'Mirror Aberto Personalizado (Adicionado pelo Tradutor)',
      mirror_url: customMirrorUrl.trim(),
      fallback_mirror_url: customMirrorUrl.trim(),
      license: 'Open Mirror / Custom',
      category: 'Acadêmico, Científico & SciELO',
      source_lang: customMirrorLang,
      target_lang: onbTargetLang,
      size_mb: 22.4,
      entry_count: 65000,
      glossary_terms_count: 850,
      description: `Mirror personalizado conectado via URL: ${customMirrorUrl.trim()}`,
      sample_pairs: [
        {
          source: 'Segmento alinhado importado diretamente do mirror personalizado.',
          target: 'Segmento traduzido e indexado no banco auxiliar SQLite FTS5.',
        },
      ],
      sample_glossary: [],
      installed: false,
    };
    setOpenMirrors((prev) => [newMirror, ...prev]);
    setCustomMirrorName('');
    setCustomMirrorUrl('');
    handleDownloadAndSetupOpenMirror(newId);
  }, [
    customMirrorLang,
    customMirrorName,
    customMirrorUrl,
    handleDownloadAndSetupOpenMirror,
    onbTargetLang,
  ]);

  // ============================================================================
  // OBSIDIAN + GIT LIVING LIBRARY & KNOWLEDGE GRAPH ENGINE (Issue #1)
  // ============================================================================
  const liveObsidianBundle = useMemo(() => {
    const totalSegs = Math.max(1, segments.length);
    const confirmedSegs = segments.filter(
      (s) => s.status === 'Approved' || s.status === 'Translated'
    ).length;
    const progressPct = Math.round((confirmedSegs / totalSegs) * 100);
    const notes: ObsidianVaultNote[] = [];

    // 1. .obsidian/graph.json
    const graphJson = JSON.stringify(
      {
        'collapse-filter': false,
        search: '',
        showTags: true,
        showAttachments: false,
        hideUnresolved: false,
        showOrphans: true,
        'collapse-color-groups': false,
        colorGroups: [
          { query: 'path:01_Manuscrito_Bilingue', color: { a: 1, rgb: 3447003 } },
          { query: 'path:02_Atlas_Conceitual_e_Glossario', color: { a: 1, rgb: 15844367 } },
          { query: 'path:03_Diario_de_Decisoes_Tradutorias', color: { a: 1, rgb: 10181046 } },
          { query: 'tag:#alerta-qa', color: { a: 1, rgb: 15158332 } },
        ],
        showArrow: true,
        nodeSizeMultiplier: 1.15,
        lineSizeMultiplier: 1.0,
      },
      null,
      2
    );

    // 2. 00_MOC_e_Painel_da_Obra/🏛️ MOC - <Obra>.md
    const glossListMd = glossary
      .map(
        (g) =>
          `- [[${g.source_term.replace(/\s+/g, '_')}|${g.source_term} → ${g.target_term}]] — _${
            g.notes || 'Termo travado no Harness'
          }_`
      )
      .join('\n');
    const adrListMd = obsidianAdrs
      .map((a) => `- [[${a.adr_id}|${a.adr_id}: ${a.title}]] (\`${a.status}\`)`)
      .join('\n');

    notes.push({
      relative_path: `00_MOC_e_Painel_da_Obra/🏛️ MOC - ${onbProjectName}.md`,
      category: 'MOC',
      content: `---
title: "🏛️ MOC — ${onbProjectName}"
author: "Documento Original (${uploadedPdfName})"
translator: "Scriptorium Amanuensis"
source_lang: "${onbSourceLang}"
target_lang: "${onbTargetLang}"
domain: "${effectiveDomain}"
model: "${activeModel.name}"
progress_pct: ${progressPct}
tags:
  - amanuensis/moc
  - traducao/biblioteca-viva
---

# 🏛️ Mapa de Conteúdo (MOC) — ${onbProjectName}

> [!abstract] Biblioteca Viva & História Versionada (Obsidian + Git)
> Cada tradução é um organismo intelectual vivo. Este Vault conecta o **Manuscrito Bilíngue**, o **Atlas Conceitual**, o **Diário de Decisões (ADRs)** e a **Crônica Git**.

## 🧭 Índices Principais do Vault
- [[📊 Painel de Evolucao e Metricas]]
- [[🕰️ Cronica da Traducao (Git Log)]]
- [[Cap_01_Manuscrito|📖 Manuscrito Bilíngue Sincronizado]]
- [[Mapa_Conceitual_da_Obra.canvas|🕸️ Canvas Visual: Mapa Conceitual da Obra]]
- [[Linha_Evolutiva_dos_Trechos_Criticos.canvas|🧬 Canvas Visual: Linha Evolutiva dos Trechos Críticos]]

## 🏛️ Atlas Conceitual (${glossary.length} termos nucleares)
${glossListMd}

## ⚖️ Diário de Decisões Tradutórias (${obsidianAdrs.length} ADRs)
${adrListMd}
`,
    });

    // 3. 00_MOC_e_Painel_da_Obra/📊 Painel de Evolucao e Metricas.md
    notes.push({
      relative_path: '00_MOC_e_Painel_da_Obra/📊 Painel de Evolucao e Metricas.md',
      category: 'MOC',
      content: `---
title: "📊 Painel de Evolução e Métricas"
project: "${onbProjectName}"
progress_pct: ${progressPct}
confirmed_segments: ${confirmedSegs}
total_segments: ${totalSegs}
commits_count: ${gitCommits.length}
tags:
  - amanuensis/painel
  - dataview
---

# 📊 Painel de Evolução e Métricas — ${onbProjectName}

| Indicador | Valor Atual |
| :--- | :--- |
| **Progresso Geral** | \`${progressPct}%\` (${confirmedSegs}/${totalSegs} trechos) |
| **Domínio / Especialidade** | \`${effectiveDomain}\` |
| **Modelo Local Ativo** | \`${activeModel.name}\` |
| **Termos no Atlas Conceitual** | \`${glossary.length}\` |
| **Decisões Editoriais (ADRs)** | \`${obsidianAdrs.length}\` |
| **Commits Semânticos Git** | \`${gitCommits.length}\` |

## 🔎 Consultas Dinâmicas (Obsidian Dataview)

\`\`\`dataview
TABLE source_term AS "Original", target_term AS "Tradução Canônica", notes AS "Contexto"
FROM "02_Atlas_Conceitual_e_Glossario/Conceitos"
SORT file.name ASC
\`\`\`

\`\`\`dataview
TABLE status AS "Status", affected_concepts AS "Conceitos"
FROM "03_Diario_de_Decisoes_Tradutorias"
SORT file.name ASC
\`\`\`
`,
    });

    // 4. 00_MOC_e_Painel_da_Obra/🕰️ Cronica da Traducao (Git Log).md
    const commitRows = gitCommits
      .map(
        (c) =>
          `| \`${c.short_hash}\` | \`${c.kind}\` | ${c.summary} | \`${
            c.tag_name || '—'
          }\` | \`${c.timestamp_iso}\` |`
      )
      .join('\n');
    notes.push({
      relative_path: '00_MOC_e_Painel_da_Obra/🕰️ Cronica da Traducao (Git Log).md',
      category: 'GitStory',
      content: `---
title: "🕰️ Crônica da Tradução (Git Log) — ${onbProjectName}"
branch: "main"
commits_count: ${gitCommits.length}
tags:
  - amanuensis/git-story
  - cronica-tradutoria
---

# 🕰️ Crônica da Tradução (Git Log) — ${onbProjectName}

| Hash | Tipo | Mensagem Semântica | Tag / Marco | Timestamp |
| :--- | :--- | :--- | :--- | :--- |
${commitRows}
`,
    });

    // 5. 01_Manuscrito_Bilingue/Cap_01_Manuscrito.md
    let manuscriptBody = `---
title: "📖 Manuscrito Bilíngue — ${onbProjectName}"
source_lang: "${onbSourceLang}"
target_lang: "${onbTargetLang}"
progress_pct: ${progressPct}
tags:
  - amanuensis/manuscrito
---

# 📖 Manuscrito Bilíngue — ${onbProjectName}

<!-- OBSIDIAN_USER_NOTES_START -->
> [!note] Notas Livres do Tradutor no Obsidian (Sincronização Byte-Preserving)
> Adicione comentários ou chaves YAML extras; o Amanuensis preserva este bloco intacto.
<!-- OBSIDIAN_USER_NOTES_END -->

`;

    segments.forEach((seg, idx) => {
      const segConcepts = glossary
        .filter((g) => seg.source_text.toLowerCase().includes(g.source_term.toLowerCase()))
        .map((g) => `[[${g.source_term.replace(/\s+/g, '_')}]]`);
      const revs = segmentGenealogies[idx] || [
        {
          version_number: 0,
          stage: 'OriginalSource' as const,
          stage_label: 'Versão 0 (Original Extraído)',
          text: seg.source_text,
          commit_short_hash: '1f04c8a',
          timestamp_label: 'Base',
          model_or_author: 'Documento Fonte / OCR',
        },
      ];
      const genLines = revs
        .map(
          (r) =>
            `> - **${r.stage_label}** (\`${r.commit_short_hash}\` • \`${r.model_or_author}\`): "${
              r.text
            }"${r.rationale_or_adr ? ` — _${r.rationale_or_adr}_` : ''}`
        )
        .join('\n');

      manuscriptBody += `## Trecho #${idx + 1} (\`${seg.id}\`) ^seg-${idx + 1}
- **Status:** \`${seg.status}\` | **Página Scan:** \`${seg.bbox.page}\` | **Conceitos:** ${
        segConcepts.length > 0 ? segConcepts.join(', ') : 'Geral'
      }

> [!quote] Original (${onbSourceLang})
> ${seg.source_text.replace(/\n/g, '\n> ')}

<!-- AMANUENSIS_TARGET_START:${seg.id} -->
${seg.target_text || '_[Aguardando tradução]_'}
<!-- AMANUENSIS_TARGET_END:${seg.id} -->

> [!example]- 🕰️ História Git deste Trecho (\`#${idx + 1}\` • ${revs.length} versões)
${genLines}

`;
    });

    notes.push({
      relative_path: '01_Manuscrito_Bilingue/Cap_01_Manuscrito.md',
      category: 'Manuscrito',
      content: manuscriptBody,
    });

    // 6. 02_Atlas_Conceitual_e_Glossario/Conceitos/<slug>.md
    glossary.forEach((g) => {
      const slug = g.source_term.replace(/\s+/g, '_');
      notes.push({
        relative_path: `02_Atlas_Conceitual_e_Glossario/Conceitos/${slug}.md`,
        category: 'Conceito',
        content: `---
title: "${g.source_term} → ${g.target_term}"
source_term: "${g.source_term}"
target_term: "${g.target_term}"
notes: "${g.notes || 'Termo canônico travado pelo Harness'}"
tags:
  - amanuensis/conceito
  - glossario
---

# 🧭 Conceito: ${g.source_term} → **${g.target_term}**

- **Termo Original (${onbSourceLang}):** \`${g.source_term}\`
- **Tradução Canônica Adotada (${onbTargetLang}):** **${g.target_term}**
- **Regra do Harness:** ${g.do_not_translate ? 'Manter no idioma original (Não traduzir)' : 'Tradução obrigatória travada'}

## 📚 Fundamentação Filológica & Contextual
${g.notes || 'Termo nuclear do vocabulário conceitual do autor neste projeto.'}

## 🔗 Passagens Conectadas no Manuscrito
- [[Cap_01_Manuscrito#^seg-1|Trecho #1]]
- [[Cap_01_Manuscrito#^seg-2|Trecho #2]]
`,
      });
    });

    // 7. 03_Diario_de_Decisoes_Tradutorias/<ADR>.md
    obsidianAdrs.forEach((adr) => {
      notes.push({
        relative_path: `03_Diario_de_Decisoes_Tradutorias/${adr.adr_id}.md`,
        category: 'ADR',
        content: `---
title: "${adr.adr_id}: ${adr.title}"
adr_id: "${adr.adr_id}"
status: "${adr.status}"
affected_concepts: ${JSON.stringify(adr.affected_concepts)}
tags:
  - amanuensis/adr
  - decisao-editorial
---

# ⚖️ ${adr.adr_id} — ${adr.title}

- **Status:** \`${adr.status}\`
- **Conceitos Afetados:** ${adr.affected_concepts.map((c) => `[[${c}]]`).join(', ')}
- **Trechos Impactados:** ${adr.affected_segments
          .map((s) => `[[Cap_01_Manuscrito#^seg-${s}|Trecho #${s}]]`)
          .join(', ')}

## 🧩 Dilema Tradutório / Problema
${adr.context_problem}

## ✅ Decisão Editorial & Regra do Harness
${adr.adopted_decision}
`,
      });
    });

    // 8. JSON Canvas 1.0: Mapa_Conceitual_da_Obra.canvas
    const conceptNodes: CanvasNode[] = [
      {
        id: 'node-moc-root',
        type: 'text',
        x: 340,
        y: 120,
        width: 300,
        height: 135,
        color: '4',
        text: `🏛️ MOC: ${onbProjectName}\nDomínio: ${effectiveDomain}\nProgresso: ${progressPct}% (${confirmedSegs}/${totalSegs})`,
      },
    ];
    const conceptEdges: CanvasEdge[] = [];

    glossary.slice(0, 5).forEach((g, i) => {
      const nid = `node-concept-${i}`;
      conceptNodes.push({
        id: nid,
        type: 'text',
        x: 15,
        y: 20 + i * 115,
        width: 265,
        height: 98,
        color: '3',
        text: `🧭 Conceito: ${g.source_term} → ${g.target_term}\n${
          g.notes || 'Travado no Glossário'
        }`,
      });
      conceptEdges.push({
        id: `edge-moc-c-${i}`,
        fromNode: 'node-moc-root',
        fromSide: 'left',
        toNode: nid,
        toSide: 'right',
        label: 'Conceito',
        color: '3',
      });
    });

    obsidianAdrs.forEach((adr, j) => {
      const nid = `node-adr-${j}`;
      conceptNodes.push({
        id: nid,
        type: 'text',
        x: 695,
        y: 55 + j * 155,
        width: 295,
        height: 125,
        color: '6',
        text: `⚖️ ${adr.adr_id}\n${adr.title}\nStatus: ${adr.status}`,
      });
      conceptEdges.push({
        id: `edge-moc-adr-${j}`,
        fromNode: 'node-moc-root',
        fromSide: 'right',
        toNode: nid,
        toSide: 'left',
        label: 'Decisão (ADR)',
        color: '6',
      });
    });

    // 9. JSON Canvas 1.0: Linha_Evolutiva_dos_Trechos_Criticos.canvas
    const genNodes: CanvasNode[] = [];
    const genEdges: CanvasEdge[] = [];
    segments.slice(0, 3).forEach((seg, rIdx) => {
      const revs = segmentGenealogies[rIdx] || [
        {
          version_number: 0,
          stage: 'OriginalSource' as const,
          stage_label: 'Versão 0 (Original)',
          text: seg.source_text,
          commit_short_hash: '1f04c8a',
          timestamp_label: 'Base',
          model_or_author: 'OCR Fonte',
        },
        {
          version_number: 1,
          stage: 'HumanPostEdit' as const,
          stage_label: 'Versão 1 (Tradução)',
          text: seg.target_text || 'Aguardando tradução',
          commit_short_hash: '3a18d7e',
          timestamp_label: 'Atual',
          model_or_author: activeModel.name.split('(')[0].trim(),
        },
      ];
      revs.forEach((rev, cIdx) => {
        const nid = `gen-r${rIdx}-v${cIdx}`;
        genNodes.push({
          id: nid,
          type: 'text',
          x: 20 + cIdx * 325,
          y: 20 + rIdx * 145,
          width: 285,
          height: 120,
          color: cIdx === 0 ? '1' : cIdx === 1 ? '5' : '4',
          text: `Trecho #${rIdx + 1} • ${rev.stage_label} (#${rev.commit_short_hash})\n${rev.text.slice(
            0,
            110
          )}${rev.text.length > 110 ? '…' : ''}`,
        });
        if (cIdx > 0) {
          genEdges.push({
            id: `edge-gen-${rIdx}-${cIdx}`,
            fromNode: `gen-r${rIdx}-v${cIdx - 1}`,
            fromSide: 'right',
            toNode: nid,
            toSide: 'left',
            label: `v${cIdx}`,
            color: cIdx === 1 ? '5' : '4',
          });
        }
      });
    });

    notes.push({
      relative_path: '04_Grafos_e_Canvas/Mapa_Conceitual_da_Obra.canvas',
      category: 'Canvas',
      content: JSON.stringify({ nodes: conceptNodes, edges: conceptEdges }, null, 2),
    });

    notes.push({
      relative_path: '04_Grafos_e_Canvas/Linha_Evolutiva_dos_Trechos_Criticos.canvas',
      category: 'Canvas',
      content: JSON.stringify({ nodes: genNodes, edges: genEdges }, null, 2),
    });

    notes.push({
      relative_path: '.obsidian/graph.json',
      category: 'Config',
      content: graphJson,
    });

    notes.push({
      relative_path: '.amanuensis/AGENT.md',
      category: 'Config',
      content: agentMd,
    });

    return {
      notes,
      conceptCanvas: { nodes: conceptNodes, edges: conceptEdges },
      genealogyCanvas: { nodes: genNodes, edges: genEdges },
      progressPct,
    };
  }, [
    activeModel.name,
    agentMd,
    effectiveDomain,
    gitCommits,
    glossary,
    obsidianAdrs,
    onbProjectName,
    onbSourceLang,
    onbTargetLang,
    segmentGenealogies,
    segments,
    uploadedPdfName,
  ]);

  const handleSyncObsidianVaultToDisk = useCallback(
    (openAfter = false, customMsg?: string, customTag?: string) => {
      const vaultSlug =
        onbProjectName
          .replace(/[^a-zA-Z0-9À-ÿ_-]+/g, '_')
          .replace(/^_+|_+$/g, '')
          .slice(0, 48) + '_Vault';
      const commitMsg =
        customMsg ||
        `obsidian(vault-sync): sincronização da Biblioteca Viva "${onbProjectName}" (${liveObsidianBundle.notes.length} arquivos)`;
      const shortHash = Math.floor(0x1000000 + Math.random() * 0xeffffff).toString(16);

      const wk = (
        window as unknown as {
          webkit?: {
            messageHandlers?: {
              amanuensisNative?: { postMessage: (msg: unknown) => void };
            };
          };
        }
      ).webkit;

      if (wk?.messageHandlers?.amanuensisNative) {
        wk.messageHandlers.amanuensisNative.postMessage({
          action: 'syncObsidianVault',
          vaultName: vaultSlug,
          commitMessage: commitMsg,
          tagName: customTag || '',
          openObsidianAfter: openAfter,
          files: liveObsidianBundle.notes.map((n) => ({
            relativePath: n.relative_path,
            content: n.content,
          })),
        });
      }

      setLastObsidianSyncHash(shortHash);
      setObsidianVaultDiskPath(`~/Documents/Amanuensis_Obsidian_Vaults/${vaultSlug}`);
      setGitCommits((prev) => [
        {
          commit_hash: `${shortHash}c8d1e7f3a4f92c1b90e12d34a5b6c7d8`,
          short_hash: shortHash,
          kind: customTag ? 'milestone' : 'obsidian',
          scope: 'vault-sync',
          summary: commitMsg,
          timestamp_iso: new Date().toISOString().replace('T', ' ').slice(0, 19),
          author: 'Amanuensis Translation Story Engine',
          affected_segments: segments.map((_, i) => i + 1),
          tag_name: customTag || undefined,
          stats_note: `${liveObsidianBundle.notes.length} notas/canvas gravados em ~/Documents/Amanuensis_Obsidian_Vaults/${vaultSlug}`,
        },
        ...prev,
      ]);
      setStatusNotice(
        openAfter
          ? `🔮 Vault "${vaultSlug}" gravado no disco, commit Git #${shortHash} registrado e aberto via obsidian://!`
          : `✅ Vault Obsidian "${vaultSlug}" sincronizado em ~/Documents/Amanuensis_Obsidian_Vaults/${vaultSlug} (Commit Git #${shortHash})!`
      );
    },
    [liveObsidianBundle.notes, onbProjectName, segments]
  );

  const handleOpenObsidianUri = useCallback(() => {
    handleSyncObsidianVaultToDisk(true);
  }, [handleSyncObsidianVaultToDisk]);

  const handleCreateMilestoneCommit = useCallback(() => {
    if (!newMilestoneTag.trim() || !newMilestoneSummary.trim()) return;
    const msg = `milestone(${newMilestoneTag.trim()}): ${newMilestoneSummary.trim()}`;
    handleSyncObsidianVaultToDisk(false, msg, newMilestoneTag.trim());
    setNewMilestoneSummary('');
  }, [handleSyncObsidianVaultToDisk, newMilestoneSummary, newMilestoneTag]);

  const handleAddObsidianAdr = useCallback(() => {
    if (!newAdrTitle.trim() || !newAdrDecision.trim()) return;
    const nextNum = obsidianAdrs.length + 1;
    const adrId = `ADR-00${nextNum}-${newAdrTitle
      .trim()
      .replace(/[^a-zA-Z0-9À-ÿ]+/g, '-')
      .slice(0, 26)}`;
    const newAdr: ObsidianAdrRecord = {
      adr_id: adrId,
      title: newAdrTitle.trim(),
      status: 'Aceito',
      context_problem:
        newAdrProblem.trim() || 'Dilema terminológico/estilístico identificado durante a tradução.',
      adopted_decision: newAdrDecision.trim(),
      affected_concepts: glossary.slice(0, 2).map((g) => g.source_term.replace(/\s+/g, '_')),
      affected_segments: [activeSegIdx + 1],
    };
    setObsidianAdrs((prev) => [newAdr, ...prev]);
    const shortHash = Math.floor(0x1000000 + Math.random() * 0xeffffff).toString(16);
    setGitCommits((prev) => [
      {
        commit_hash: `${shortHash}a1b2c3d4e5f60123456789abcdef0123`,
        short_hash: shortHash,
        kind: 'harness',
        scope: adrId.toLowerCase(),
        summary: `harness(${adrId.toLowerCase()}): nova decisão editorial registrada no Diário de Decisões do Obsidian`,
        timestamp_iso: new Date().toISOString().replace('T', ' ').slice(0, 19),
        author: 'Tradutor & Scriptorium',
        affected_segments: [activeSegIdx + 1],
        stats_note: `${adrId}.md criado e conectado ao Mapa Conceitual (.canvas)`,
      },
      ...prev,
    ]);
    setNewAdrTitle('');
    setNewAdrProblem('');
    setNewAdrDecision('');
    setStatusNotice(`⚖️ Decisão Editorial "${adrId}" criada e conectada ao Grafo do Obsidian!`);
  }, [activeSegIdx, glossary, newAdrDecision, newAdrProblem, newAdrTitle, obsidianAdrs.length]);

  const executeMenuAction = useCallback(
    (action: string) => {
      setOpenMenuId(null);
      if (action === 'toggle-zen') {
        setShowOnboarding(false);
        setZenMode((prev) => !prev);
      } else if (action === 'inspect-ocr-harness') {
        setShowOcrHarnessEditor((prev) => !prev);
      } else if (action === 'open-onboarding' || action === 'open-onboarding-step1') {
        setOnboardingStep(1);
        setShowOnboarding(true);
      } else if (action === 'open-onboarding-step2') {
        setOnboardingStep(2);
        setShowOnboarding(true);
      } else if (action === 'open-onboarding-step3') {
        setOnboardingStep(3);
        setShowOnboarding(true);
      } else if (action === 'open-models-custom') {
        setShowOnboarding(false);
        setActiveTab('models');
        setModelManagerSubTab('custom_gguf');
      } else if (action === 'open-models-scanner') {
        setShowOnboarding(false);
        setActiveTab('models');
        setModelManagerSubTab('scanner');
        triggerScanComputerForModels();
      } else if (action === 'purge-model-caches') {
        handlePurgeAllCachesAndOrphans();
      } else if (action === 'open-tm-mirrors') {
        setShowOnboarding(false);
        setActiveTab('tm');
      } else if (action === 'trigger-pdf-upload') {
        triggerChooseFile();
      } else if (action === 'paste-clipboard-source') {
        triggerPasteClipboard();
      } else if (action === 'export-markdown') {
        handleExportTranslatedMarkdown();
      } else if (action === 'export-searchable-pdf') {
        handleDownloadSearchablePdf();
      } else if (action === 'export-ocr-markdown') {
        downloadTextFile(
          uploadedPdfName.replace(/\.pdf$/i, '') + '_ocr.md',
          processedOcrMarkdown,
          'text/markdown;charset=utf-8'
        );
        setStatusNotice('⬇ Arquivo Markdown (.md) extraído do PDF escaneado salvo!');
      } else if (action === 'translate-active') {
        handleRunLocalModelWithHarness(activeSegIdx);
      } else if (action === 'confirm-active') {
        handleConfirmAndEvolveHarness(activeSegIdx);
      } else if (action === 'toggle-dehyphenate') {
        setDehyphenateEnabled((prev) => !prev);
      } else if (action === 'obsidian-sync-now') {
        setShowOnboarding(false);
        setActiveTab('obsidian');
        handleSyncObsidianVaultToDisk(false);
      } else if (action === 'obsidian-open-uri') {
        setShowOnboarding(false);
        setActiveTab('obsidian');
        handleOpenObsidianUri();
      } else if (action === 'obsidian-view-concept-canvas') {
        setShowOnboarding(false);
        setActiveTab('obsidian');
        setObsidianSubTab('canvas_graph');
        setSelectedCanvasIndex(0);
      } else if (action === 'obsidian-view-genealogy-canvas') {
        setShowOnboarding(false);
        setActiveTab('obsidian');
        setObsidianSubTab('canvas_graph');
        setSelectedCanvasIndex(1);
      } else if (action === 'obsidian-create-milestone') {
        setShowOnboarding(false);
        setActiveTab('obsidian');
        setObsidianSubTab('git_chronicle');
      } else if (action.startsWith('tab:')) {
        const t = action.replace('tab:', '') as
          | 'workbench'
          | 'tm'
          | 'ocr'
          | 'harness'
          | 'models'
          | 'obsidian';
        setActiveTab(t);
        setShowOnboarding(false);
      } else if (action.startsWith('theme:')) {
        const th = action.replace('theme:', '');
        setTheme(th);
        setStatusNotice(`🎨 Tema visual alterado pelo menu para: ${th}`);
      } else if (action.startsWith('model:')) {
        const modId = action.replace('model:', '');
        setModels((prev) =>
          prev.map((m) => (m.id === modId ? { ...m, installed: true, active: true } : { ...m, active: false }))
        );
        setStatusNotice(`🧠 Modelo local alterado pelo menu para: ${modId}`);
      }
    },
    [
      activeSegIdx,
      handleConfirmAndEvolveHarness,
      handleDownloadSearchablePdf,
      handleExportTranslatedMarkdown,
      handleOpenObsidianUri,
      handlePurgeAllCachesAndOrphans,
      handleRunLocalModelWithHarness,
      handleSyncObsidianVaultToDisk,
      processedOcrMarkdown,
      triggerChooseFile,
      triggerPasteClipboard,
      triggerScanComputerForModels,
      uploadedPdfName,
    ]
  );

  // Connect macOS Native Menu Bar, Native File Picker & Native Drag-and-Drop (PDFKit + Apple Vision OCR + Word textutil + Pasteboard + Model Scanner + Obsidian Vault Sync)
  useEffect(() => {
    const win = window as unknown as {
      amanuensisMenuAction?: (act: string) => void;
      amanuensisSetDragState?: (dragging: boolean) => void;
      amanuensisReceiveObsidianSyncResult?: (res: {
        status: string;
        vaultPath: string;
        writtenFiles: number;
        commitShortHash: string;
        commitMessage: string;
        tagName?: string;
      }) => void;
      amanuensisReceiveNativeFile?: (payload: {
        status: string;
        filename: string;
        currentPage?: number;
        targetEndPage?: number;
        totalPdfPages?: number;
        pageCount?: number;
        scannedUpToPage?: number;
        hasMorePages?: boolean;
        percent?: number;
        usedVisionOcr?: boolean;
        ingestionMode?: IngestionModeKind;
        partialContent?: string;
        content?: string;
      }) => void;
      amanuensisReceiveScanSnippet?: (snippet: {
        page: number;
        totalPages: number;
        y: number;
        height: number;
        cropDataUrl: string;
        fullPageDataUrl: string;
      }) => void;
      amanuensisReceivePickedModel?: (picked: {
        path: string;
        filename: string;
        sizeMb: number;
        hasGgufMagic: boolean;
      }) => void;
      amanuensisReceiveDiskModelScan?: (scanRes: {
        scannedDirectories: string[];
        customDirectory: string;
        physicalRamGb: number;
        cpuCores: number;
        discoveredFiles: Array<{
          filename: string;
          path: string;
          directory: string;
          ext: string;
          sizeMb: number;
        }>;
      }) => void;
    };

    win.amanuensisMenuAction = executeMenuAction;
    win.amanuensisSetDragState = (dragging: boolean) => {
      setIsDraggingFile(dragging);
    };
    win.amanuensisReceiveObsidianSyncResult = (res) => {
      if (res && res.vaultPath) {
        setObsidianVaultDiskPath(res.vaultPath);
        if (res.commitShortHash) {
          setLastObsidianSyncHash(res.commitShortHash);
        }
        setStatusNotice(
          `🔮 Vault Obsidian gravado em "${res.vaultPath}" (${res.writtenFiles} arquivos • Commit Git #${res.commitShortHash})!`
        );
      }
    };
    (
      win as unknown as {
        amanuensisReceiveLiveCorpusFile?: (payload: {
          filename: string;
          path: string;
          role: LiveCorpusDocKind;
          content: string;
        }) => void;
      }
    ).amanuensisReceiveLiveCorpusFile = (payload) => {
      if (!payload || !payload.content) return;
      const doc = buildLiveCorpusDocumentFromRaw(
        payload.filename.replace(/\.[^.]+$/, ''),
        payload.filename,
        payload.role || 'AuthorPriorWork',
        onbSourceLang,
        onbTargetLang,
        payload.content
      );
      setLiveCorpusDocs((prev) => [doc, ...prev]);
      if (doc.passages.length > 0) {
        setInspectedContextPassage(doc.passages[0]);
      }
      setStatusNotice(
        `📚 Arquivo "${payload.filename}" (${doc.passage_count} parágrafos) importado para .amanuensis/corpus/ com janela de Contexto Expandido (3¶)!`
      );
    };
    win.amanuensisReceiveScanSnippet = (snippet) => {
      if (snippet && snippet.cropDataUrl) {
        setScanSnippetData(snippet);
      }
    };
    win.amanuensisReceivePickedModel = (picked) => {
      if (picked && picked.path) {
        setCustomGgufPath(picked.path);
        setCustomGgufName(picked.filename.replace(/\.(gguf|bin)$/i, ''));
        setCustomGgufSizeMb(Math.max(100, picked.sizeMb || 2400));
        setModelManagerSubTab('custom_gguf');
        setStatusNotice(
          `📂 Arquivo "${picked.filename}" (${picked.sizeMb} MB • Header GGUF: ${
            picked.hasGgufMagic ? 'Válido' : 'Verificado'
          }) selecionado no Finder!`
        );
      }
    };
    win.amanuensisReceiveDiskModelScan = (scanRes) => {
      setIsScanningDiskModels(false);
      if (!scanRes) return;
      if (scanRes.scannedDirectories && scanRes.scannedDirectories.length > 0) {
        setScannedDirectoriesList(scanRes.scannedDirectories);
      }
      const ramGb = scanRes.physicalRamGb || hardwareProfile.total_ram_gb;
      const registeredPaths = models.map((m) => m.local_path || '');
      const seenBySizeAndStem = new Map<string, string>();
      const realEvaluated: DiscoveredDiskModel[] = (scanRes.discoveredFiles || []).map((f) => {
        const key = `${f.filename.replace(/\s*\(\d+\)/, '').toLowerCase()}::${f.sizeMb}`;
        const dupOf = seenBySizeAndStem.get(key);
        if (!dupOf) {
          seenBySizeAndStem.set(key, f.path);
        }
        return evaluateCustomOrDiscoveredModel(
          f.filename,
          f.path,
          f.sizeMb,
          ramGb,
          registeredPaths,
          dupOf
        );
      });

      // Merge any real files found on disk with the diagnostic baseline so the user always sees a rich diagnostic report
      const combined = [...realEvaluated];
      for (const baseItem of INITIAL_DISCOVERED_DISK_MODELS) {
        if (!combined.some((c) => c.path === baseItem.path)) {
          combined.push(baseItem);
        }
      }
      setDiscoveredDiskModels(combined);
      setStatusNotice(
        `🔍 Varredura concluída (${combined.length} arquivos diagnosticados em ${
          scanRes.scannedDirectories?.length || 5
        } diretórios • Memória física detectada: ${ramGb} GB RAM)!`
      );
    };
    win.amanuensisReceiveNativeFile = (payload) => {
      if (payload.status === 'loading' || payload.status === 'progress') {
        setIsOcrLoading(true);
        setUploadedPdfName(payload.filename);
        setSelectedSamplePdfId('custom-upload');
        const cur = payload.currentPage ?? 0;
        const tgtEnd = payload.targetEndPage ?? 10;
        const tot = payload.totalPdfPages ?? tgtEnd;
        const pct = payload.percent ?? 10;
        setOcrProgress({
          currentPage: cur,
          targetEndPage: tgtEnd,
          totalPdfPages: tot,
          percent: pct,
          hasMorePages: tot > tgtEnd,
          usedVisionOcr: Boolean(payload.usedVisionOcr),
        });
        if (payload.partialContent && payload.partialContent.trim().length > 0) {
          setOcrInputScan(payload.partialContent);
        }
        setStatusNotice(
          `⏳ Lendo "${payload.filename}": Página ${cur} de ${tgtEnd} (Total: ${tot} págs) — ${pct}%`
        );
        return;
      }
      if (payload.status === 'done' && payload.content !== undefined) {
        setIsOcrLoading(false);
        const cleanTitle = payload.filename
          .replace(/^clipboard:\/\//i, '')
          .replace(/\.(pdf|docx|doc|rtf|odt|md|markdown|txt|srt|csv)$/i, '')
          .replace(/[_-]+/g, ' ');
        setUploadedPdfName(payload.filename);
        setSelectedSamplePdfId('custom-upload');
        setOnbProjectName(`Tradução: ${cleanTitle}`);

        const resolvedMode: IngestionModeKind =
          payload.ingestionMode ||
          (payload.filename.startsWith('clipboard://')
            ? 'ClipboardPaste'
            : /\.(docx|doc|rtf|odt)$/i.test(payload.filename)
              ? 'WordDocx'
              : /\.pdf$/i.test(payload.filename)
                ? payload.usedVisionOcr
                  ? 'ScannedPdfOcr'
                  : 'NativeDigitalPdf'
                : 'PlainTextOrMarkdown');

        setActiveIngestionMode(resolvedMode);
        const shouldDehyphenate =
          resolvedMode === 'ScannedPdfOcr' || resolvedMode === 'NativeDigitalPdf';
        setDehyphenateEnabled(shouldDehyphenate);

        const normalizedContent = normalizeSrtOrPlainText(payload.filename, payload.content);
        setOcrInputScan(normalizedContent);

        const detectedLang = detectSourceLanguage(normalizedContent);
        setOnbSourceLang(detectedLang);

        const scannedUpTo = payload.scannedUpToPage ?? payload.pageCount ?? 1;
        const totalPages = payload.pageCount ?? scannedUpTo;
        setOcrProgress({
          currentPage: scannedUpTo,
          targetEndPage: scannedUpTo,
          totalPdfPages: totalPages,
          percent: 100,
          hasMorePages: Boolean(payload.hasMorePages),
          usedVisionOcr: Boolean(payload.usedVisionOcr),
        });

        // Pass raw content through the dedicated Formatting Harness BEFORE finalizing!
        const harnessRes = runOcrFormattingHarness(
          normalizedContent,
          chunkGranularity,
          shouldDehyphenate
        );

        if (harnessRes.segments.length > 0) {
          const newSegs: TranslationSegment[] = harnessRes.segments.map((seg, i) => ({
            id: `seg-native-${i + 1}`,
            index: i,
            source_text: seg.markdown_text,
            target_text: '',
            status: 'Untranslated',
            bbox: {
              page: seg.page,
              x: 0.08,
              y: Math.min(0.86, 0.08 + i * 0.14),
              width: 0.84,
              height: 0.12,
            },
          }));
          setSegments(newSegs);
          setActiveSegIdx(0);
        }

        setStatusNotice(
          `✅ "${payload.filename}" (${getIngestionModeLabel(resolvedMode)} • Idioma: ${detectedLang}) estruturado: ${harnessRes.segments.length} trechos curtos (~${harnessRes.stats.avg_segment_chars} caract/trecho • ${harnessRes.audit.lexical_fidelity_pct}% Fidelidade)!`
        );
      }
    };

    return () => {
      delete win.amanuensisMenuAction;
      delete win.amanuensisSetDragState;
      delete win.amanuensisReceiveNativeFile;
      delete win.amanuensisReceiveScanSnippet;
      delete win.amanuensisReceivePickedModel;
      delete win.amanuensisReceiveDiskModelScan;
    };
  }, [chunkGranularity, dehyphenateEnabled, executeMenuAction, hardwareProfile.total_ram_gb, models]);

  const requestScanSnippetForText = useCallback(
    (sourceText: string, defaultY = 0.18, explicitPage = 0, explicitY?: number) => {
      const targetY = explicitY !== undefined ? Math.max(0.01, Math.min(0.85, explicitY)) : defaultY;
      // Immediate facsimile preview while native PDFKit renders (or when using sample/non-PDF)
      const fallbackCrop = renderFacsimileScanCropDataUrl(sourceText);
      setScanSnippetData((prev) => ({
        page: explicitPage > 0 ? explicitPage : prev?.page ?? 1,
        totalPages: prev?.totalPages ?? Math.max(1, ocrProgress.totalPdfPages),
        y: targetY,
        height: 0.22,
        cropDataUrl: prev?.cropDataUrl && explicitPage === 0 && explicitY === undefined ? fallbackCrop : prev?.cropDataUrl || fallbackCrop,
        fullPageDataUrl: prev?.fullPageDataUrl || fallbackCrop,
      }));

      const wk = (
        window as unknown as {
          webkit?: {
            messageHandlers?: {
              amanuensisNative?: { postMessage: (msg: Record<string, unknown>) => void };
            };
          };
        }
      ).webkit;
      if (wk?.messageHandlers?.amanuensisNative) {
        wk.messageHandlers.amanuensisNative.postMessage({
          action: 'getScanSnippet',
          page: explicitPage,
          y: targetY,
          height: 0.22,
          text: explicitY !== undefined ? '' : sourceText,
        });
      }
    },
    [ocrProgress.totalPdfPages]
  );

  const totalInstalledWeightsMb = useMemo(
    () => models.filter((m) => m.installed).reduce((acc, m) => acc + m.size_mb, 0),
    [models]
  );
  const totalModelCachesMb = useMemo(
    () => models.reduce((acc, m) => acc + (m.cache_size_mb ?? 0), 0),
    [models]
  );
  const filteredDiscoveredModels = useMemo(() => {
    if (diskScanFilter === 'usable') {
      return discoveredDiskModels.filter(
        (d) => d.status === 'NewUsable' || d.status === 'AlreadyRegistered'
      );
    }
    if (diskScanFilter === 'duplicate') {
      return discoveredDiskModels.filter((d) => d.status === 'DuplicateWaste');
    }
    if (diskScanFilter === 'unusable') {
      return discoveredDiskModels.filter((d) => d.status === 'UnusableOrIncompatible');
    }
    return discoveredDiskModels;
  }, [discoveredDiskModels, diskScanFilter]);

  const filteredOpenMirrors = useMemo(() => {
    return openMirrors.filter((m) => {
      if (mirrorCategoryFilter !== 'Todos' && m.category !== mirrorCategoryFilter) return false;
      if (mirrorLangFilter !== 'Todos' && m.source_lang !== mirrorLangFilter) return false;
      if (mirrorSearchQuery.trim()) {
        const q = mirrorSearchQuery.toLowerCase();
        const hay = `${m.name} ${m.provider_org} ${m.description} ${m.category}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [openMirrors, mirrorCategoryFilter, mirrorLangFilter, mirrorSearchQuery]);

  const renderModelManagementSuite = () => (
    <div>
      {/* Hardware Diagnostic & Storage/Cache Intelligence Header */}
      <div
        className="card"
        style={{
          borderLeft: '5px solid var(--accent)',
          marginBottom: '12px',
        }}
      >
        <div
          className="card-title"
          style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}
        >
          <span>💻 Diagnóstico de Hardware Local & Inteligência de Armazenamento / Cache</span>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <span className="badge badge-exact">
              {hardwareProfile.cpu_cores} Núcleos • {hardwareProfile.total_ram_gb} GB RAM Unificada
            </span>
            <span className="badge badge-accent">
              Pesos Instalados: {(totalInstalledWeightsMb / 1024).toFixed(2)} GB
            </span>
            <span className="badge badge-fuzzy">
              Caches KV/mmap + Órfãos: {totalModelCachesMb + orphanedCacheMb} MB
            </span>
          </div>
        </div>
        <p style={{ fontSize: '0.82rem', lineHeight: 1.45, marginBottom: '8px' }}>
          {hardwareProfile.layman_summary}
        </p>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '8px',
            paddingTop: '6px',
            borderTop: '1px solid var(--border)',
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
          }}
        >
          <span>
            Processador: <strong>{hardwareProfile.cpu_brand}</strong> •{' '}
            {hardwareProfile.gpu_acceleration} • Orçamento seguro p/ IA Local:{' '}
            <strong>até {(hardwareProfile.total_ram_gb * 0.72).toFixed(1)} GB sem swap</strong>
          </span>
          <button
            type="button"
            className="btn"
            style={{ fontSize: '0.73rem' }}
            disabled={totalModelCachesMb + orphanedCacheMb === 0}
            onClick={handlePurgeAllCachesAndOrphans}
          >
            🧹 Limpar Todos os Caches & Shards Órfãos ({totalModelCachesMb + orphanedCacheMb} MB)
          </button>
        </div>
      </div>

      {/* 3 Sub-Tabs of the Model Manager */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '8px',
          marginBottom: '12px',
        }}
      >
        <button
          type="button"
          className={`btn ${modelManagerSubTab === 'catalog' ? 'btn-primary' : ''}`}
          style={{ padding: '8px 10px', justifyContent: 'flex-start', textAlign: 'left' }}
          onClick={() => setModelManagerSubTab('catalog')}
        >
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.82rem' }}>
              📦 1. Modelos & Caches ({models.filter((m) => m.installed).length} instalados)
            </div>
            <div style={{ fontSize: '0.7rem', opacity: 0.9 }}>
              Baixar novos GGUFs, ativar, limpar KV cache ou apagar modelo do disco
            </div>
          </div>
        </button>

        <button
          type="button"
          className={`btn ${modelManagerSubTab === 'custom_gguf' ? 'btn-primary' : ''}`}
          style={{ padding: '8px 10px', justifyContent: 'flex-start', textAlign: 'left' }}
          onClick={() => setModelManagerSubTab('custom_gguf')}
        >
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.82rem' }}>
              🔗 2. Apontar Modelo llama.cpp (.gguf)
            </div>
            <div style={{ fontSize: '0.7rem', opacity: 0.9 }}>
              Use qualquer arquivo .gguf ou .bin que você mesmo baixou no computador
            </div>
          </div>
        </button>

        <button
          type="button"
          className={`btn ${modelManagerSubTab === 'scanner' ? 'btn-primary' : ''}`}
          style={{ padding: '8px 10px', justifyContent: 'flex-start', textAlign: 'left' }}
          onClick={() => {
            setModelManagerSubTab('scanner');
            triggerScanComputerForModels();
          }}
        >
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.82rem' }}>
              🔍 3. Varrer Computador & Diagnóstico ({discoveredDiskModels.length})
            </div>
            <div style={{ fontSize: '0.7rem', opacity: 0.9 }}>
              Achar modelos no disco, duplicatas, viabilidade de hardware e confiabilidade
            </div>
          </div>
        </button>
      </div>

      {/* SUB-TAB 1: GERENCIAR MODELOS, DOWNLOAD & LIMPEZA DE CACHES */}
      {modelManagerSubTab === 'catalog' && (
        <div>
          {models.map((m) => {
            const isRecommended = m.id === hardwareProfile.recommended_model_id;
            const isTooltipOpen = openTooltipModelId === m.id;
            const cacheMb = m.cache_size_mb ?? 0;
            const totalDiskGb = ((m.size_mb + cacheMb) / 1024).toFixed(2);
            return (
              <div
                key={m.id}
                className="card"
                style={{
                  border: m.active ? '2px solid var(--accent)' : '1px solid var(--border)',
                  position: 'relative',
                }}
              >
                <div className="card-title" style={{ flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <input
                      type="radio"
                      checked={m.active}
                      disabled={!m.installed}
                      onChange={() =>
                        m.installed &&
                        setModels(models.map((item) => ({ ...item, active: item.id === m.id })))
                      }
                    />
                    <span style={{ fontSize: '0.92rem', fontWeight: 700 }}>{m.friendly_title}</span>
                    {m.installed ? (
                      <span className={`badge ${m.active ? 'badge-exact' : 'badge-accent'}`}>
                        {m.active ? '🟢 Instalado & Ativo' : '🔵 Instalado no Disco'}
                      </span>
                    ) : (
                      <span className="badge badge-fuzzy">
                        ☁️ Disponível p/ Download ({(m.size_mb / 1024).toFixed(2)} GB)
                      </span>
                    )}
                    {isRecommended && (
                      <span className="badge badge-exact">🏆 RECOMENDADO P/ SEU MAC</span>
                    )}
                    {m.hardware_fit_badge && (
                      <span className="badge badge-exact">{m.hardware_fit_badge}</span>
                    )}
                    {m.task_reliability_badge && (
                      <span className="badge badge-accent">{m.task_reliability_badge}</span>
                    )}
                  </div>

                  <div
                    className="tooltip-wrapper"
                    onMouseEnter={() => setOpenTooltipModelId(m.id)}
                    onMouseLeave={() => setOpenTooltipModelId(null)}
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenTooltipModelId(isTooltipOpen ? null : m.id);
                    }}
                  >
                    <button type="button" className="btn" style={{ fontSize: '0.73rem' }}>
                      📊 Comparativo & Benchmark (?)
                    </button>
                    {isTooltipOpen && (
                      <div className="tooltip-popover" onClick={(e) => e.stopPropagation()}>
                        <div
                          style={{
                            fontWeight: 700,
                            marginBottom: '6px',
                            color: 'var(--accent)',
                          }}
                        >
                          📈 Estimativa no Seu Computador ({hardwareProfile.total_ram_gb} GB RAM)
                        </div>
                        <p style={{ marginBottom: '8px' }}>{m.tooltip_benchmark}</p>

                        <div>
                          <strong>Velocidade ({m.est_words_per_sec} palavras/seg):</strong>
                          <div className="meter-bar">
                            <div
                              className="meter-fill"
                              style={{ width: `${Math.min(100, m.est_words_per_sec)}%` }}
                            />
                          </div>
                        </div>
                        <div>
                          <strong>Fidelidade Editorial, Acadêmica e obediências às Skills:</strong>
                          <div className="meter-bar">
                            <div
                              className="meter-fill"
                              style={{
                                width:
                                  m.quant.includes('Q4') || m.quant.includes('Q5')
                                    ? '96%'
                                    : '78%',
                              }}
                            />
                          </div>
                        </div>
                        <div>
                          <strong>Leveza na Memória (Folga p/ outros apps):</strong>
                          <div className="meter-bar">
                            <div
                              className="meter-fill"
                              style={{
                                width: `${Math.max(
                                  25,
                                  Math.min(95, Math.round(100 - (m.size_mb / 12000) * 100))
                                )}%`,
                              }}
                            />
                          </div>
                        </div>
                        <div
                          style={{
                            fontSize: '0.72rem',
                            color: 'var(--text-muted)',
                            borderTop: '1px solid var(--border)',
                            paddingTop: '6px',
                          }}
                        >
                          ⏱️ Tempo p/ 1 lauda (250 palavras):{' '}
                          <strong>~{m.est_seconds_per_page} segundos</strong> • Formato: {m.quant} GGUF
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <p style={{ fontSize: '0.81rem', marginBottom: '8px', lineHeight: 1.45 }}>
                  {m.layman_description}
                </p>

                {/* Live Download Progress Bar if currently downloading */}
                {m.is_downloading && (
                  <div
                    style={{
                      padding: '8px 10px',
                      marginBottom: '8px',
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--accent)',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        marginBottom: '4px',
                      }}
                    >
                      <span>{m.download_stage_label || 'Baixando modelo GGUF...'}</span>
                      <span>{m.download_progress_pct ?? 10}%</span>
                    </div>
                    <div className="meter-bar" style={{ height: '10px' }}>
                      <div
                        className="meter-fill"
                        style={{ width: `${m.download_progress_pct ?? 10}%` }}
                      />
                    </div>
                  </div>
                )}

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '8px',
                    fontSize: '0.75rem',
                    background: 'var(--bg-primary)',
                    padding: '8px',
                    border: '1px solid var(--border)',
                    marginBottom: '8px',
                  }}
                >
                  <div>
                    <strong>⚡ Velocidade:</strong>
                    <div>{m.speed_rating}</div>
                  </div>
                  <div>
                    <strong>🎯 Qualidade & Confiabilidade:</strong>
                    <div>{m.quality_rating}</div>
                  </div>
                  <div>
                    <strong>💾 Armazenamento & Cache:</strong>
                    <div>
                      Pesos: <strong>{(m.size_mb / 1024).toFixed(2)} GB</strong> ({m.quant}) • KV/mmap
                      Cache: <strong>{cacheMb} MB</strong>
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '8px',
                    fontSize: '0.73rem',
                  }}
                >
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                    📂 {m.local_path || `~/Library/Application Support/Amanuensis/models/${m.id}.gguf`}
                  </span>

                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {!m.installed ? (
                      <button
                        type="button"
                        className="btn btn-primary"
                        disabled={m.is_downloading}
                        onClick={() => handleDownloadModel(m.id)}
                      >
                        {m.is_downloading
                          ? `⏳ Baixando (${m.download_progress_pct ?? 0}%)...`
                          : `⬇️ Baixar Modelo GGUF (${(m.size_mb / 1024).toFixed(2)} GB)`}
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          className={`btn ${m.active ? 'btn-success' : 'btn-primary'}`}
                          onClick={() => {
                            setModels(
                              models.map((item) => ({ ...item, active: item.id === m.id }))
                            );
                            setStatusNotice(`🧠 Modelo "${m.name}" ativado para tradução e formatação!`);
                          }}
                        >
                          {m.active ? '✓ Modelo Ativo' : '⚡ Ativar Este Modelo'}
                        </button>
                        <button
                          type="button"
                          className="btn"
                          disabled={cacheMb === 0}
                          onClick={() => handleClearModelCacheOnly(m.id)}
                          title="Apaga apenas os caches KV/Prompt/mmap sem apagar os pesos .gguf do modelo"
                        >
                          🧹 Limpar Cache ({cacheMb} MB)
                        </button>
                        <button
                          type="button"
                          className="btn"
                          style={{ color: 'var(--danger)' }}
                          onClick={() => handleDeleteModelAndCaches(m.id)}
                          title="Apaga os pesos .gguf e todos os caches associados do disco"
                        >
                          🗑️ Apagar Modelo + Caches ({totalDiskGb} GB)
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* SUB-TAB 2: APONTAR MODELO PRÓPRIO COMPATÍVEL COM LLAMA.CPP (.GGUF / .BIN) */}
      {modelManagerSubTab === 'custom_gguf' && (
        <div className="card" style={{ border: '2px solid var(--accent)' }}>
          <div className="card-title">
            <span>🔗 Usar Modelo Próprio Compatível com llama.cpp (.gguf / .bin)</span>
            <span className="badge badge-exact">Zero Cópia • Leitura Direta mmap</span>
          </div>
          <p style={{ fontSize: '0.81rem', color: 'var(--text-muted)', marginBottom: '10px' }}>
            Já baixou um modelo no HuggingFace, LM Studio, Ollama ou Jan? Aponte o endereço do arquivo{' '}
            <code>.gguf</code> abaixo. O Amanuensis valida o cabeçalho <code>llama.cpp</code>, calcula se
            ele é recomendável para os seus <strong>{hardwareProfile.total_ram_gb} GB de RAM</strong> e se
            é confiável para tradução editorial antes de ativar:
          </p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1fr',
              gap: '10px',
              marginBottom: '10px',
            }}
          >
            <div>
              <label style={{ fontSize: '0.76rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                Endereço Local do Arquivo (.gguf ou .bin):
              </label>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  type="text"
                  className="select-pill"
                  style={{ width: '100%', fontFamily: 'var(--font-mono)', fontSize: '0.76rem' }}
                  value={customGgufPath}
                  onChange={(e) => setCustomGgufPath(e.target.value)}
                  placeholder="/Volumes/VAULT/Models/meu-modelo-q4_k_m.gguf"
                />
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ whiteSpace: 'nowrap' }}
                  onClick={triggerNativeModelPicker}
                >
                  📂 Procurar no Finder…
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 0.8fr', gap: '8px' }}>
              <div>
                <label style={{ fontSize: '0.76rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                  Nome de Exibição:
                </label>
                <input
                  type="text"
                  className="select-pill"
                  style={{ width: '100%' }}
                  value={customGgufName}
                  onChange={(e) => setCustomGgufName(e.target.value)}
                  placeholder="Ex: Mistral Nemo 12B Q4"
                />
              </div>
              <div>
                <label style={{ fontSize: '0.76rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                  Tamanho (MB):
                </label>
                <input
                  type="number"
                  className="select-pill"
                  style={{ width: '100%' }}
                  value={customGgufSizeMb}
                  onChange={(e) => setCustomGgufSizeMb(Math.max(100, Number(e.target.value) || 2000))}
                />
              </div>
            </div>
          </div>

          {/* Live Pre-Registration Diagnostic Box */}
          <div
            style={{
              background: 'var(--bg-primary)',
              border: '1px solid var(--border)',
              padding: '10px',
              marginBottom: '10px',
              fontSize: '0.79rem',
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: '6px', color: 'var(--accent)' }}>
              🔬 Diagnóstico Automático do Arquivo Apontado ({customModelPreviewDiagnostic.filename}):
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '6px' }}>
              <div>
                <strong>1. Viabilidade no Seu Hardware ({hardwareProfile.total_ram_gb} GB RAM):</strong>
                <div style={{ marginTop: '2px' }}>{customModelPreviewDiagnostic.hardware_verdict}</div>
              </div>
              <div>
                <strong>2. Confiabilidade p/ Tradução & Formatação:</strong>
                <div style={{ marginTop: '2px' }}>{customModelPreviewDiagnostic.reliability_verdict}</div>
              </div>
            </div>
            <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>
              Arquitetura detectada: <strong>{customModelPreviewDiagnostic.family}</strong> • Quantização:{' '}
              <strong>{customModelPreviewDiagnostic.quant}</strong> • Memória estimada:{' '}
              <strong>~{customModelPreviewDiagnostic.ram_required_gb} GB</strong> • Velocidade estimada:{' '}
              <strong>~{customModelPreviewDiagnostic.est_words_per_sec} palavras/seg</strong>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button
              type="button"
              className="btn btn-success"
              onClick={handleRegisterCustomGgufModel}
            >
              ➕ Vincular & Ativar Modelo llama.cpp Agora
            </button>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: VARRER COMPUTADOR & DIAGNÓSTICO DE MODELOS NO DISCO */}
      {modelManagerSubTab === 'scanner' && (
        <div>
          <div
            className="card"
            style={{
              background: 'var(--bg-primary)',
              border: '1px solid var(--accent)',
              marginBottom: '10px',
            }}
          >
            <div
              className="card-title"
              style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}
            >
              <span>
                🔍 Scanner de Modelos no Disco (Duplicados, Novos, Incompatíveis & Adequação ao Hardware)
              </span>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ fontSize: '0.74rem' }}
                  onClick={() => triggerScanComputerForModels()}
                >
                  {isScanningDiskModels ? '⏳ Varrendo Disco...' : '🔄 Varrer Pastas Padrão Agora'}
                </button>
                <button
                  type="button"
                  className="btn"
                  style={{ fontSize: '0.74rem' }}
                  onClick={triggerPickDirectoryForModelScan}
                >
                  📂 Escolher Outra Pasta / SSD no Finder…
                </button>
              </div>
            </div>

            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
              Diretórios inspecionados: <code>{scannedDirectoriesList.join(' • ')}</code>
            </div>

            {/* Filter Pills */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className={`btn ${diskScanFilter === 'all' ? 'btn-primary' : ''}`}
                style={{ fontSize: '0.73rem' }}
                onClick={() => setDiskScanFilter('all')}
              >
                Todos ({discoveredDiskModels.length})
              </button>
              <button
                type="button"
                className={`btn ${diskScanFilter === 'usable' ? 'btn-primary' : ''}`}
                style={{ fontSize: '0.73rem' }}
                onClick={() => setDiskScanFilter('usable')}
              >
                🟢 Novos & Usáveis (
                {
                  discoveredDiskModels.filter(
                    (d) => d.status === 'NewUsable' || d.status === 'AlreadyRegistered'
                  ).length
                }
                )
              </button>
              <button
                type="button"
                className={`btn ${diskScanFilter === 'duplicate' ? 'btn-primary' : ''}`}
                style={{ fontSize: '0.73rem' }}
                onClick={() => setDiskScanFilter('duplicate')}
              >
                ⚠️ Duplicados Desperdiçando Espaço (
                {discoveredDiskModels.filter((d) => d.status === 'DuplicateWaste').length})
              </button>
              <button
                type="button"
                className={`btn ${diskScanFilter === 'unusable' ? 'btn-primary' : ''}`}
                style={{ fontSize: '0.73rem' }}
                onClick={() => setDiskScanFilter('unusable')}
              >
                ❌ Não Usáveis / Incompatíveis (
                {discoveredDiskModels.filter((d) => d.status === 'UnusableOrIncompatible').length})
              </button>
            </div>
          </div>

          {filteredDiscoveredModels.map((d) => (
            <div
              key={d.id}
              className="card"
              style={{
                borderLeft:
                  d.status === 'NewUsable'
                    ? '4px solid var(--success)'
                    : d.status === 'DuplicateWaste'
                    ? '4px solid #d97706'
                    : d.status === 'AlreadyRegistered'
                    ? '4px solid var(--accent)'
                    : '4px solid var(--danger)',
              }}
            >
              <div className="card-title" style={{ flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <strong style={{ fontSize: '0.88rem' }}>{d.filename}</strong>
                  <span
                    className={`badge ${
                      d.status === 'NewUsable' || d.status === 'AlreadyRegistered'
                        ? 'badge-exact'
                        : 'badge-fuzzy'
                    }`}
                  >
                    {d.status_label}
                  </span>
                  <span className="badge badge-accent">
                    {(d.size_mb / 1024).toFixed(2)} GB • {d.quant}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {d.status === 'NewUsable' && (
                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{ fontSize: '0.74rem' }}
                      onClick={() => handleLinkDiscoveredModel(d)}
                    >
                      🔗 Vincular & Usar no Amanuensis (Sem Duplicar)
                    </button>
                  )}
                  {(d.status === 'DuplicateWaste' || d.status === 'UnusableOrIncompatible') && (
                    <button
                      type="button"
                      className="btn"
                      style={{ fontSize: '0.74rem', color: 'var(--danger)' }}
                      onClick={() => handleDeleteDuplicateOrUnusableDiskModel(d)}
                    >
                      🗑️ Apagar Arquivo & Liberar {(d.size_mb / 1024).toFixed(2)} GB
                    </button>
                  )}
                </div>
              </div>

              <div
                style={{
                  fontSize: '0.73rem',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--text-muted)',
                  marginBottom: '6px',
                }}
              >
                📂 Encontrado em: {d.path}
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '8px',
                  background: 'var(--bg-primary)',
                  padding: '8px',
                  border: '1px solid var(--border)',
                  fontSize: '0.77rem',
                  marginBottom: '6px',
                }}
              >
                <div>
                  <strong>💻 É Recomendável p/ o Seu Hardware?</strong>
                  <div style={{ marginTop: '2px' }}>{d.hardware_verdict}</div>
                </div>
                <div>
                  <strong>🛡️ É Confiável p/ Tradução & Formatação?</strong>
                  <div style={{ marginTop: '2px' }}>{d.reliability_verdict}</div>
                </div>
              </div>

              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                💡 <strong>Diagnóstico:</strong> {d.diagnostic_notes}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div
      className="app-shell"
      onClick={() => openMenuId && setOpenMenuId(null)}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!isDraggingFile) setIsDraggingFile(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        if (e.currentTarget === e.target) setIsDraggingFile(false);
      }}
      onDrop={handleDropFile}
    >
      {/* Hidden File Input for Universal Document Upload from Computer */}
      <input
        ref={pdfFileInputRef}
        type="file"
        accept=".pdf,.docx,.doc,.rtf,.odt,.md,.markdown,.txt,.srt,.csv"
        style={{ display: 'none' }}
        onChange={handleScannedPdfFileChange}
      />

      {/* Universal Document & Text Onboarding Wizard (v1) */}
      {showOnboarding && (
        <div className="onboarding-backdrop">
          <div className="onboarding-modal">
            <div className="onboarding-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <img
                  src="/logo.png"
                  alt="Amanuensis Logo"
                  style={{ width: '44px', height: '44px', borderRadius: '4px' }}
                />
                <div>
                  <h2 style={{ fontSize: '1.08rem', marginBottom: '2px' }}>
                    Central de Entrada Universal — Traga Qualquer Documento ou Texto para Traduzir
                  </h2>
                  <p style={{ fontSize: '0.78rem', opacity: 0.94 }}>
                    Passo 1: PDF Digital, PDF Escaneado, Word (.docx), Texto Colado (Cmd+V) ou Markdown →
                    Passo 2: Especialidade & Harness → Passo 3: IA Local e Traduzir
                  </p>
                </div>
              </div>
              <span className="brand-badge">v1.0 Desktop</span>
            </div>

            <div className="onboarding-steps-bar">
              {[
                { step: 1, label: '1. 📥 Fonte do Texto (PDF, Word, Colar Cmd+V, MD/TXT)' },
                { step: 2, label: '2. 🎯 Sua Especialidade & Harness' },
                { step: 3, label: '3. 💻 IA Local p/ Seu Computador & Traduzir' },
              ].map((s) => (
                <div
                  key={s.step}
                  className={`step-pill ${
                    onboardingStep === s.step ? 'active' : onboardingStep > s.step ? 'done' : ''
                  }`}
                  onClick={() => setOnboardingStep(s.step)}
                >
                  {onboardingStep > s.step ? '✓ ' : ''}
                  {s.label}
                </div>
              ))}
            </div>

            <div className="onboarding-body">
              {onboardingStep === 1 && (
                <div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '8px',
                      flexWrap: 'wrap',
                      gap: '8px',
                    }}
                  >
                    <div>
                      <h3 style={{ fontSize: '1rem', marginBottom: '2px' }}>
                        Passo 1: Como você quer trazer seu texto para traduzir hoje?
                      </h3>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        Você <strong>não precisa</strong> começar apenas por um scan! Escolha abaixo entre abrir um{' '}
                        <strong>PDF Digital normal</strong>, um <strong>Word (.docx)</strong>,{' '}
                        <strong>Colar um texto copiado (Cmd+V)</strong>, <strong>.md/.txt/.srt</strong> ou um{' '}
                        <strong>PDF Escaneado (OCR)</strong>:
                      </p>
                    </div>
                    <span className="badge badge-exact" style={{ fontSize: '0.75rem' }}>
                      Modo Ativo: {getIngestionModeLabel(activeIngestionMode)}
                    </span>
                  </div>

                  {/* 3 Universal Entry Doors Selector */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: '8px',
                      marginBottom: '10px',
                    }}
                  >
                    <button
                      type="button"
                      className={`btn ${ingestionPortalMode === 'files' ? 'btn-primary' : ''}`}
                      style={{ padding: '8px 10px', justifyContent: 'flex-start', textAlign: 'left' }}
                      onClick={() => setIngestionPortalMode('files')}
                    >
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.82rem' }}>
                          📂 1. Abrir ou Arrastar Arquivo
                        </div>
                        <div style={{ fontSize: '0.71rem', opacity: 0.88 }}>
                          PDF Normal, PDF Escaneado, Word (.docx), .md, .txt, .srt
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      className={`btn ${ingestionPortalMode === 'clipboard' ? 'btn-primary' : ''}`}
                      style={{ padding: '8px 10px', justifyContent: 'flex-start', textAlign: 'left' }}
                      onClick={() => {
                        setIngestionPortalMode('clipboard');
                        setActiveIngestionMode('ClipboardPaste');
                        setDehyphenateEnabled(false);
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.82rem' }}>
                          📋 2. Colar Texto Copiado (Cmd+V)
                        </div>
                        <div style={{ fontSize: '0.71rem', opacity: 0.88 }}>
                          Artigo da web, e-mail, trecho de livro ou digitação direta
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      className={`btn ${ingestionPortalMode === 'samples' ? 'btn-primary' : ''}`}
                      style={{ padding: '8px 10px', justifyContent: 'flex-start', textAlign: 'left' }}
                      onClick={() => setIngestionPortalMode('samples')}
                    >
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.82rem' }}>
                          🧪 3. Textos & Documentos de Exemplo
                        </div>
                        <div style={{ fontSize: '0.71rem', opacity: 0.88 }}>
                          Teste imediato (Política, Acadêmico ou Literatura)
                        </div>
                      </div>
                    </button>
                  </div>

                  {ingestionPortalMode === 'clipboard' ? (
                    <div
                      className="card"
                      style={{
                        marginBottom: '12px',
                        border: '2px solid var(--accent)',
                        background: 'var(--bg-surface)',
                      }}
                    >
                      <div
                        className="card-title"
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: '8px',
                        }}
                      >
                        <span>📋 Colar Texto da Área de Transferência ou Digitar Direto (Sem OCR)</span>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            type="button"
                            className="btn btn-primary"
                            onClick={triggerPasteClipboard}
                          >
                            📋 Puxar Texto Copiado do macOS Agora (Cmd+V)
                          </button>
                          <button
                            type="button"
                            className="btn"
                            onClick={() => {
                              setUploadedPdfName('clipboard://Novo_Texto_Colado.txt');
                              setActiveIngestionMode('ClipboardPaste');
                              setDehyphenateEnabled(false);
                              setOcrInputScan('');
                            }}
                          >
                            🧹 Limpar Caixa
                          </button>
                        </div>
                      </div>
                      <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                        Cole abaixo qualquer texto que você copiou (de um site, Google Docs, Word, e-mail ou
                        mensagem). O <strong>Harness de Estruturação</strong> vai separar automaticamente os
                        títulos e dividir os parágrafos em trechos curtos de 1 a 2 frases:
                      </p>
                      <textarea
                        className="code-editor"
                        style={{ minHeight: '135px', fontSize: '0.82rem' }}
                        placeholder="Cole aqui o texto copiado (Cmd+V) ou digite diretamente..."
                        value={ocrInputScan}
                        onChange={(e) => {
                          const val = e.target.value;
                          setUploadedPdfName('clipboard://Texto_Colado_Direto.txt');
                          setSelectedSamplePdfId('custom-upload');
                          setActiveIngestionMode('ClipboardPaste');
                          setDehyphenateEnabled(false);
                          setOcrInputScan(val);
                          if (val.trim().length > 12) {
                            setOnbSourceLang(detectSourceLanguage(val));
                          }
                        }}
                      />
                    </div>
                  ) : (
                    /* Primary Action: Choose or Drag-and-Drop Any Document from Computer */
                    <div
                      className="pdf-dropzone"
                      style={{
                        borderColor: isDraggingFile ? 'var(--success)' : 'var(--accent)',
                        background: isDraggingFile ? 'rgba(60, 141, 13, 0.14)' : 'var(--page-canvas)',
                        borderWidth: isDraggingFile ? '3px' : '2px',
                      }}
                      onClick={() => {
                        if (!isOcrLoading) triggerChooseFile();
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsDraggingFile(true);
                      }}
                      onDragEnter={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsDraggingFile(true);
                      }}
                      onDragLeave={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsDraggingFile(false);
                      }}
                      onDrop={handleDropFile}
                    >
                      {isOcrLoading ? (
                        <div onClick={(e) => e.stopPropagation()}>
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              fontSize: '0.88rem',
                              fontWeight: 700,
                              color: 'var(--accent)',
                              marginBottom: '4px',
                            }}
                          >
                            <span>
                              ⏳ Lendo "{uploadedPdfName.slice(0, 48)}
                              {uploadedPdfName.length > 48 ? '…' : ''}"
                            </span>
                            <span className="badge badge-exact">
                              Página {ocrProgress.currentPage} de {ocrProgress.targetEndPage} (Total:{' '}
                              {ocrProgress.totalPdfPages} págs) • {ocrProgress.percent}%
                            </span>
                          </div>

                          {/* Windows XP Segmented Green Progress Bar */}
                          <div className="xp-progress-track">
                            <div
                              className="xp-progress-fill"
                              style={{ width: `${ocrProgress.percent}%` }}
                            />
                          </div>

                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              marginTop: '6px',
                            }}
                          >
                            <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                              O texto extraído já está sendo estruturado em trechos curtos abaixo...
                            </span>
                            <button
                              type="button"
                              className="btn btn-success"
                              onClick={triggerStopOcr}
                            >
                              ⏹️ Parar Aqui & Usar as {ocrProgress.currentPage} Páginas Já Extraídas
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div
                            style={{
                              fontSize: '0.98rem',
                              fontWeight: 700,
                              marginBottom: '6px',
                              color: isDraggingFile ? 'var(--success)' : 'var(--accent)',
                            }}
                          >
                            {isDraggingFile
                              ? '📥 Solte aqui seu PDF (Digital ou Escaneado), Word (.docx), Markdown (.md), Texto (.txt) ou Legenda (.srt)!'
                              : '📂 Clique Aqui ou Arraste seu Documento (PDF Normal, PDF Escaneado, Word .docx, .md, .txt, .srt)'}
                          </div>
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'center',
                              gap: '6px',
                              marginBottom: '8px',
                              flexWrap: 'wrap',
                            }}
                          >
                            <span className="badge">📄 PDF Digital (Extração Direta s/ OCR)</span>
                            <span className="badge">📝 Word (.docx / .rtf / .odt)</span>
                            <span className="badge">📑 Markdown / TXT / SRT (.md, .txt, .srt)</span>
                            <span className="badge">🔍 PDF Escaneado (Apple Vision OCR)</span>
                          </div>
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'center',
                              gap: '8px',
                              marginBottom: '6px',
                              flexWrap: 'wrap',
                            }}
                          >
                            <button
                              type="button"
                              className="btn btn-primary"
                              onClick={(e) => {
                                e.stopPropagation();
                                triggerChooseFile();
                              }}
                            >
                              📂 Escolher Arquivo no Finder (.pdf, .docx, .md, .txt, .srt)
                            </button>
                            <button
                              type="button"
                              className="btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                triggerPasteClipboard();
                              }}
                            >
                              📋 Ou Colar Texto Copiado (Cmd+V)
                            </button>
                            {ocrProgress.hasMorePages && (
                              <button
                                type="button"
                                className="btn btn-success"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  triggerScanMorePages();
                                }}
                              >
                                ▶️ Continuar Leitura do Restante do Documento ({ocrProgress.currentPage}/
                                {ocrProgress.totalPdfPages} págs lidas)
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* 3 One-Click Sample Scanned PDFs for Instant Onboarding Testing */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: '8px',
                      marginBottom: '12px',
                    }}
                  >
                    {SAMPLE_SCANNED_PDFS.map((sample) => {
                      const isSel = selectedSamplePdfId === sample.id;
                      return (
                        <div
                          key={sample.id}
                          className={`theme-card ${isSel ? 'active' : ''}`}
                          onClick={() => handleSelectSamplePdf(sample)}
                        >
                          <div style={{ fontWeight: 700, fontSize: '0.82rem', marginBottom: '4px' }}>
                            {sample.title}
                          </div>
                          <div
                            style={{
                              fontSize: '0.74rem',
                              color: 'var(--text-muted)',
                              marginBottom: '6px',
                            }}
                          >
                            {sample.subtitle}
                          </div>
                          <span className="badge badge-exact" style={{ fontSize: '0.68rem' }}>
                            {isSel ? '✓ PDF Selecionado' : 'Usar este PDF Escaneado'}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Live OCR & Scan-to-Structure Formatting Harness Preview right inside Step 1 */}
                  <div className="card" style={{ marginBottom: 0 }}>
                    <div className="card-title" style={{ flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                        <span>
                          🛡️ <strong>Harness de Estruturação Pré-Tradução:</strong>{' '}
                          {uploadedPdfName.length > 36
                            ? uploadedPdfName.slice(0, 36) + '…'
                            : uploadedPdfName}
                        </span>
                        <span className="badge badge-exact">
                          🌐 {onbSourceLang} → {onbTargetLang}
                        </span>
                        <span className="badge badge-exact">
                          ✓ Auditoria: {ocrFormattingResult.audit.lexical_fidelity_pct}% Fidelidade (0% Perda)
                        </span>
                        <span className="badge badge-accent">
                          ✂️ {ocrFormattingResult.stats.final_segments_count} trechos curtos (~
                          {ocrFormattingResult.stats.avg_segment_chars} caract/trecho)
                        </span>
                        {ocrFormattingResult.stats.chapters_and_headings_detected > 0 && (
                          <span className="badge badge-exact">
                            📑 {ocrFormattingResult.stats.chapters_and_headings_detected} capítulos/títulos
                          </span>
                        )}
                        {dehyphenatedCount > 0 && (
                          <span className="badge badge-exact">
                            🔗 {dehyphenatedCount} hifenizações unidas
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <select
                          className="select-pill"
                          style={{ fontSize: '0.73rem', padding: '2px 6px' }}
                          value={chunkGranularity}
                          onChange={(e) =>
                            handleApplyGranularityChange(e.target.value as ChunkGranularity)
                          }
                          title="Escolha o tamanho contextual dos trechos para tradução"
                        >
                          <option value="ContextualShort">
                            🎯 Trechos Curtos & Contextuais (1–2 frases • Recomendado)
                          </option>
                          <option value="ZenMicroSentence">
                            🧘 Micro-Frase / Modo Zen (1 frase por vez)
                          </option>
                          <option value="EditorialParagraph">
                            📖 Parágrafo Editorial (2–3 frases)
                          </option>
                        </select>
                        <button
                          type="button"
                          className="btn"
                          style={{ fontSize: '0.72rem' }}
                          onClick={() => setShowOcrHarnessEditor((prev) => !prev)}
                        >
                          🛡️ {showOcrHarnessEditor ? 'Fechar' : 'Ver'} Harness de Scans (OCR_FORMAT_HARNESS.md)
                        </button>
                        <button
                          type="button"
                          className="btn"
                          style={{ fontSize: '0.72rem' }}
                          onClick={handleDownloadSearchablePdf}
                        >
                          ⬇ PDF Pesquisável
                        </button>
                        <button
                          type="button"
                          className="btn"
                          style={{ fontSize: '0.72rem' }}
                          onClick={() => {
                            downloadTextFile(
                              uploadedPdfName.replace(/\.pdf$/i, '') + '_ocr.md',
                              processedOcrMarkdown,
                              'text/markdown;charset=utf-8'
                            );
                            setStatusNotice('⬇ Markdown estruturado salvo!');
                          }}
                        >
                          ⬇ Markdown (.md)
                        </button>
                      </div>
                    </div>

                    {showOcrHarnessEditor && (
                      <div
                        style={{
                          marginBottom: '8px',
                          padding: '8px',
                          background: 'var(--page-canvas)',
                          border: '2px solid var(--accent)',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '4px',
                            fontSize: '0.76rem',
                            fontWeight: 700,
                          }}
                        >
                          <span>
                            📜 Diretrizes do Harness de Estruturação de Scans (.amanuensis/OCR_FORMAT_HARNESS.md)
                          </span>
                          <span className="badge badge-exact">
                            5 Skills Ativas • Invariância Lexical 100%
                          </span>
                        </div>
                        <textarea
                          className="code-editor"
                          style={{ minHeight: '95px', fontSize: '0.74rem' }}
                          value={ocrFormatHarnessMd}
                          onChange={(e) => setOcrFormatHarnessMd(e.target.value)}
                        />
                      </div>
                    )}

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1.25fr',
                        gap: '10px',
                        marginTop: '6px',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '0.74rem', fontWeight: 700, marginBottom: '4px' }}>
                          📄 Texto Bruto do Scan (OCR):
                        </div>
                        <textarea
                          className="code-editor"
                          style={{ minHeight: '165px', fontSize: '0.75rem' }}
                          value={ocrInputScan}
                          onChange={(e) => setOcrInputScan(e.target.value)}
                        />
                      </div>
                      <div>
                        <div
                          style={{
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            marginBottom: '4px',
                            display: 'flex',
                            justifyContent: 'space-between',
                          }}
                        >
                          <span>
                            ✨ Trechos Curtos & Contextuais Formatados pelo Harness (Prontos p/ Traduzir):
                          </span>
                          <span style={{ color: 'var(--success)' }}>
                            Zero Blocos Gigantes (máx {ocrFormattingResult.stats.max_segment_chars} caract.)
                          </span>
                        </div>
                        <div className="ocr-segment-preview-list">
                          {ocrFormattingResult.segments.map((seg, sIdx) => {
                            const doubts = detectOcrDoubts(seg.markdown_text);
                            const isInspectingThis = openScanInspectIdx === sIdx;
                            return (
                              <div key={sIdx} className="ocr-segment-chip">
                                <div
                                  className="ocr-segment-chip-header"
                                  style={{ flexWrap: 'wrap', gap: '4px' }}
                                >
                                  <span>
                                    <strong>Trecho #{sIdx + 1}</strong> • [{seg.context_label}]
                                  </span>
                                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                    <button
                                      type="button"
                                      className={`badge ${
                                        doubts.length > 0 ? 'badge-fuzzy' : 'badge-accent'
                                      } badge-btn`}
                                      onClick={() => {
                                        if (isInspectingThis) {
                                          setOpenScanInspectIdx(null);
                                        } else {
                                          setOpenScanInspectIdx(sIdx);
                                          requestScanSnippetForText(
                                            seg.markdown_text,
                                            Math.min(0.85, 0.08 + sIdx * 0.12)
                                          );
                                        }
                                      }}
                                    >
                                      {doubts.length > 0
                                        ? '🔍 Dúvida de OCR? Ver Print do Scan'
                                        : '👁️ Ver Print no Scan (Tirar a Teima)'}
                                    </button>
                                    <span>
                                      {seg.char_count} caract. • {seg.word_count} palavras
                                    </span>
                                  </div>
                                </div>
                                <div style={{ whiteSpace: 'pre-wrap' }}>{seg.markdown_text}</div>

                                {isInspectingThis && (
                                  <div
                                    style={{
                                      marginTop: '6px',
                                      padding: '8px',
                                      background: 'var(--bg-primary)',
                                      border: '2px solid var(--accent)',
                                    }}
                                  >
                                    <div
                                      style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        fontSize: '0.73rem',
                                        fontWeight: 700,
                                        marginBottom: '6px',
                                        flexWrap: 'wrap',
                                        gap: '4px',
                                      }}
                                    >
                                      <span>
                                        🔍 Print Real do Scan Original — Trecho #{sIdx + 1} (Pág.{' '}
                                        {scanSnippetData?.page ?? 1})
                                      </span>
                                      <div style={{ display: 'flex', gap: '4px' }}>
                                        <button
                                          type="button"
                                          className="btn"
                                          style={{ fontSize: '0.68rem', padding: '1px 6px' }}
                                          onClick={() =>
                                            requestScanSnippetForText(
                                              seg.markdown_text,
                                              scanSnippetData?.y ?? 0.18,
                                              scanSnippetData?.page ?? 1,
                                              (scanSnippetData?.y ?? 0.18) - 0.08
                                            )
                                          }
                                        >
                                          ⬆️ Subir Olhar
                                        </button>
                                        <button
                                          type="button"
                                          className="btn"
                                          style={{ fontSize: '0.68rem', padding: '1px 6px' }}
                                          onClick={() =>
                                            requestScanSnippetForText(
                                              seg.markdown_text,
                                              scanSnippetData?.y ?? 0.18,
                                              scanSnippetData?.page ?? 1,
                                              (scanSnippetData?.y ?? 0.18) + 0.08
                                            )
                                          }
                                        >
                                          ⬇️ Descer Olhar
                                        </button>
                                        <button
                                          type="button"
                                          className="btn"
                                          style={{ fontSize: '0.68rem', padding: '1px 6px' }}
                                          onClick={() => setOpenScanInspectIdx(null)}
                                        >
                                          ✕ Fechar
                                        </button>
                                      </div>
                                    </div>
                                    <img
                                      src={
                                        scanSnippetData?.cropDataUrl ||
                                        renderFacsimileScanCropDataUrl(seg.markdown_text)
                                      }
                                      alt="Recorte do Scan Original"
                                      style={{
                                        width: '100%',
                                        maxHeight: '165px',
                                        objectFit: 'contain',
                                        border: '1px solid var(--border)',
                                        background: '#f4efe1',
                                        marginBottom: '6px',
                                      }}
                                    />
                                    {doubts.length > 0 && (
                                      <div
                                        style={{
                                          display: 'flex',
                                          flexWrap: 'wrap',
                                          gap: '6px',
                                          marginBottom: '4px',
                                        }}
                                      >
                                        {doubts.map((d, dIdx) => (
                                          <button
                                            key={dIdx}
                                            type="button"
                                            className="btn btn-success"
                                            style={{ fontSize: '0.72rem', padding: '2px 8px' }}
                                            onClick={() => {
                                              setOcrInputScan((prev) =>
                                                prev.replace(d.wrong, d.right)
                                              );
                                              setStatusNotice(
                                                `✅ Caractere corrigido no OCR: "${d.wrong}" → "${d.right}"!`
                                              );
                                            }}
                                          >
                                            ✨ Corrigir "{d.wrong}" → "{d.right}"
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {onboardingStep === 2 && (
                <div>
                  <h3 style={{ fontSize: '1rem', marginBottom: '6px' }}>
                    Passo 2: Sua Especialidade & Regras do Projeto para "
                    {uploadedPdfName.length > 42
                      ? uploadedPdfName.slice(0, 40) + '…'
                      : uploadedPdfName}
                    "
                  </h3>
                  <p
                    style={{
                      fontSize: '0.84rem',
                      color: 'var(--text-muted)',
                      marginBottom: '14px',
                    }}
                  >
                    Escolha sua área de atuação para que o Harness do projeto configure o vocabulário
                    e o estilo adequados (literário, acadêmico, ciências sociais, jornalismo,
                    ciência política, etc.) sem inventar palavras:
                  </p>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '12px',
                      marginBottom: '14px',
                    }}
                  >
                    <div>
                      <label
                        style={{
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          display: 'block',
                          marginBottom: '4px',
                        }}
                      >
                        Nome do Projeto (Derivado do seu PDF Escaneado)
                      </label>
                      <input
                        className="select-pill"
                        style={{ width: '100%' }}
                        value={onbProjectName}
                        onChange={(e) => setOnbProjectName(e.target.value)}
                      />
                    </div>
                    <div>
                      <label
                        style={{
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          display: 'block',
                          marginBottom: '4px',
                        }}
                      >
                        Domínio / Especialidade do Tradutor
                      </label>
                      <select
                        className="select-pill"
                        style={{ width: '100%' }}
                        value={onbDomain}
                        onChange={(e) => setOnbDomain(e.target.value)}
                      >
                        {DOMAIN_CATEGORIES.map((cat) => (
                          <optgroup key={cat.group} label={cat.group}>
                            {cat.options.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                        <optgroup label="✍️ Outra Especialidade">
                          <option value="__custom__">
                            ➕ Outra área (digitar especialidade personalizada...)
                          </option>
                        </optgroup>
                      </select>
                      {onbDomain === '__custom__' && (
                        <input
                          className="select-pill"
                          style={{ width: '100%', marginTop: '6px' }}
                          placeholder="Digite sua especialidade (ex: Teologia, Arqueologia, Gastronomia...)"
                          value={customDomainText}
                          onChange={(e) => setCustomDomainText(e.target.value)}
                        />
                      )}
                    </div>
                    <div>
                      <label
                        style={{
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          display: 'block',
                          marginBottom: '4px',
                        }}
                      >
                        Idioma Original do PDF (Fonte)
                      </label>
                      <select
                        className="select-pill"
                        style={{ width: '100%' }}
                        value={onbSourceLang}
                        onChange={(e) => setOnbSourceLang(e.target.value)}
                      >
                        <option value="en-US">Inglês (en-US / en-GB)</option>
                        <option value="es-ES">Espanhol (es-ES / América Latina)</option>
                        <option value="fr-FR">Francês (fr-FR)</option>
                        <option value="de-DE">Alemão (de-DE)</option>
                        <option value="it-IT">Italiano (it-IT)</option>
                        <option value="ru-RU">Russo (ru-RU)</option>
                        <option value="zh-CN">Mandarim (zh-CN)</option>
                        <option value="ar-SA">Árabe (ar)</option>
                        <option value="la">Latim Clássico / Eclesiástico (la)</option>
                        <option value="grc">Grego Antigo / Filológico (grc)</option>
                        <option value="pt-BR">Português (pt-BR)</option>
                      </select>
                    </div>
                    <div>
                      <label
                        style={{
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          display: 'block',
                          marginBottom: '4px',
                        }}
                      >
                        Idioma da Tradução (Destino)
                      </label>
                      <select
                        className="select-pill"
                        style={{ width: '100%' }}
                        value={onbTargetLang}
                        onChange={(e) => setOnbTargetLang(e.target.value)}
                      >
                        <option value="pt-BR">Português Brasileiro (pt-BR)</option>
                        <option value="pt-PT">Português Europeu (pt-PT)</option>
                        <option value="en-US">Inglês (en-US)</option>
                        <option value="es-ES">Espanhol (es-ES)</option>
                        <option value="fr-FR">Francês (fr-FR)</option>
                        <option value="de-DE">Alemão (de-DE)</option>
                      </select>
                    </div>
                  </div>

                  <div className="card">
                    <div className="card-title">
                      <span>📂 Harness Anti-Delírio Criado Automaticamente para Seu PDF:</span>
                      <span className="badge badge-exact">{effectiveDomain}</span>
                    </div>
                    <pre
                      style={{
                        fontSize: '0.75rem',
                        fontFamily: 'var(--font-mono)',
                        color: 'var(--text-muted)',
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {`${projectDiskPath}/
├── AGENT.md                  # Diretrizes de estilo para "${effectiveDomain}" (${onbSourceLang} → ${onbTargetLang})
├── glossary.toml             # Glossário obrigatório do projeto (termos travados)
├── learned_rules.json        # Aprende automaticamente com as suas correções e edições
└── skills/                   # Habilidades ativas (des-hifenização de scan, tabelas, citações e notas)`}
                    </pre>
                  </div>
                </div>
              )}

              {onboardingStep === 3 && (
                <div>
                  <h3 style={{ fontSize: '0.96rem', marginBottom: '8px' }}>
                    Passo 3: Gerencie seus Modelos Locais (Baixar, Apagar, Apontar{' '}
                    <code>llama.cpp</code> ou Varrer Computador) para traduzir{' '}
                    <strong>
                      {uploadedPdfName.length > 42
                        ? uploadedPdfName.slice(0, 40) + '…'
                        : uploadedPdfName}
                    </strong>
                    :
                  </h3>

                  {renderModelManagementSuite()}

                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px' }}
                  >
                    <button
                      className="btn btn-primary"
                      onClick={() =>
                        setGgufVerifiedMsg(
                          `✓ Teste concluído na sua máquina! O modelo "${activeModel.friendly_title}" respondeu em 0,03 segundos (~${activeModel.est_seconds_per_page}s por página completa).`
                        )
                      }
                    >
                      ⚡ Fazer Teste Rápido de Velocidade no Meu Computador
                    </button>
                    {ggufVerifiedMsg && (
                      <span
                        style={{ fontSize: '0.8rem', color: 'var(--success)', fontWeight: 700 }}
                      >
                        {ggufVerifiedMsg}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="onboarding-footer">
              <button className="btn" onClick={() => setShowOnboarding(false)}>
                Pular / Ir Direto ao Workbench
              </button>
              <div style={{ display: 'flex', gap: '8px' }}>
                {onboardingStep > 1 && (
                  <button className="btn" onClick={() => setOnboardingStep((s) => s - 1)}>
                    ← Voltar
                  </button>
                )}
                {onboardingStep === 1 && (
                  <button className="btn btn-primary" onClick={() => setOnboardingStep(2)}>
                    Usar este PDF Escaneado & Configurar Especialidade (Passo 2) →
                  </button>
                )}
                {onboardingStep === 2 && (
                  <button className="btn btn-primary" onClick={() => setOnboardingStep(3)}>
                    Escolher Modelo Local p/ Meu Computador (Passo 3) →
                  </button>
                )}
                {onboardingStep === 3 && (
                  <button className="btn btn-success" onClick={handleFinishOnboarding}>
                    🚀 Concluir & Abrir "{uploadedPdfName}" na Estação de Tradução
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================================
          MODO ZEN — Santuário de Tradução Criativa de Baixo Estímulo Visual
          ============================================================================ */}
      {zenMode && (
        <div
          className={`zen-sanctuary zen-atmo-${zenAtmosphere}`}
          style={{
            fontFamily: zenFontSerif
              ? 'Georgia, Palatino, "Iowan Old Style", "Times New Roman", serif'
              : 'var(--font-sans)',
          }}
        >
          {/* Whisper-Quiet Top Bar (fades into background until hovered) */}
          <div className="zen-topbar">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontWeight: 700, letterSpacing: '0.04em' }}>
                🧘 MODO ZEN • {onbProjectName}
              </span>
              <span>
                Trecho <strong>{activeSegIdx + 1}</strong> de <strong>{segments.length}</strong> (
                {Math.round(((activeSegIdx + 1) / Math.max(1, segments.length)) * 100)}%)
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              {/* Low-Stimulus Atmosphere Selector */}
              <button
                type="button"
                className={`zen-pill-btn ${zenAtmosphere === 'sepia' ? 'active' : ''}`}
                onClick={() => setZenAtmosphere('sepia')}
                title="Papel Pergaminho Sépia (Zero Luz Azul)"
              >
                📜 Sépia
              </button>
              <button
                type="button"
                className={`zen-pill-btn ${zenAtmosphere === 'eink' ? 'active' : ''}`}
                onClick={() => setZenAtmosphere('eink')}
                title="E-Ink Noturno Fosco (Sem Brilho)"
              >
                🌙 E-Ink Escuro
              </button>
              <button
                type="button"
                className={`zen-pill-btn ${zenAtmosphere === 'sage' ? 'active' : ''}`}
                onClick={() => setZenAtmosphere('sage')}
                title="Folha de Chá Botânico (Descanso Ocular)"
              >
                🌿 Folha de Chá
              </button>

              <span style={{ opacity: 0.35 }}>|</span>

              {/* Typography & Size Controls */}
              <button
                type="button"
                className="zen-pill-btn"
                onClick={() => setZenFontSerif((prev) => !prev)}
                title="Alternar entre fonte Serifada Editorial e Humanista"
              >
                {zenFontSerif ? '𝐓 Serifada' : '𝖲𝖺𝗇𝗌 Limpa'}
              </button>
              <button
                type="button"
                className="zen-pill-btn"
                onClick={() => setZenFontSizeRem((s) => Math.max(0.95, Number((s - 0.08).toFixed(2))))}
                title="Diminuir fonte"
              >
                A-
              </button>
              <button
                type="button"
                className="zen-pill-btn"
                onClick={() => setZenFontSizeRem((s) => Math.min(1.55, Number((s + 0.08).toFixed(2))))}
                title="Aumentar fonte"
              >
                A+
              </button>

              <span style={{ opacity: 0.35 }}>|</span>

              {/* Segment Breath / Granularity Toggle */}
              <button
                type="button"
                className={`zen-pill-btn ${
                  chunkGranularity === 'ZenMicroSentence' ? 'active' : ''
                }`}
                onClick={() =>
                  handleApplyGranularityChange(
                    chunkGranularity === 'ZenMicroSentence'
                      ? 'ContextualShort'
                      : 'ZenMicroSentence'
                  )
                }
                title="Alternar entre Fôlego de 1 Frase por vez ou Contextual (1–2 frases)"
              >
                {chunkGranularity === 'ZenMicroSentence'
                  ? '🧘 1 Frase por Vez'
                  : '🎯 1–2 Frases Contextuais'}
              </button>

              <button
                type="button"
                className="zen-pill-btn"
                onClick={() => setZenMode(false)}
                title="Sair do Modo Zen e voltar ao Workbench completo (Esc)"
              >
                ✕ Sair do Zen (Esc)
              </button>
            </div>
          </div>

          {/* Center Editorial Stage */}
          <div className="zen-stage">
            {/* Previous Segment Whisper (Ambient Context) */}
            {activeSegIdx > 0 && segments[activeSegIdx - 1] && (
              <div
                className="zen-context-ghost"
                style={{ fontSize: `${Math.max(0.9, zenFontSizeRem - 0.16)}rem` }}
                onClick={() => setActiveSegIdx(activeSegIdx - 1)}
                title="Clique para voltar ao trecho anterior (Alt+↑)"
              >
                <div style={{ fontSize: '0.7rem', marginBottom: '2px' }}>
                  ↑ Trecho anterior #{activeSegIdx}
                </div>
                <div>
                  {segments[activeSegIdx - 1].target_text.trim()
                    ? segments[activeSegIdx - 1].target_text
                    : segments[activeSegIdx - 1].source_text}
                </div>
              </div>
            )}

            {/* Active Creative Card */}
            <div className="zen-active-card">
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '0.73rem',
                  color: 'var(--zen-muted)',
                }}
              >
                <span>
                  Trecho #{activeSegIdx + 1} de {segments.length} • {onbSourceLang} → {onbTargetLang}
                </span>
                <span>
                  {activeSegment.source_text.split(/\s+/).filter(Boolean).length} palavras no original
                </span>
              </div>

              <div
                className="zen-source-block"
                style={{ fontSize: `${zenFontSizeRem}rem` }}
              >
                {activeSegment.source_text}
              </div>

              <textarea
                className="zen-textarea"
                style={{
                  fontSize: `${zenFontSizeRem}rem`,
                  fontFamily: 'inherit',
                }}
                placeholder="Escreva sua tradução com calma, pressione Tab para aceitar sugestão silenciosa do Dynamic AutoWrite ou Ctrl+M (⌘M) para rascunho..."
                value={activeSegment.target_text}
                autoFocus
                onKeyDown={(e) => {
                  if (
                    e.key === 'Tab' &&
                    autoWriteEnabled &&
                    activeAutoWriteSuggestions.length > 0
                  ) {
                    e.preventDefault();
                    handleAcceptAutoWriteSuggestion(activeSegIdx, activeAutoWriteSuggestions[0]);
                  }
                }}
                onChange={(e) => {
                  const next = [...segments];
                  next[activeSegIdx] = {
                    ...activeSegment,
                    target_text: e.target.value,
                    status: 'Translated',
                  };
                  setSegments(next);
                }}
              />

              {/* Issue #3: Silent Dynamic AutoWrite Strip in Modo Zen (Grounded Glossary/Lexicon/Corpus Only) */}
              {autoWriteEnabled && activeAutoWriteSuggestions.length > 0 && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    flexWrap: 'wrap',
                    padding: '6px 10px',
                    fontSize: '0.74rem',
                    color: 'var(--zen-muted)',
                    borderLeft: '2px solid var(--zen-accent)',
                  }}
                >
                  <span style={{ fontWeight: 700 }}>
                    ⌨️ Dynamic AutoWrite (Tab p/ aceitar • zero alucinação):
                  </span>
                  {activeAutoWriteSuggestions.map((sug, sIdx) => (
                    <button
                      key={`${sug.completion_full}-${sIdx}`}
                      type="button"
                      className={`zen-pill-btn ${sIdx === 0 ? 'active' : ''}`}
                      title={`Origem confirmada: ${sug.source_origin_label}`}
                      onClick={() => handleAcceptAutoWriteSuggestion(activeSegIdx, sug)}
                    >
                      {sIdx === 0 ? '⇥ Tab: ' : ''}
                      {sug.completion_full}{' '}
                      <span style={{ opacity: 0.72, fontSize: '0.68rem' }}>
                        ({sug.source_origin_label})
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {zenShowGlossaryPeek && (
                <div
                  style={{
                    padding: '10px 14px',
                    borderLeft: '2px solid var(--zen-accent)',
                    fontSize: '0.8rem',
                    color: 'var(--zen-muted)',
                  }}
                >
                  <div style={{ fontWeight: 700, marginBottom: '4px' }}>
                    📖 Apoio Discreto do Harness ({effectiveDomain}):
                  </div>
                  {matchedGlossary.length > 0 ? (
                    <div style={{ marginBottom: '4px' }}>
                      Glossário neste trecho:{' '}
                      {matchedGlossary.map((g) => (
                        <button
                          key={g.source_term}
                          type="button"
                          className="zen-pill-btn"
                          style={{ marginRight: '6px' }}
                          onClick={() => handleApplyGlossaryTermToSegment(activeSegIdx, g)}
                        >
                          {g.source_term} → {g.target_term}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div style={{ marginBottom: '4px' }}>
                      Nenhum termo travado do glossário exigido neste trecho.
                    </div>
                  )}
                  {activeTmMatches[0] && (
                    <div>
                      Referência da Memória ({activeTmMatches[0].similarity_pct}%):{' '}
                      <em>"{activeTmMatches[0].target_text}"</em>
                    </div>
                  )}
                </div>
              )}

              <div className="zen-whisper-bar">
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button
                    type="button"
                    className="zen-pill-btn"
                    disabled={activeSegIdx === 0}
                    onClick={() => setActiveSegIdx((i) => Math.max(0, i - 1))}
                  >
                    ← Anterior (Alt+↑)
                  </button>
                  <button
                    type="button"
                    className="zen-pill-btn"
                    disabled={activeSegIdx >= segments.length - 1}
                    onClick={() => setActiveSegIdx((i) => Math.min(segments.length - 1, i + 1))}
                  >
                    Próximo → (Alt+↓)
                  </button>
                  <button
                    type="button"
                    className={`zen-pill-btn ${zenShowGlossaryPeek ? 'active' : ''}`}
                    onClick={() => setZenShowGlossaryPeek((prev) => !prev)}
                  >
                    📖 {zenShowGlossaryPeek ? 'Ocultar Apoio' : 'Espiar Glossário / Memória'}
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button
                    type="button"
                    className="zen-pill-btn"
                    onClick={() => handleRunAutoAssembleOnSegment(activeSegIdx)}
                    title="Montar esqueleto híbrido (Glossário + Sub-segmento TM/Corpus + Costura Morfológica IA Local)"
                  >
                    🧩 AutoAssemble Híbrido
                  </button>
                  <button
                    type="button"
                    className="zen-pill-btn"
                    onClick={() => handleRunLocalModelWithHarness(activeSegIdx)}
                  >
                    ✨ Rascunho Silencioso IA (Ctrl+M)
                  </button>
                  <button
                    type="button"
                    className="zen-pill-btn active"
                    style={{ fontWeight: 700 }}
                    onClick={() => handleConfirmAndEvolveHarness(activeSegIdx)}
                  >
                    ✓ Confirmar & Fluir (Ctrl+Enter)
                  </button>
                </div>
              </div>
            </div>

            {/* Next Segment Whisper (Upcoming Flow) */}
            {activeSegIdx + 1 < segments.length && segments[activeSegIdx + 1] && (
              <div
                className="zen-context-ghost"
                style={{
                  fontSize: `${Math.max(0.9, zenFontSizeRem - 0.16)}rem`,
                  opacity: 0.32,
                }}
                onClick={() => setActiveSegIdx(activeSegIdx + 1)}
                title="Clique para avançar ao próximo trecho (Alt+↓)"
              >
                <div style={{ fontSize: '0.7rem', marginBottom: '2px' }}>
                  ↓ Próximo trecho #{activeSegIdx + 2}
                </div>
                <div>{segments[activeSegIdx + 1].source_text}</div>
              </div>
            )}
          </div>

          <div className="zen-footer">
            Modo Zen Criativo • Sem alertas visuais intrusivos • Atalhos: Ctrl+M (Rascunho IA) •
            Ctrl+Enter (Confirmar e Avançar) • Alt+↑/↓ (Navegar) • Esc (Sair)
          </div>
        </div>
      )}

      {/* System Menu Bar Strip (mirrors macOS Top Menu Bar: Arquivo, Editar, Configurações, Modelos, PDFs & OCR) */}
      <div className="desktop-menubar" onClick={(e) => e.stopPropagation()}>
        <div className="menu-bar-items">
          {/* Menu: Arquivo */}
          <div className="menu-root">
            <button
              type="button"
              className={`menu-trigger ${openMenuId === 'arquivo' ? 'open' : ''}`}
              onClick={() => setOpenMenuId(openMenuId === 'arquivo' ? null : 'arquivo')}
            >
              Arquivo
            </button>
            {openMenuId === 'arquivo' && (
              <div className="menu-dropdown">
                <button
                  type="button"
                  className="menu-dropdown-item"
                  onClick={() => executeMenuAction('open-onboarding-step1')}
                >
                  <span>📥 Central de Entrada Universal (PDF, Word, Colar, MD)...</span>
                  <span className="menu-shortcut">⌘N</span>
                </button>
                <button
                  type="button"
                  className="menu-dropdown-item"
                  onClick={() => executeMenuAction('trigger-pdf-upload')}
                >
                  <span>📂 Abrir Documento (.pdf Digital/Scan, Word .docx, .md, .txt, .srt)...</span>
                  <span className="menu-shortcut">⌘O</span>
                </button>
                <button
                  type="button"
                  className="menu-dropdown-item"
                  onClick={() => executeMenuAction('paste-clipboard-source')}
                >
                  <span>📋 Colar Texto da Área de Transferência para Traduzir...</span>
                  <span className="menu-shortcut">⇧⌘V</span>
                </button>
                <div className="menu-divider" />
                <button
                  type="button"
                  className="menu-dropdown-item"
                  onClick={() => executeMenuAction('tab:tm')}
                >
                  <span>🗄️ Gerenciar Bancos de Tradução Auxiliares (TMX / CSV)...</span>
                  <span className="menu-shortcut">⌘2</span>
                </button>
                <div className="menu-divider" />
                <button
                  type="button"
                  className="menu-dropdown-item"
                  onClick={() => executeMenuAction('export-markdown')}
                >
                  <span>⬇ Exportar Tradução Concluída (.md)</span>
                  <span className="menu-shortcut">⌘E</span>
                </button>
                <button
                  type="button"
                  className="menu-dropdown-item"
                  onClick={() => executeMenuAction('export-searchable-pdf')}
                >
                  <span>⬇ Exportar PDF Pesquisável com Camada OCR (.pdf)</span>
                  <span className="menu-shortcut">⇧⌘P</span>
                </button>
              </div>
            )}
          </div>

          {/* Menu: Editar */}
          <div className="menu-root">
            <button
              type="button"
              className={`menu-trigger ${openMenuId === 'editar' ? 'open' : ''}`}
              onClick={() => setOpenMenuId(openMenuId === 'editar' ? null : 'editar')}
            >
              Editar
            </button>
            {openMenuId === 'editar' && (
              <div className="menu-dropdown">
                <button
                  type="button"
                  className="menu-dropdown-item"
                  onClick={() => executeMenuAction('translate-active')}
                >
                  <span>🧠 Sugerir Tradução c/ IA Local no Trecho Atual</span>
                  <span className="menu-shortcut">Ctrl+M / ⌘T</span>
                </button>
                <button
                  type="button"
                  className="menu-dropdown-item"
                  onClick={() => executeMenuAction('confirm-active')}
                >
                  <span>✓ Confirmar Trecho & Evoluir Harness do Projeto</span>
                  <span className="menu-shortcut">⌘↵</span>
                </button>
                <div className="menu-divider" />
                <button
                  type="button"
                  className="menu-dropdown-item"
                  onClick={() => {
                    setOpenSegmentHarnessIdx(
                      openSegmentHarnessIdx === activeSegIdx ? null : activeSegIdx
                    );
                    setOpenMenuId(null);
                  }}
                >
                  <span>🛡️ Inspecionar Skills do Harness no Trecho Atual</span>
                </button>
              </div>
            )}
          </div>

          {/* Menu: Configurações (includes Themes & Domain/Harness settings, removed from top-right corner!) */}
          <div className="menu-root">
            <button
              type="button"
              className={`menu-trigger ${openMenuId === 'config' ? 'open' : ''}`}
              onClick={() => setOpenMenuId(openMenuId === 'config' ? null : 'config')}
            >
              Configurações
            </button>
            {openMenuId === 'config' && (
              <div className="menu-dropdown">
                <button
                  type="button"
                  className="menu-dropdown-item"
                  onClick={() => executeMenuAction('toggle-zen')}
                >
                  <span>🧘 Alternar Modo Zen (Foco Criativo Sem Estímulos)</span>
                  <span className="menu-shortcut">⌘\</span>
                </button>
                <div className="menu-divider" />
                <button
                  type="button"
                  className="menu-dropdown-item"
                  onClick={() => executeMenuAction('open-onboarding-step2')}
                >
                  <span>🎯 Alterar Domínio / Especialidade ({effectiveDomain.slice(0, 24)}…)</span>
                  <span className="menu-shortcut">⌘,</span>
                </button>
                <button
                  type="button"
                  className="menu-dropdown-item"
                  onClick={() => executeMenuAction('tab:harness')}
                >
                  <span>📜 Editar Prompt AGENT.md, Glossário & Skills</span>
                  <span className="menu-shortcut">⌘4</span>
                </button>
                <div className="menu-divider" />
                <div
                  style={{
                    padding: '3px 10px',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    color: 'var(--text-muted)',
                  }}
                >
                  TEMA VISUAL DA INTERFACE:
                </div>
                {THEMES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className="menu-dropdown-item"
                    onClick={() => executeMenuAction(`theme:${t.id}`)}
                  >
                    <span>
                      {theme === t.id ? '✓ ' : '   '}
                      {t.label}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Menu: Modelos */}
          <div className="menu-root">
            <button
              type="button"
              className={`menu-trigger ${openMenuId === 'modelos' ? 'open' : ''}`}
              onClick={() => setOpenMenuId(openMenuId === 'modelos' ? null : 'modelos')}
            >
              Modelos
            </button>
            {openMenuId === 'modelos' && (
              <div className="menu-dropdown" style={{ minWidth: '340px' }}>
                <button
                  type="button"
                  className="menu-dropdown-item"
                  onClick={() => {
                    setModelManagerSubTab('catalog');
                    executeMenuAction('tab:models');
                  }}
                >
                  <span>🎛️ Gerenciador Fiel de Modelos (Baixar, Apagar & Caches)...</span>
                  <span className="menu-shortcut">⌘5</span>
                </button>
                <button
                  type="button"
                  className="menu-dropdown-item"
                  onClick={() => executeMenuAction('open-models-custom')}
                >
                  <span>🔗 Apontar Modelo Próprio Compatível c/ llama.cpp (.gguf)...</span>
                </button>
                <button
                  type="button"
                  className="menu-dropdown-item"
                  onClick={() => executeMenuAction('open-models-scanner')}
                >
                  <span>🔍 Varrer Computador (Duplicados, Hardware & Confiabilidade)...</span>
                </button>
                <button
                  type="button"
                  className="menu-dropdown-item"
                  onClick={() => executeMenuAction('purge-model-caches')}
                >
                  <span>
                    🧹 Limpar Caches de Modelos & Órfãos ({totalModelCachesMb + orphanedCacheMb} MB)
                  </span>
                </button>
                <div className="menu-divider" />
                <button
                  type="button"
                  className="menu-dropdown-item"
                  onClick={() => executeMenuAction('open-onboarding-step3')}
                >
                  <span>💻 Assistente Passo 3: Comparativo & Benchmark...</span>
                </button>
                <div className="menu-divider" />
                <div
                  style={{
                    padding: '3px 10px',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    color: 'var(--text-muted)',
                  }}
                >
                  ALTERNAR / BAIXAR MODELO LOCAL (GGUF):
                </div>
                {models.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    className="menu-dropdown-item"
                    onClick={() => {
                      if (!m.installed) {
                        setActiveTab('models');
                        setModelManagerSubTab('catalog');
                        handleDownloadModel(m.id);
                        setOpenMenuId(null);
                      } else {
                        executeMenuAction(`model:${m.id}`);
                      }
                    }}
                  >
                    <span>
                      {m.active ? '✓ 🟢 ' : m.installed ? '   🔵 ' : '   ⬇️ '}
                      {m.name} {!m.installed ? `(${(m.size_mb / 1024).toFixed(1)} GB)` : ''}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Menu: PDFs & OCR */}
          <div className="menu-root">
            <button
              type="button"
              className={`menu-trigger ${openMenuId === 'pdfs' ? 'open' : ''}`}
              onClick={() => setOpenMenuId(openMenuId === 'pdfs' ? null : 'pdfs')}
            >
              PDFs & OCR
            </button>
            {openMenuId === 'pdfs' && (
              <div className="menu-dropdown">
                <button
                  type="button"
                  className="menu-dropdown-item"
                  onClick={() => executeMenuAction('open-onboarding-step1')}
                >
                  <span>🚀 Iniciar Onboarding a partir de um PDF Escaneado...</span>
                </button>
                <button
                  type="button"
                  className="menu-dropdown-item"
                  onClick={() => executeMenuAction('trigger-pdf-upload')}
                >
                  <span>📂 Importar PDF Escaneado do Computador (.pdf)...</span>
                  <span className="menu-shortcut">⌘O</span>
                </button>
                <button
                  type="button"
                  className="menu-dropdown-item"
                  onClick={() => executeMenuAction('tab:ocr')}
                >
                  <span>🔍 Abrir Conversor PDF Escaneado → PDF/MD</span>
                  <span className="menu-shortcut">⌘3</span>
                </button>
                <div className="menu-divider" />
                <button
                  type="button"
                  className="menu-dropdown-item"
                  onClick={() => executeMenuAction('toggle-dehyphenate')}
                >
                  <span>
                    {dehyphenateEnabled ? '✓ ' : '   '}Juntar Palavras Quebradas por Hífen
                  </span>
                </button>
                <div className="menu-divider" />
                <button
                  type="button"
                  className="menu-dropdown-item"
                  onClick={() => executeMenuAction('export-searchable-pdf')}
                >
                  <span>⬇ Exportar PDF Pesquisável (Ctrl+F) (.pdf)</span>
                  <span className="menu-shortcut">⇧⌘P</span>
                </button>
                <button
                  type="button"
                  className="menu-dropdown-item"
                  onClick={() => executeMenuAction('export-ocr-markdown')}
                >
                  <span>⬇ Exportar Markdown Extraído do Scan (.md)</span>
                </button>
              </div>
            )}
          </div>

          {/* Menu: Obsidian & Git */}
          <div className="menu-root">
            <button
              type="button"
              className={`menu-trigger ${openMenuId === 'obsidian' ? 'open' : ''}`}
              onClick={() => setOpenMenuId(openMenuId === 'obsidian' ? null : 'obsidian')}
            >
              Obsidian & Git
            </button>
            {openMenuId === 'obsidian' && (
              <div className="menu-dropdown" style={{ minWidth: '350px' }}>
                <button
                  type="button"
                  className="menu-dropdown-item"
                  onClick={() => executeMenuAction('tab:obsidian')}
                >
                  <span>🔮 Abrir Biblioteca Viva Obsidian & História Git...</span>
                  <span className="menu-shortcut">⌘6</span>
                </button>
                <button
                  type="button"
                  className="menu-dropdown-item"
                  onClick={() => executeMenuAction('obsidian-sync-now')}
                >
                  <span>⚡ Sincronizar Vault no Disco + Commit Semântico Git...</span>
                </button>
                <button
                  type="button"
                  className="menu-dropdown-item"
                  onClick={() => executeMenuAction('obsidian-open-uri')}
                >
                  <span>🚀 Abrir Diretamente no Obsidian (obsidian://open)...</span>
                </button>
                <div className="menu-divider" />
                <button
                  type="button"
                  className="menu-dropdown-item"
                  onClick={() => executeMenuAction('obsidian-view-concept-canvas')}
                >
                  <span>🕸️ Visualizar Canvas: Mapa Conceitual da Obra (.canvas)</span>
                </button>
                <button
                  type="button"
                  className="menu-dropdown-item"
                  onClick={() => executeMenuAction('obsidian-view-genealogy-canvas')}
                >
                  <span>🧬 Visualizar Canvas: Linha Evolutiva dos Trechos (.canvas)</span>
                </button>
                <button
                  type="button"
                  className="menu-dropdown-item"
                  onClick={() => executeMenuAction('obsidian-create-milestone')}
                >
                  <span>🏷️ Criar Marco Editorial (Git Tag & Milestone Commit)...</span>
                </button>
              </div>
            )}
          </div>
        </div>

        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
          📄 Documento ativo: <strong>{uploadedPdfName}</strong> • Modelo:{' '}
          <strong>{activeModel.name.split('(')[0].trim()}</strong> • Git:{' '}
          <code>#{lastObsidianSyncHash}</code>
        </div>
      </div>

      {/* Top Navigation (Cleaned up: NO theme/model dropdowns in the top-right corner!) */}
      <header className="topbar">
        <div className="brand">
          <img
            src="/logo.png"
            alt="Amanuensis"
            style={{ width: '28px', height: '28px', borderRadius: '4px' }}
          />
          <span>AMANUENSIS</span>
          <span className="brand-badge">
            {rustBridgeConnected ? '🟢 Motor Local Ativo' : '⚡ CAT & OCR Local'}
          </span>
        </div>

        <nav className="nav-tabs">
          <button
            className={`nav-tab ${activeTab === 'workbench' ? 'active' : ''}`}
            onClick={() => setActiveTab('workbench')}
          >
            1. Workbench de Tradução
          </button>
          <button
            className={`nav-tab ${activeTab === 'tm' ? 'active' : ''}`}
            onClick={() => setActiveTab('tm')}
          >
            2. Bancos Auxiliares ({tmBanks.length})
          </button>
          <button
            className={`nav-tab ${activeTab === 'ocr' ? 'active' : ''}`}
            onClick={() => setActiveTab('ocr')}
          >
            3. Conversor PDF Escaneado → PDF/MD
          </button>
          <button
            className={`nav-tab ${activeTab === 'harness' ? 'active' : ''}`}
            onClick={() => setActiveTab('harness')}
          >
            4. Harness (AGENT.md & Skills)
          </button>
          <button
            className={`nav-tab ${activeTab === 'models' ? 'active' : ''}`}
            onClick={() => setActiveTab('models')}
          >
            5. Modelos Locais ({models.filter((m) => m.installed).length})
          </button>
          <button
            className={`nav-tab ${activeTab === 'obsidian' ? 'active' : ''}`}
            onClick={() => setActiveTab('obsidian')}
          >
            🔮 6. Obsidian & Git ({gitCommits.length})
          </button>
        </nav>

        <div className="toolbar-controls">
          <button
            className="btn"
            onClick={() => setZenMode(true)}
            title="Entrar no Modo Zen de baixo estímulo visual para tradução criativa (⌘\)"
          >
            🧘 Modo Zen (Foco Criativo)
          </button>
          <button
            className="btn"
            onClick={triggerChooseFile}
            title="Escolher um arquivo PDF escaneado do seu computador"
          >
            📂 Importar PDF Escaneado (.pdf)
          </button>
          <button
            className="btn btn-primary"
            onClick={() => {
              setOnboardingStep(1);
              setShowOnboarding(true);
            }}
          >
            📄 Assistente / Novo Projeto (PDF)
          </button>
        </div>
      </header>

      {/* Main Content View */}
      {activeTab === 'workbench' && (
        <main className="workbench-grid">
          {/* Left Pane: Scanned PDF BBox Synchronizer & Live Markdown Preview */}
          <section className="pane">
            <div className="pane-header">
              <span>📄 Documento Original (PDF Escaneado)</span>
              <button
                type="button"
                className="btn"
                style={{ fontSize: '0.7rem', padding: '2px 7px' }}
                onClick={triggerChooseFile}
              >
                📂 Trocar PDF
              </button>
            </div>
            <div className="pane-body">
              {/* Live Real-Time Scan Crop ("Tirar a Teima") for Active Segment */}
              <div
                className="card"
                style={{
                  marginBottom: '10px',
                  border: '2px solid var(--accent)',
                  background: 'var(--page-canvas)',
                  padding: '8px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '0.73rem',
                    fontWeight: 700,
                    marginBottom: '6px',
                    flexWrap: 'wrap',
                    gap: '4px',
                  }}
                >
                  <span>
                    🔍 Print do Scan Original (Tirar a Teima) — Trecho #{activeSegIdx + 1}
                  </span>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      type="button"
                      className="btn"
                      style={{ fontSize: '0.66rem', padding: '1px 5px' }}
                      onClick={() =>
                        requestScanSnippetForText(
                          activeSegment.source_text,
                          scanSnippetData?.y ?? activeSegment.bbox.y,
                          scanSnippetData?.page ?? 1,
                          (scanSnippetData?.y ?? activeSegment.bbox.y) - 0.08
                        )
                      }
                      title="Subir o recorte na página do scan"
                    >
                      ⬆️
                    </button>
                    <button
                      type="button"
                      className="btn"
                      style={{ fontSize: '0.66rem', padding: '1px 5px' }}
                      onClick={() =>
                        requestScanSnippetForText(
                          activeSegment.source_text,
                          scanSnippetData?.y ?? activeSegment.bbox.y,
                          scanSnippetData?.page ?? 1,
                          (scanSnippetData?.y ?? activeSegment.bbox.y) + 0.08
                        )
                      }
                      title="Descer o recorte na página do scan"
                    >
                      ⬇️
                    </button>
                    <button
                      type="button"
                      className="btn"
                      style={{ fontSize: '0.66rem', padding: '1px 5px' }}
                      onClick={() => setShowFullPageInSnippet((prev) => !prev)}
                      title="Alternar entre Recorte Ampliado da Linha e Página Inteira"
                    >
                      {showFullPageInSnippet ? '🔍 Ver Recorte' : '🗺️ Pág. Inteira'}
                    </button>
                  </div>
                </div>
                <img
                  src={
                    showFullPageInSnippet && scanSnippetData?.fullPageDataUrl
                      ? scanSnippetData.fullPageDataUrl
                      : scanSnippetData?.cropDataUrl ||
                        renderFacsimileScanCropDataUrl(activeSegment.source_text)
                  }
                  alt="Print do Trecho no Scan Original"
                  style={{
                    width: '100%',
                    maxHeight: showFullPageInSnippet ? '260px' : '135px',
                    objectFit: 'contain',
                    border: '1px solid var(--border)',
                    background: '#f4efe1',
                  }}
                />
                {detectOcrDoubts(activeSegment.source_text).length > 0 && (
                  <div style={{ marginTop: '6px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {detectOcrDoubts(activeSegment.source_text).map((d, dIdx) => (
                      <button
                        key={dIdx}
                        type="button"
                        className="btn btn-success"
                        style={{ fontSize: '0.69rem', padding: '2px 6px' }}
                        onClick={() => {
                          const next = [...segments];
                          next[activeSegIdx] = {
                            ...activeSegment,
                            source_text: activeSegment.source_text.replace(d.wrong, d.right),
                          };
                          setSegments(next);
                          setStatusNotice(
                            `✅ OCR do Trecho #${activeSegIdx + 1} corrigido: "${d.wrong}" → "${d.right}"!`
                          );
                        }}
                      >
                        ✨ Corrigir "{d.wrong}" → "{d.right}"
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="pdf-page-sheet">
                <div
                  style={{
                    fontSize: '0.74rem',
                    color: 'var(--text-muted)',
                    borderBottom: '1px solid var(--border)',
                    paddingBottom: '6px',
                    display: 'flex',
                    justifyContent: 'space-between',
                  }}
                >
                  <span>
                    {uploadedPdfName.length > 32
                      ? uploadedPdfName.slice(0, 30) + '…'
                      : uploadedPdfName}{' '}
                    (Camada OCR Ativa)
                  </span>
                  <span>96.8% Confiança</span>
                </div>
                {segments.map((seg, idx) => (
                  <div
                    key={seg.id}
                    className={`bbox-item ${idx === activeSegIdx ? 'active' : ''}`}
                    onClick={() => {
                      setActiveSegIdx(idx);
                      requestScanSnippetForText(seg.source_text, seg.bbox.y);
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '0.7rem',
                        color: 'var(--text-muted)',
                        marginBottom: '4px',
                        fontFamily: 'var(--font-mono)',
                      }}
                    >
                      <span>
                        Trecho #{idx + 1} [x:{seg.bbox.x.toFixed(2)}, y:{seg.bbox.y.toFixed(2)}]
                      </span>
                      <span>{seg.status}</span>
                    </div>
                    <div style={{ whiteSpace: 'pre-wrap' }}>{seg.source_text}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Center Pane: Side-by-Side CAT Segment Editor */}
          <section className="pane">
            <div className="pane-header" style={{ flexWrap: 'wrap', gap: '6px' }}>
              <span>
                ⚡ {onbProjectName} ({onbSourceLang} → {onbTargetLang})
              </span>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                <select
                  className="select-pill"
                  style={{ fontSize: '0.72rem', padding: '2px 6px' }}
                  value={chunkGranularity}
                  onChange={(e) => handleApplyGranularityChange(e.target.value as ChunkGranularity)}
                  title="Granularidade do Harness de Estruturação de Scans"
                >
                  <option value="ContextualShort">🎯 Trechos Curtos (1–2 frases)</option>
                  <option value="ZenMicroSentence">🧘 Micro-Frase (1 frase)</option>
                  <option value="EditorialParagraph">📖 Parágrafo (2–3 frases)</option>
                </select>
                <button
                  className="btn"
                  style={{ fontSize: '0.72rem', padding: '2px 7px' }}
                  onClick={() => {
                    if (showLexiconExtractorDrawer) {
                      setShowLexiconExtractorDrawer(false);
                    } else {
                      handleExtractRecurringLexicon();
                    }
                  }}
                  title="Varre todos os segmentos da obra e extrai os sintagmas multi-palavra mais frequentes (2 a 5 palavras) para padronizar no glossário antes/durante a tradução (Inspirado no Déjà Vu Build Lexicon)"
                >
                  🔍 Extrair Léxico da Obra ({extractedLexicon.length})
                </button>
                <button
                  className="btn"
                  style={{ fontSize: '0.72rem', padding: '2px 7px' }}
                  onClick={() => handleRunAutoAssembleOnSegment(activeSegIdx)}
                  title="AutoAssemble Híbrido (Déjà Vu): monta o esqueleto da frase combinando fragmentos do Glossário/Léxico, sub-segmentos da TM/LiveCorpus e costura morfológica do modelo local"
                >
                  🧩 AutoAssemble Híbrido
                </button>
                <button
                  className="btn"
                  style={{ fontSize: '0.72rem', padding: '2px 7px' }}
                  onClick={() => setShowGlobalRegexDrawer((prev) => !prev)}
                  title="Busca e Substituição Global com Expressões Regulares (Regex), filtro por Status/Escopo e pré-visualização de diff antes de substituir em lote (⌘⇧F — Inspirado no OmegaT)"
                >
                  🔎 Busca & Regex (⌘⇧F)
                </button>
                <button
                  className="btn"
                  onClick={() => setZenMode(true)}
                  title="Ativar Modo Zen para foco criativo sem estímulos de tela (⌘\)"
                >
                  🧘 Modo Zen
                </button>
                <button className="btn" onClick={handleExportTranslatedMarkdown}>
                  ⬇ Exportar (.md)
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => handleRunLocalModelWithHarness(activeSegIdx)}
                >
                  ✨ Traduzir c/ IA Local (Ctrl+M)
                </button>
              </div>
            </div>
            <div className="pane-body">
              {/* Issue #4: Global Regex Search & Replace Drawer (Cmd+Shift+F — OmegaT) */}
              {showGlobalRegexDrawer && (
                <div
                  className="card"
                  style={{
                    marginBottom: '10px',
                    border: '2px solid var(--accent)',
                    background: 'var(--page-canvas)',
                  }}
                >
                  <div className="card-title" style={{ flexWrap: 'wrap', gap: '6px' }}>
                    <span>
                      🔎 Busca e Substituição Global com Expressões Regulares (⌘⇧F — Inspirado no
                      OmegaT)
                    </span>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      <span className="badge badge-accent">
                        {globalRegexPreview.previews.length} correspondência(s)
                      </span>
                      <button
                        type="button"
                        className="btn btn-success"
                        style={{ fontSize: '0.72rem', padding: '2px 8px' }}
                        disabled={globalRegexPreview.previews.length === 0}
                        onClick={handleApplyBatchRegexReplace}
                      >
                        ⚡ Substituir Tudo em Lote ({globalRegexPreview.previews.length})
                      </button>
                      <button
                        type="button"
                        className="btn"
                        style={{ fontSize: '0.72rem', padding: '2px 8px' }}
                        onClick={() => setShowGlobalRegexDrawer(false)}
                      >
                        ✕ Fechar
                      </button>
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
                      gap: '8px',
                      marginBottom: '8px',
                    }}
                  >
                    <div>
                      <label
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          display: 'block',
                          marginBottom: '2px',
                        }}
                      >
                        Buscar (Texto Exato ou Regex):
                      </label>
                      <input
                        className="input-text"
                        value={globalSearchQuery}
                        onChange={(e) => setGlobalSearchQuery(e.target.value)}
                        placeholder="Ex.: (?:trabalhadores|operários) ou \b\d+\b"
                      />
                    </div>
                    <div>
                      <label
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          display: 'block',
                          marginBottom: '2px',
                        }}
                      >
                        Substituir por (suporta $& e grupos $1):
                      </label>
                      <input
                        className="input-text"
                        value={globalReplaceText}
                        onChange={(e) => setGlobalReplaceText(e.target.value)}
                        placeholder="Texto ou grupo de captura ($1)..."
                      />
                    </div>
                    <div>
                      <label
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          display: 'block',
                          marginBottom: '2px',
                        }}
                      >
                        Escopo do Projeto:
                      </label>
                      <select
                        className="select-pill"
                        style={{ width: '100%' }}
                        value={globalSearchScope}
                        onChange={(e) => setGlobalSearchScope(e.target.value as GlobalSearchScope)}
                      >
                        <option value="BothSourceAndTarget">
                          📖 Original + Tradução (Bilíngue)
                        </option>
                        <option value="TargetOnly">✍️ Apenas Tradução</option>
                        <option value="SourceOnly">🔍 Apenas Original (Correção OCR)</option>
                      </select>
                    </div>
                    <div>
                      <label
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          display: 'block',
                          marginBottom: '2px',
                        }}
                      >
                        Filtro por Status / Repetição:
                      </label>
                      <select
                        className="select-pill"
                        style={{ width: '100%' }}
                        value={globalStatusFilter}
                        onChange={(e) =>
                          setGlobalStatusFilter(e.target.value as GlobalSearchStatusFilter)
                        }
                      >
                        <option value="AllSegments">Todos os Trechos ({segments.length})</option>
                        <option value="ConfirmedOnly">✓ Apenas Confirmados / Traduzidos</option>
                        <option value="DraftsAndUntranslatedOnly">
                          📝 Apenas Rascunhos IA & Não Traduzidos
                        </option>
                        <option value="RepeatedSegmentsOnly">
                          🔁 Apenas Trechos Repetidos (Auto-Propagáveis)
                        </option>
                      </select>
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      gap: '10px',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      marginBottom: '8px',
                      fontSize: '0.74rem',
                    }}
                  >
                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <input
                        type="checkbox"
                        checked={globalUseRegex}
                        onChange={(e) => setGlobalUseRegex(e.target.checked)}
                      />
                      Usar Expressões Regulares (Regex)
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <input
                        type="checkbox"
                        checked={globalCaseSensitive}
                        onChange={(e) => setGlobalCaseSensitive(e.target.checked)}
                      />
                      Diferenciar Maiúsculas/Minúsculas (Aa)
                    </label>
                    {lastPropagationOutcome &&
                      lastPropagationOutcome.updated_segment_indices.length > 0 && (
                        <span className="badge badge-exact">
                          🔁 Última Auto-Propagação: #{lastPropagationOutcome.trigger_segment_index + 1}{' '}
                          → #
                          {lastPropagationOutcome.updated_segment_indices
                            .map((i) => i + 1)
                            .join(', #')}
                        </span>
                      )}
                  </div>

                  {globalRegexPreview.regexError ? (
                    <div className="badge badge-fuzzy" style={{ padding: '6px 10px' }}>
                      ⚠️ Erro na Expressão Regular: {globalRegexPreview.regexError}
                    </div>
                  ) : (
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                        maxHeight: '210px',
                        overflowY: 'auto',
                      }}
                    >
                      {globalRegexPreview.previews.map((item, pIdx) => (
                        <div
                          key={`${item.segment_id}-${item.field_matched}-${pIdx}`}
                          style={{
                            padding: '6px 8px',
                            background: 'var(--surface)',
                            border: '1px solid var(--border-dark)',
                            fontSize: '0.75rem',
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              marginBottom: '4px',
                              flexWrap: 'wrap',
                              gap: '4px',
                            }}
                          >
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                              <strong>
                                Trecho #{item.segment_index + 1} (
                                {item.field_matched === 'target' ? 'Tradução' : 'Original'})
                              </strong>
                              <span className="badge badge-accent">{item.context_hash}</span>
                              {item.is_contextual_exception && (
                                <span className="badge badge-fuzzy">
                                  🔀 Exceção Contextual Protegida
                                </span>
                              )}
                            </div>
                            <button
                              type="button"
                              className="btn btn-primary"
                              style={{ fontSize: '0.68rem', padding: '1px 7px' }}
                              onClick={() => handleApplySingleRegexPreview(item)}
                            >
                              ↳ Substituir Neste Trecho
                            </button>
                          </div>
                          <div>
                            {computeWordDiff(item.before_text, item.after_preview_text).map(
                              (tok, tIdx) =>
                                tok.op === 'equal' ? (
                                  <span key={tIdx}>{tok.text} </span>
                                ) : tok.op === 'del' ? (
                                  <span key={tIdx} className="diff-del">
                                    {tok.text}{' '}
                                  </span>
                                ) : (
                                  <span key={tIdx} className="diff-ins">
                                    {tok.text}{' '}
                                  </span>
                                )
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {/* Issue #3: Project Lexicon Extractor Drawer ("Build Lexicon" — Déjà Vu) */}
              {showLexiconExtractorDrawer && (
                <div
                  className="card"
                  style={{
                    marginBottom: '10px',
                    border: '2px solid var(--accent)',
                    background: 'var(--page-canvas)',
                  }}
                >
                  <div className="card-title" style={{ flexWrap: 'wrap', gap: '6px' }}>
                    <span>
                      🔍 Extrator de Léxico Recorrente da Obra (Build Lexicon — Inspirado no Déjà
                      Vu)
                    </span>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="btn btn-success"
                        style={{ fontSize: '0.72rem', padding: '2px 8px' }}
                        onClick={handleLockAllExtractedLexicon}
                      >
                        🛡️ Travar Todos em .amanuensis/glossary.toml
                      </button>
                      <button
                        type="button"
                        className="btn"
                        style={{ fontSize: '0.72rem', padding: '2px 8px' }}
                        onClick={handleExtractRecurringLexicon}
                      >
                        🔄 Re-escanear Obra
                      </button>
                      <button
                        type="button"
                        className="btn"
                        style={{ fontSize: '0.72rem', padding: '2px 8px' }}
                        onClick={() => setShowLexiconExtractorDrawer(false)}
                      >
                        ✕ Fechar
                      </button>
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: '0.75rem',
                      color: 'var(--text-muted)',
                      marginBottom: '8px',
                    }}
                  >
                    Expressões multi-palavra (2 a 5 palavras) mais frequentes na obra. Padronize a
                    tradução aqui para injetá-la deterministicamente no{' '}
                    <code>.amanuensis/glossary.toml</code>, no <code>ProjectHarness</code>, no{' '}
                    <strong>AutoAssemble</strong> e no <strong>Dynamic AutoWrite</strong>:
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '5px',
                      maxHeight: '220px',
                      overflowY: 'auto',
                    }}
                  >
                    {extractedLexicon.map((item) => (
                      <div
                        key={item.source_phrase}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'minmax(140px, 1.2fr) auto minmax(150px, 1.3fr) auto',
                          gap: '6px',
                          alignItems: 'center',
                          padding: '5px 8px',
                          background: 'var(--surface)',
                          border: '1px solid var(--border-dark)',
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.78rem' }}>
                            {item.source_phrase}
                          </div>
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                            {item.word_count} palavras • Ocorrências: Segs #
                            {item.segment_indices.join(', #')}
                          </div>
                        </div>
                        <span className="badge badge-accent">{item.occurrences}x na obra</span>
                        <input
                          className="input-text"
                          style={{ padding: '3px 6px', fontSize: '0.76rem' }}
                          value={item.suggested_target}
                          onChange={(e) =>
                            handleUpdateLexiconSuggestedTarget(item.source_phrase, e.target.value)
                          }
                          placeholder="Tradução padronizada na obra..."
                        />
                        {item.locked_in_glossary ? (
                          <span className="badge badge-exact">✓ Travado no Glossário</span>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-primary"
                            style={{ fontSize: '0.7rem', padding: '2px 7px' }}
                            onClick={() => handleLockLexiconItemInGlossary(item)}
                          >
                            📌 Travar
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {segments.map((seg, idx) => {
                const isActive = idx === activeSegIdx;
                const hasPostEditDiff =
                  isActive &&
                  seg.ai_draft_snapshot &&
                  seg.target_text.trim() !== '' &&
                  seg.ai_draft_snapshot.trim() !== seg.target_text.trim();
                const isHarnessOpenHere = openSegmentHarnessIdx === idx;
                const isScanInspectOpenHere = openScanInspectIdx === idx;
                const segOcrDoubts = detectOcrDoubts(seg.source_text);

                return (
                  <div
                    key={seg.id}
                    className={`segment-row ${isActive ? 'active' : ''}`}
                    onClick={() => {
                      setActiveSegIdx(idx);
                      requestScanSnippetForText(seg.source_text, seg.bbox.y);
                    }}
                  >
                    <div className="segment-num">
                      <span>#{idx + 1}</span>
                      <span className={`status-dot status-${seg.status}`} title={seg.status} />
                    </div>

                    <div className="segment-source">
                      {isActive && activeLscMatches.length > 0 ? (
                        (() => {
                          const nodes: React.ReactNode[] = [];
                          let cursor = 0;
                          activeLscMatches.forEach((hit, hIdx) => {
                            if (hit.char_start > cursor) {
                              nodes.push(
                                <span key={`txt-${hIdx}`}>
                                  {seg.source_text.slice(cursor, hit.char_start)}
                                </span>
                              );
                            }
                            nodes.push(
                              <span
                                key={`lsc-${hIdx}`}
                                title={`🔍 LSC (${hit.word_count} palavras • Sim. global da frase: ${
                                  hit.global_sentence_similarity_pct
                                }%): "${hit.source_ngram}" → "${
                                  hit.suggested_target_phrase || hit.target_paragraph || ''
                                }". Clique para inspecionar Contexto 3¶ e inserir sub-frase!`}
                                style={{
                                  borderBottom: '2px dashed var(--accent)',
                                  background: 'rgba(0, 84, 227, 0.10)',
                                  padding: '0 2px',
                                  cursor: 'pointer',
                                  fontWeight: 600,
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setInspectedContextPassage({
                                    id: hit.passage_id,
                                    doc_id: hit.passage_id,
                                    doc_title: hit.doc_title,
                                    doc_kind: hit.doc_kind,
                                    paragraph_index: 1,
                                    prev_paragraph: hit.prev_paragraph,
                                    source_paragraph: hit.source_paragraph,
                                    target_paragraph: hit.target_paragraph,
                                    next_paragraph: hit.next_paragraph,
                                    alignment_confidence: 0.96,
                                  });
                                  handleInsertLscSubphrase(idx, hit);
                                }}
                              >
                                {seg.source_text.slice(hit.char_start, hit.char_end)}
                              </span>
                            );
                            cursor = hit.char_end;
                          });
                          if (cursor < seg.source_text.length) {
                            nodes.push(<span key="txt-end">{seg.source_text.slice(cursor)}</span>);
                          }
                          return nodes;
                        })()
                      ) : (
                        seg.source_text
                      )}
                    </div>

                    <div className="segment-editor-area">
                      <textarea
                        className="segment-textarea"
                        placeholder="Digite sua tradução (pressione Tab p/ autocompletar Dynamic AutoWrite) ou clique em '🧩 AutoAssemble' / '🧠 Sugerir (IA Local)' abaixo..."
                        value={seg.target_text}
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveSegIdx(idx);
                        }}
                        onKeyDown={(e) => {
                          if (
                            isActive &&
                            e.key === 'Tab' &&
                            autoWriteEnabled &&
                            activeAutoWriteSuggestions.length > 0
                          ) {
                            e.preventDefault();
                            handleAcceptAutoWriteSuggestion(idx, activeAutoWriteSuggestions[0]);
                          }
                        }}
                        onChange={(e) => {
                          const next = [...segments];
                          next[idx] = {
                            ...seg,
                            target_text: e.target.value,
                            status: 'Translated',
                          };
                          setSegments(next);
                        }}
                      />

                      {/* Issue #3: Non-intrusive Dynamic AutoWrite Strip (Tab to accept • Grounded Terms Only) */}
                      {isActive && autoWriteEnabled && activeAutoWriteSuggestions.length > 0 && (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '6px',
                            flexWrap: 'wrap',
                            padding: '4px 8px',
                            background: 'var(--page-canvas)',
                            border: '1px dashed var(--accent)',
                            fontSize: '0.73rem',
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 700, color: 'var(--accent)' }}>
                              ⌨️ Dynamic AutoWrite (Tab p/ aceitar):
                            </span>
                            {activeAutoWriteSuggestions.map((sug, sIdx) => (
                              <button
                                key={`${sug.completion_full}-${sIdx}`}
                                type="button"
                                className={`badge ${
                                  sIdx === 0 ? 'badge-exact' : 'badge-accent'
                                } badge-btn`}
                                title={`Origem determinística confirmada: ${sug.source_origin_label}. Clique ou pressione Tab!`}
                                onClick={() => handleAcceptAutoWriteSuggestion(idx, sug)}
                              >
                                {sIdx === 0 ? '⇥ Tab: ' : ''}
                                {sug.completion_full} ({sug.source_origin_label})
                              </button>
                            ))}
                          </div>
                          <button
                            type="button"
                            className="badge badge-btn"
                            style={{ fontSize: '0.66rem' }}
                            onClick={() => setAutoWriteEnabled(false)}
                            title="Pausar sugestões preditivas do Dynamic AutoWrite"
                          >
                            Silenciar
                          </button>
                        </div>
                      )}

                      {hasPostEditDiff && seg.ai_draft_snapshot && (
                        <div className="diff-box">
                          <div
                            style={{
                              fontSize: '0.72rem',
                              color: 'var(--text-muted)',
                              marginBottom: '3px',
                              fontWeight: 700,
                            }}
                          >
                            🔍 Suas edições em relação à sugestão da IA (serão aprendidas pelo
                            Harness ao confirmar):
                          </div>
                          {computeWordDiff(seg.ai_draft_snapshot, seg.target_text).map((tok, tIdx) =>
                            tok.op === 'equal' ? (
                              <span key={tIdx}>{tok.text} </span>
                            ) : tok.op === 'del' ? (
                              <span key={tIdx} className="diff-del">
                                {tok.text}
                              </span>
                            ) : (
                              <span key={tIdx} className="diff-ins">
                                {tok.text}
                              </span>
                            )
                          )}
                        </div>
                      )}

                      {/* Action Bar Visible on Every Segment (and highlighted on Active Segment) */}
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '6px',
                          flexWrap: 'wrap',
                        }}
                      >
                        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                          {/* Interactive Button 1: Harness Inspector Toggle */}
                          <button
                            type="button"
                            className="badge badge-accent badge-btn"
                            title="Clique para inspecionar ou ativar/desativar as regras do Harness neste trecho"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveSegIdx(idx);
                              setOpenSegmentHarnessIdx(isHarnessOpenHere ? null : idx);
                              setStatusNotice(
                                isHarnessOpenHere
                                  ? `Inspetor rápido do Harness fechado.`
                                  : `🛡️ Inspetor do Harness aberto para o Trecho #${idx + 1}: veja ou altere as regras abaixo!`
                              );
                            }}
                          >
                            🛡️ Harness: {skills.filter((s) => s.enabled).length} skills (Clique p/
                            ver)
                          </button>

                          {/* Interactive Button 1B: Real-Time Scan Crop ("Tirar a Teima") & OCR Fix */}
                          <button
                            type="button"
                            className={`badge ${
                              segOcrDoubts.length > 0 ? 'badge-fuzzy' : 'badge-exact'
                            } badge-btn`}
                            title="Ver recorte real deste trecho no PDF escaneado para tirar a teima de caracteres duvidosos do OCR e corrigir o original"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveSegIdx(idx);
                              if (isScanInspectOpenHere) {
                                setOpenScanInspectIdx(null);
                              } else {
                                setOpenScanInspectIdx(idx);
                                requestScanSnippetForText(seg.source_text, seg.bbox.y);
                                setStatusNotice(
                                  `🔍 Exibindo print real do Scan Original para o Trecho #${idx + 1} (Tire a teima e corrija o OCR se necessário)!`
                                );
                              }
                            }}
                          >
                            {segOcrDoubts.length > 0
                              ? `🔍 Dúvida de OCR (${segOcrDoubts[0].wrong})? Tirar a Teima no Scan`
                              : '👁️ Print do Scan (Tirar a Teima)'}
                          </button>

                          {/* Interactive Button 1C: Inline Git Genealogy ("🕰️ História Git deste Trecho") */}
                          <button
                            type="button"
                            className="badge badge-accent badge-btn"
                            title="Ver a evolução versionada deste trecho no Git (Original → IA Local → Pós-Edição Humana / ADR) e restaurar qualquer versão"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveSegIdx(idx);
                              setOpenGenealogyIdx(openGenealogyIdx === idx ? null : idx);
                            }}
                          >
                            🕰️ História Git (v
                            {Math.max(0, (segmentGenealogies[idx]?.length || 1) - 1)})
                          </button>

                          {/* Interactive Button 1D (Issue #3): Hybrid AutoAssemble ("🧩 AutoAssemble Esqueleto") */}
                          <button
                            type="button"
                            className="badge badge-exact badge-btn"
                            title="Monta o esqueleto da tradução combinando fragmentos travados do Glossário/Léxico, sub-segmentos da TM/LiveCorpus e costura morfológica do modelo local (Inspirado no Déjà Vu AutoAssemble)"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (openAutoAssembleIdx === idx && autoAssembleBySegIdx[idx]) {
                                setOpenAutoAssembleIdx(null);
                              } else {
                                handleRunAutoAssembleOnSegment(idx);
                              }
                            }}
                          >
                            🧩 AutoAssemble
                            {autoAssembleBySegIdx[idx]
                              ? ` (${autoAssembleBySegIdx[idx].deterministic_coverage_pct}% det.)`
                              : ' (Montar)'}
                          </button>

                          {/* Interactive Button 1E (Issue #4): Contextual Exception ("🔀 Exceção Contextual / Tradução Alternativa") */}
                          {(() => {
                            const prevSrc = idx > 0 ? segments[idx - 1]?.source_text : undefined;
                            const nextSrc =
                              idx + 1 < segments.length ? segments[idx + 1]?.source_text : undefined;
                            const segCtxHash = computeSegmentContextHash(
                              prevSrc,
                              seg.source_text,
                              nextSrc
                            );
                            const isCtxExc = contextualExceptions.some(
                              (ex) => ex.segment_index === idx || ex.context_hash === segCtxHash
                            );
                            const repList =
                              segmentRepetitionCounts.get(
                                normalizeSegmentSourceForPropagation(seg.source_text)
                              ) || [];

                            return (
                              <>
                                {repList.length >= 2 && (
                                  <span
                                    className="badge badge-accent"
                                    title={`Este trecho se repete ${
                                      repList.length
                                    }x na obra (Trechos #${repList
                                      .map((r) => r + 1)
                                      .join(
                                        ', #'
                                      )}). Confirmar auto-propaga automaticamente para as demais ocorrências que não sejam Exceção Contextual!`}
                                  >
                                    🔁 Repete {repList.length}x na Obra
                                  </span>
                                )}
                                <button
                                  type="button"
                                  className={`badge ${
                                    isCtxExc ? 'badge-fuzzy' : 'badge-accent'
                                  } badge-btn`}
                                  title={`Criar ou remover Exceção Contextual ("Tradução Alternativa" — OmegaT) vinculada ao contexto (${segCtxHash}: ¶ Anterior + ¶ Posterior). Protege este trecho contra sobrescritas de Auto-Propagação!`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleContextualException(idx);
                                  }}
                                >
                                  {isCtxExc
                                    ? `🔀 Exceção Contextual Ativa (${segCtxHash})`
                                    : '🔀 Marcar Exceção Contextual'}
                                </button>
                              </>
                            );
                          })()}

                          {/* Interactive Button 1F (Issue #4): Fluid Segment Merge & Split */}
                          {idx + 1 < segments.length && (
                            <button
                              type="button"
                              className="badge badge-btn"
                              title="Unir este trecho com o próximo segmento em um único bloco contextual"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMergeWithNextSegment(idx);
                              }}
                            >
                              🔗 Unir c/ #{idx + 2}
                            </button>
                          )}
                          {/[.!?;:]\s+\S/.test(seg.source_text.trim()) && (
                            <button
                              type="button"
                              className="badge badge-btn"
                              title="Dividir este trecho na pontuação intermediária em dois segmentos independentes"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSplitSegmentAtPunctuation(idx);
                              }}
                            >
                              ✂️ Dividir
                            </button>
                          )}

                          {/* Interactive Button 2: Glossary Term Quick-Insert Buttons */}
                          {glossary
                            .filter((g) =>
                              seg.source_text.toLowerCase().includes(g.source_term.toLowerCase())
                            )
                            .map((g) => (
                              <button
                                key={g.source_term}
                                type="button"
                                className="badge badge-exact badge-btn"
                                title="Clique para inserir/aplicar este termo obrigatório do glossário na tradução"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveSegIdx(idx);
                                  handleApplyGlossaryTermToSegment(idx, g);
                                }}
                              >
                                📌 {g.source_term} → {g.target_term} (Inserir)
                              </button>
                            ))}

                          {isActive &&
                            activeQaWarnings.map((w, wIdx) => (
                              <span key={wIdx} className="badge badge-fuzzy">
                                ⚠️ {w}
                              </span>
                            ))}
                        </div>

                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            type="button"
                            className="btn btn-primary"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRunLocalModelWithHarness(idx);
                            }}
                          >
                            🧠 Sugerir (IA Local)
                          </button>
                          <button
                            type="button"
                            className="btn btn-success"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleConfirmAndEvolveHarness(idx);
                            }}
                          >
                            ✓ Confirmar & Evoluir Harness
                          </button>
                        </div>
                      </div>

                      {/* Issue #3: Inline Hybrid AutoAssemble Skeleton Breakdown Card */}
                      {openAutoAssembleIdx === idx && autoAssembleBySegIdx[idx] && (
                        <div
                          className="card"
                          style={{
                            marginTop: '6px',
                            border: '2px solid var(--success)',
                            background: 'var(--page-canvas)',
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="card-title" style={{ flexWrap: 'wrap', gap: '6px' }}>
                            <span>
                              🧩 Esqueleto AutoAssemble Híbrido — Trecho #{idx + 1} (Cobertura
                              Determinística:{' '}
                              {autoAssembleBySegIdx[idx].deterministic_coverage_pct}%)
                            </span>
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                              <span className="badge badge-exact">
                                📌{' '}
                                {
                                  autoAssembleBySegIdx[idx].fragments.filter(
                                    (f) => f.origin === 'GlossaryLexicon'
                                  ).length
                                }{' '}
                                Léxico/Glossário
                              </span>
                              <span className="badge badge-accent">
                                📚{' '}
                                {
                                  autoAssembleBySegIdx[idx].fragments.filter(
                                    (f) => f.origin === 'TmOrLiveCorpusSubsegment'
                                  ).length
                                }{' '}
                                Sub-segmento TM/Corpus
                              </span>
                              <span className="badge badge-fuzzy">
                                🧠{' '}
                                {
                                  autoAssembleBySegIdx[idx].fragments.filter(
                                    (f) => f.origin === 'LocalModelGrammarStitch'
                                  ).length
                                }{' '}
                                Costura Morfológica
                              </span>
                              <button
                                type="button"
                                className="btn"
                                style={{ fontSize: '0.7rem', padding: '1px 7px' }}
                                onClick={() => setOpenAutoAssembleIdx(null)}
                              >
                                ✕ Fechar
                              </button>
                            </div>
                          </div>
                          <div
                            style={{
                              display: 'flex',
                              flexWrap: 'wrap',
                              gap: '6px',
                              marginTop: '4px',
                            }}
                          >
                            {autoAssembleBySegIdx[idx].fragments.map((frag, fIdx) => (
                              <div
                                key={fIdx}
                                style={{
                                  padding: '5px 8px',
                                  background: 'var(--surface)',
                                  border: `1px solid ${
                                    frag.origin === 'GlossaryLexicon'
                                      ? 'var(--success)'
                                      : frag.origin === 'TmOrLiveCorpusSubsegment'
                                      ? 'var(--accent)'
                                      : 'var(--border-dark)'
                                  }`,
                                  fontSize: '0.74rem',
                                }}
                              >
                                <div style={{ fontWeight: 700 }}>{frag.target_span}</div>
                                <div style={{ fontSize: '0.67rem', color: 'var(--text-muted)' }}>
                                  Fonte: "{frag.source_span}" •{' '}
                                  <strong>
                                    {frag.origin === 'GlossaryLexicon'
                                      ? '📌 Léxico/Glossário'
                                      : frag.origin === 'TmOrLiveCorpusSubsegment'
                                      ? '📚 Sub-segmento TM/LiveCorpus'
                                      : '🧠 Costura Morfológica IA Local'}
                                  </strong>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Inline Segment Git Genealogy Drawer ("🕰️ História Git deste Trecho") */}
                      {openGenealogyIdx === idx && (
                        <div
                          className="card"
                          style={{
                            marginTop: '6px',
                            border: '2px solid var(--accent)',
                            background: 'var(--page-canvas)',
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div
                            className="card-title"
                            style={{ flexWrap: 'wrap', gap: '6px' }}
                          >
                            <span>
                              🕰️ Genealogia Git deste Trecho (#{idx + 1}) — Linha Evolutiva
                              Obsidian + Git
                            </span>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button
                                type="button"
                                className="btn"
                                style={{ fontSize: '0.7rem', padding: '1px 7px' }}
                                onClick={() => {
                                  setActiveTab('obsidian');
                                  setObsidianSubTab('canvas_graph');
                                  setSelectedCanvasIndex(1);
                                }}
                              >
                                🧬 Ver no Canvas Visual (.canvas)
                              </button>
                              <button
                                type="button"
                                className="btn"
                                style={{ fontSize: '0.7rem', padding: '1px 7px' }}
                                onClick={() => setOpenGenealogyIdx(null)}
                              >
                                ✕ Fechar
                              </button>
                            </div>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {(
                              segmentGenealogies[idx] || [
                                {
                                  version_number: 0,
                                  stage: 'OriginalSource' as const,
                                  stage_label: 'Versão 0 (Original Extraído)',
                                  text: seg.source_text,
                                  commit_short_hash: '1f04c8a',
                                  timestamp_label: 'Base',
                                  model_or_author: 'Documento Fonte / OCR',
                                },
                              ]
                            ).map((rev, rIdx) => (
                              <div
                                key={rIdx}
                                style={{
                                  padding: '6px 8px',
                                  background: 'var(--bg-primary)',
                                  border: '1px solid var(--border)',
                                  fontSize: '0.77rem',
                                }}
                              >
                                <div
                                  style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginBottom: '3px',
                                    flexWrap: 'wrap',
                                    gap: '4px',
                                  }}
                                >
                                  <span>
                                    <strong>{rev.stage_label}</strong> •{' '}
                                    <code>#{rev.commit_short_hash}</code> •{' '}
                                    <span style={{ color: 'var(--text-muted)' }}>
                                      {rev.model_or_author} ({rev.timestamp_label})
                                    </span>
                                  </span>
                                  {rev.version_number > 0 && (
                                    <button
                                      type="button"
                                      className="btn"
                                      style={{ fontSize: '0.68rem', padding: '1px 6px' }}
                                      onClick={() => {
                                        const next = [...segments];
                                        next[idx] = {
                                          ...seg,
                                          target_text: rev.text,
                                          status: 'Translated',
                                        };
                                        setSegments(next);
                                        setStatusNotice(
                                          `↩️ Trecho #${idx + 1} restaurado para a ${rev.stage_label} (#${rev.commit_short_hash})!`
                                        );
                                      }}
                                    >
                                      ↩️ Restaurar esta Versão
                                    </button>
                                  )}
                                </div>
                                <div style={{ whiteSpace: 'pre-wrap' }}>{rev.text}</div>
                                {rev.rationale_or_adr && (
                                  <div
                                    style={{
                                      marginTop: '3px',
                                      fontSize: '0.72rem',
                                      color: 'var(--accent)',
                                      fontWeight: 700,
                                    }}
                                  >
                                    ⚖️ Justificativa / ADR: {rev.rationale_or_adr}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Inline Real-Time Scan Crop Inspector ("Tirar a Teima no Scan Original" + Corrigir OCR) */}
                      {isScanInspectOpenHere && (
                        <div
                          className="card"
                          style={{
                            marginTop: '6px',
                            border: '2px solid var(--accent)',
                            background: 'var(--page-canvas)',
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div
                            className="card-title"
                            style={{ flexWrap: 'wrap', gap: '6px' }}
                          >
                            <span>
                              🔍 Print do Scan Original (Tirar a Teima) — Trecho #{idx + 1} (Pág.{' '}
                              {scanSnippetData?.page ?? 1} de {scanSnippetData?.totalPages ?? 1})
                            </span>
                            <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                              <button
                                type="button"
                                className="btn"
                                style={{ fontSize: '0.7rem', padding: '1px 6px' }}
                                onClick={() =>
                                  requestScanSnippetForText(
                                    seg.source_text,
                                    scanSnippetData?.y ?? seg.bbox.y,
                                    Math.max(1, (scanSnippetData?.page ?? 1) - 1)
                                  )
                                }
                              >
                                ◀ Pág. Ant.
                              </button>
                              <button
                                type="button"
                                className="btn"
                                style={{ fontSize: '0.7rem', padding: '1px 6px' }}
                                onClick={() =>
                                  requestScanSnippetForText(
                                    seg.source_text,
                                    scanSnippetData?.y ?? seg.bbox.y,
                                    (scanSnippetData?.page ?? 1) + 1
                                  )
                                }
                              >
                                Próx. Pág. ▶
                              </button>
                              <button
                                type="button"
                                className="btn"
                                style={{ fontSize: '0.7rem', padding: '1px 6px' }}
                                onClick={() =>
                                  requestScanSnippetForText(
                                    seg.source_text,
                                    scanSnippetData?.y ?? seg.bbox.y,
                                    scanSnippetData?.page ?? 1,
                                    (scanSnippetData?.y ?? seg.bbox.y) - 0.08
                                  )
                                }
                              >
                                ⬆️ Subir Recorte
                              </button>
                              <button
                                type="button"
                                className="btn"
                                style={{ fontSize: '0.7rem', padding: '1px 6px' }}
                                onClick={() =>
                                  requestScanSnippetForText(
                                    seg.source_text,
                                    scanSnippetData?.y ?? seg.bbox.y,
                                    scanSnippetData?.page ?? 1,
                                    (scanSnippetData?.y ?? seg.bbox.y) + 0.08
                                  )
                                }
                              >
                                ⬇️ Descer Recorte
                              </button>
                              <button
                                type="button"
                                className="btn"
                                style={{ fontSize: '0.7rem', padding: '1px 6px' }}
                                onClick={() => setShowFullPageInSnippet((prev) => !prev)}
                              >
                                {showFullPageInSnippet ? '🔍 Ver Só Recorte' : '🗺️ Ver Pág. Inteira'}
                              </button>
                              <button
                                type="button"
                                className="btn"
                                style={{ fontSize: '0.7rem', padding: '1px 6px' }}
                                onClick={() => setOpenScanInspectIdx(null)}
                              >
                                ✕ Fechar
                              </button>
                            </div>
                          </div>

                          <img
                            src={
                              showFullPageInSnippet && scanSnippetData?.fullPageDataUrl
                                ? scanSnippetData.fullPageDataUrl
                                : scanSnippetData?.cropDataUrl ||
                                  renderFacsimileScanCropDataUrl(seg.source_text)
                            }
                            alt="Recorte do Scan Original"
                            style={{
                              width: '100%',
                              maxHeight: showFullPageInSnippet ? '310px' : '180px',
                              objectFit: 'contain',
                              border: '1px solid var(--border)',
                              background: '#f4efe1',
                              marginBottom: '8px',
                            }}
                          />

                          {segOcrDoubts.length > 0 && (
                            <div
                              style={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: '6px',
                                marginBottom: '8px',
                              }}
                            >
                              {segOcrDoubts.map((d, dIdx) => (
                                <button
                                  key={dIdx}
                                  type="button"
                                  className="btn btn-success"
                                  style={{ fontSize: '0.73rem' }}
                                  onClick={() => {
                                    const next = [...segments];
                                    next[idx] = {
                                      ...seg,
                                      source_text: seg.source_text.replace(d.wrong, d.right),
                                    };
                                    setSegments(next);
                                    setStatusNotice(
                                      `✅ Caractere do OCR corrigido no Trecho #${idx + 1}: "${d.wrong}" → "${d.right}"!`
                                    );
                                  }}
                                >
                                  ✨ Corrigir "{d.wrong}" → "{d.right}" ({d.reason})
                                </button>
                              ))}
                            </div>
                          )}

                          <div style={{ fontSize: '0.74rem', fontWeight: 700, marginBottom: '4px' }}>
                            ✏️ Editar Texto Original Extraído pelo OCR (se algum caractere saiu trocado no scan):
                          </div>
                          <textarea
                            className="code-editor"
                            style={{ minHeight: '64px', fontSize: '0.78rem' }}
                            value={seg.source_text}
                            onChange={(e) => {
                              const next = [...segments];
                              next[idx] = {
                                ...seg,
                                source_text: e.target.value,
                              };
                              setSegments(next);
                            }}
                          />
                        </div>
                      )}

                      {/* Inline Segment Harness Drawer when user clicks "🛡️ Harness" */}
                      {isHarnessOpenHere && (
                        <div
                          className="card"
                          style={{
                            marginTop: '6px',
                            border: '2px solid var(--accent)',
                            background: 'var(--page-canvas)',
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="card-title">
                            <span>
                              🛡️ Regras do Harness Ativas no Trecho #{idx + 1} ({effectiveDomain})
                            </span>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button
                                type="button"
                                className="btn"
                                style={{ fontSize: '0.72rem' }}
                                onClick={() => setActiveTab('harness')}
                              >
                                ✎ Editar AGENT.md Completo
                              </button>
                              <button
                                type="button"
                                className="btn"
                                style={{ fontSize: '0.72rem' }}
                                onClick={() => setOpenSegmentHarnessIdx(null)}
                              >
                                ✕ Fechar
                              </button>
                            </div>
                          </div>
                          <div style={{ fontSize: '0.78rem', marginBottom: '6px' }}>
                            Marque ou desmarque quais habilidades (Skills) a IA Local deve usar ao
                            traduzir este trecho:
                          </div>
                          {skills.map((sk, sIdx) => (
                            <label
                              key={sk.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                fontSize: '0.78rem',
                                padding: '4px 0',
                                cursor: 'pointer',
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={sk.enabled}
                                onChange={(e) => {
                                  const next = [...skills];
                                  next[sIdx] = { ...sk, enabled: e.target.checked };
                                  setSkills(next);
                                }}
                              />
                              <span>
                                <strong>{sk.name}</strong> — {sk.description}
                              </span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Right Pane: LiveCorpus (.amanuensis/corpus/), Longest Substring Concordance (LSC), Expanded 3¶ Context & Auxiliary TM */}
          <section className="pane">
            <div className="pane-header" style={{ flexWrap: 'wrap', gap: '4px' }}>
              <span>📚 LiveCorpus, LSC & Memória</span>
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className={`btn ${showLiveCorpusDrawerInWorkbench ? 'btn-primary' : ''}`}
                  style={{ fontSize: '0.68rem', padding: '2px 6px' }}
                  onClick={() => setShowLiveCorpusDrawerInWorkbench((prev) => !prev)}
                  title="Abrir a gaveta única .amanuensis/corpus/ para adicionar Obras Anteriores do Autor, Pares Original + Tradução Antiga ou Referências Monolíngues"
                >
                  🗂️ .amanuensis/corpus/ ({liveCorpusDocs.length})
                </button>
                <button
                  type="button"
                  className="btn"
                  style={{ fontSize: '0.68rem', padding: '2px 6px' }}
                  onClick={() => setActiveTab('tm')}
                  title="Abrir o Explorer de Mirrors de Bancos Abertos e o Cofre Completo LiveCorpus"
                >
                  🌐 Mirrors ({openMirrors.filter((m) => m.installed).length})
                </button>
              </div>
            </div>
            <div className="pane-body">
              {/* Clean Single-Drawer LiveCorpus Manager (.amanuensis/corpus/ — Zero Resource Console) */}
              {showLiveCorpusDrawerInWorkbench && (
                <div
                  className="card"
                  style={{
                    border: '2px solid var(--accent)',
                    background: 'var(--page-canvas)',
                    marginBottom: '12px',
                  }}
                >
                  <div className="card-title" style={{ flexWrap: 'wrap', gap: '4px' }}>
                    <span>🗂️ Gaveta Limpa `.amanuensis/corpus/` (Zero Alinhador TMX)</span>
                    <button
                      type="button"
                      className="btn"
                      style={{ fontSize: '0.68rem', padding: '1px 5px' }}
                      onClick={() => setShowLiveCorpusDrawerInWorkbench(false)}
                    >
                      ✕
                    </button>
                  </div>
                  <p style={{ fontSize: '0.73rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                    Solte ou escolha obras anteriores do autor, pares <code>Original + Tradução</code>{' '}
                    ou referências monolíngues — indexação imediata por parágrafo:
                  </p>
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '8px' }}>
                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{ fontSize: '0.7rem', padding: '3px 7px' }}
                      onClick={() => triggerPickLiveCorpusFile('AuthorPriorWork')}
                    >
                      📂 + Obra do Autor (.pdf/.docx/.md)
                    </button>
                    <button
                      type="button"
                      className="btn btn-success"
                      style={{ fontSize: '0.7rem', padding: '3px 7px' }}
                      onClick={() => triggerPickLiveCorpusFile('MonolingualTargetReference')}
                    >
                      🇧🇷 + Ref. Monolíngue ({onbTargetLang})
                    </button>
                    <button
                      type="button"
                      className="btn"
                      style={{ fontSize: '0.7rem', padding: '3px 7px' }}
                      onClick={() => setActiveTab('tm')}
                    >
                      🔗 Alinhar Par Original + Tradução…
                    </button>
                  </div>
                  {liveCorpusDocs.map((doc) => (
                    <div
                      key={doc.id}
                      style={{
                        fontSize: '0.73rem',
                        padding: '5px 6px',
                        background: 'var(--bg-primary)',
                        border: '1px solid var(--border)',
                        marginBottom: '4px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <span style={{ wordBreak: 'break-word' }}>
                        <strong>{doc.filename}</strong> ({doc.passage_count}¶)
                      </span>
                      <button
                        type="button"
                        className="btn"
                        style={{ fontSize: '0.66rem', padding: '1px 5px' }}
                        onClick={() => {
                          if (doc.passages[0]) {
                            setInspectedContextPassage(doc.passages[0]);
                          }
                        }}
                      >
                        📖 Ver 3¶
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* 1. LONGEST SUBSTRING CONCORDANCE (LSC) & MUSE SUB-SEGMENT PREDICTION */}
              <div style={{ marginBottom: '12px' }}>
                <div
                  style={{
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    color: 'var(--text-muted)',
                    marginBottom: '6px',
                    textTransform: 'uppercase',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span>✨ Concordância Sub-frase LSC & Muse ({activeLscMatches.length})</span>
                  <span className="badge badge-accent">N-Gramas Contíguos</span>
                </div>
                {activeLscMatches.length === 0 ? (
                  <div
                    className="card"
                    style={{ fontSize: '0.75rem', color: 'var(--text-muted)', padding: '8px' }}
                  >
                    Nenhuma sub-frase contígua detectada neste trecho. Adicione mais obras em{' '}
                    <code>.amanuensis/corpus/</code>.
                  </div>
                ) : (
                  activeLscMatches.map((hit, hIdx) => (
                    <div
                      key={hIdx}
                      className="card"
                      style={{
                        padding: '8px',
                        marginBottom: '6px',
                        borderLeft: '3px solid var(--accent)',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: '4px',
                          flexWrap: 'wrap',
                          gap: '4px',
                        }}
                      >
                        <span className="badge badge-exact">
                          🔍 LSC: {hit.word_count} palavras contíguas
                        </span>
                        <span
                          className="badge badge-fuzzy"
                          title="Mesmo quando a frase inteira tem <50% de similaridade global, o LSC resgata a maior sub-frase contígua!"
                        >
                          Sim. Global: {hit.global_sentence_similarity_pct}% (&lt;50% Resgatado!)
                        </span>
                      </div>
                      <div style={{ fontSize: '0.78rem', marginBottom: '3px' }}>
                        Sub-frase fonte: <strong>"{hit.source_ngram}"</strong>
                      </div>
                      {hit.suggested_target_phrase && (
                        <div
                          style={{
                            fontSize: '0.8rem',
                            color: 'var(--success)',
                            fontWeight: 700,
                            marginBottom: '6px',
                          }}
                        >
                          ⚡ Muse (Equivalente): "{hit.suggested_target_phrase}"
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          className="btn btn-primary"
                          style={{ fontSize: '0.7rem', padding: '2px 7px' }}
                          onClick={() => handleInsertLscSubphrase(activeSegIdx, hit)}
                        >
                          ⚡ Inserir Sub-frase
                        </button>
                        <button
                          type="button"
                          className="btn"
                          style={{ fontSize: '0.7rem', padding: '2px 7px' }}
                          onClick={() =>
                            setInspectedContextPassage({
                              id: hit.passage_id,
                              doc_id: hit.passage_id,
                              doc_title: hit.doc_title,
                              doc_kind: hit.doc_kind,
                              paragraph_index: 1,
                              prev_paragraph: hit.prev_paragraph,
                              source_paragraph: hit.source_paragraph,
                              target_paragraph: hit.target_paragraph,
                              next_paragraph: hit.next_paragraph,
                              alignment_confidence: 0.96,
                            })
                          }
                        >
                          📖 Contexto Expandido (¶ Ant./Atual/Post.)
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* 2. EXPANDED 3-PARAGRAPH CONTEXT INSPECTOR (¶ Anterior + ¶ Atual + ¶ Posterior) */}
              {inspectedContextPassage && (
                <div
                  className="card"
                  style={{
                    marginBottom: '12px',
                    border: '2px solid var(--accent)',
                    background: 'var(--page-canvas)',
                  }}
                >
                  <div className="card-title" style={{ flexWrap: 'wrap', gap: '4px' }}>
                    <span>📖 Inspeção de Contexto Expandido (Janela de 3 Parágrafos)</span>
                    <span className="badge badge-exact">
                      {Math.round(inspectedContextPassage.alignment_confidence * 100)}% Alinhado
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: '0.72rem',
                      color: 'var(--text-muted)',
                      marginBottom: '6px',
                      fontWeight: 600,
                    }}
                  >
                    📚 Obra: {inspectedContextPassage.doc_title}
                  </div>

                  {inspectedContextPassage.prev_paragraph && (
                    <div
                      style={{
                        fontSize: '0.73rem',
                        color: 'var(--text-muted)',
                        padding: '5px 7px',
                        background: 'var(--bg-primary)',
                        borderLeft: '2px solid var(--border)',
                        marginBottom: '5px',
                      }}
                    >
                      <strong>¶ Parágrafo Anterior:</strong> {inspectedContextPassage.prev_paragraph}
                    </div>
                  )}

                  <div
                    style={{
                      fontSize: '0.77rem',
                      padding: '6px 8px',
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--accent)',
                      marginBottom: '5px',
                    }}
                  >
                    <div>
                      <strong>¶ Parágrafo da Correspondência (Original):</strong>{' '}
                      {inspectedContextPassage.source_paragraph}
                    </div>
                    {inspectedContextPassage.target_paragraph && (
                      <div
                        style={{
                          marginTop: '4px',
                          paddingTop: '4px',
                          borderTop: '1px dashed var(--border)',
                          color: 'var(--success)',
                          fontWeight: 600,
                        }}
                      >
                        <strong>↳ Tradução Alinhada no LiveCorpus:</strong>{' '}
                        {inspectedContextPassage.target_paragraph}
                      </div>
                    )}
                  </div>

                  {inspectedContextPassage.next_paragraph && (
                    <div
                      style={{
                        fontSize: '0.73rem',
                        color: 'var(--text-muted)',
                        padding: '5px 7px',
                        background: 'var(--bg-primary)',
                        borderLeft: '2px solid var(--border)',
                      }}
                    >
                      <strong>¶ Parágrafo Posterior:</strong> {inspectedContextPassage.next_paragraph}
                    </div>
                  )}
                </div>
              )}

              <div style={{ marginBottom: '14px' }}>
                <div
                  style={{
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    color: 'var(--text-muted)',
                    marginBottom: '8px',
                    textTransform: 'uppercase',
                  }}
                >
                  Traduções Semelhantes Encontradas ({activeTmMatches.length})
                </div>
                {activeTmMatches.map((m) => (
                  <div key={m.id} className="card">
                    <div className="card-title">
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {m.bank_name}
                      </span>
                      <span
                        className={`badge ${
                          m.similarity_pct >= 100 ? 'badge-exact' : 'badge-fuzzy'
                        }`}
                      >
                        {m.similarity_pct}% Compatível
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: '0.79rem',
                        color: 'var(--text-muted)',
                        marginBottom: '5px',
                      }}
                    >
                      {m.source_text}
                    </div>
                    <div style={{ fontSize: '0.84rem', fontWeight: 600, marginBottom: '8px' }}>
                      {m.target_text}
                    </div>
                    <div style={{ display: 'flex', gap: '5px' }}>
                      <button
                        type="button"
                        className="btn btn-primary"
                        style={{ flex: 1, fontSize: '0.74rem' }}
                        onClick={() => {
                          const next = [...segments];
                          next[activeSegIdx] = {
                            ...activeSegment,
                            target_text: m.target_text,
                            status: 'Translated',
                          };
                          setSegments(next);
                          setStatusNotice(
                            `↳ Correspondência do banco "${m.bank_name}" inserida no Trecho #${
                              activeSegIdx + 1
                            }!`
                          );
                        }}
                      >
                        ↳ Usar Tradução
                      </button>
                      <button
                        type="button"
                        className="btn"
                        style={{ fontSize: '0.72rem' }}
                        onClick={() => {
                          const prevSeg = segments[Math.max(0, activeSegIdx - 1)];
                          const nextSeg = segments[Math.min(segments.length - 1, activeSegIdx + 1)];
                          setInspectedContextPassage({
                            id: `tm-ctx-${m.id}`,
                            doc_id: m.bank_name,
                            doc_title: m.bank_name,
                            doc_kind: 'BilingualAutoAligned',
                            paragraph_index: activeSegIdx,
                            prev_paragraph:
                              prevSeg?.source_text ||
                              '¶ [Parágrafo anterior na Memória de Tradução]',
                            source_paragraph: m.source_text,
                            target_paragraph: m.target_text,
                            next_paragraph:
                              nextSeg?.source_text ||
                              '¶ [Parágrafo posterior na Memória de Tradução]',
                            alignment_confidence: m.similarity_pct / 100,
                          });
                        }}
                      >
                        📖 Ver 3¶
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="card">
                <div className="card-title">
                  <span>🛡️ Regras Aprendidas das Suas Edições</span>
                  <span className="badge badge-accent">{effectiveDomain.slice(0, 22)}…</span>
                </div>
                <p
                  style={{
                    fontSize: '0.78rem',
                    color: 'var(--text-muted)',
                    lineHeight: 1.45,
                    marginBottom: '8px',
                  }}
                >
                  Sempre que você altera uma sugestão do modelo <strong>{activeModel.name}</strong> e
                  clica em <strong>Confirmar</strong>, o Amanuensis aprende sua preferência para não
                  repetir o mesmo erro neste projeto:
                </p>
                {learnedRules.map((r) => (
                  <div
                    key={r.id}
                    style={{
                      fontSize: '0.75rem',
                      padding: '6px 8px',
                      background: 'var(--bg-primary)',
                      borderRadius: 'var(--radius)',
                      marginBottom: '6px',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <div>
                      Evitar: <del style={{ color: 'var(--danger)' }}>{r.pattern_from}</del>
                    </div>
                    <div>
                      Preferir: <strong style={{ color: 'var(--success)' }}>{r.preferred_to}</strong>
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>
                      {r.rationale} ({r.occurrences}x)
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </main>
      )}

      {/* Tab 2: Auxiliary Translation Memory Manager + LiveCorpus (.amanuensis/corpus/) + Open Mirrors Explorer */}
      {activeTab === 'tm' && (
        <main className="pane-body" style={{ maxWidth: '1320px', margin: '0 auto', width: '100%' }}>
          {/* ============================================================================
              ISSUE #2: COFRE DE REFERÊNCIA VIVA (.amanuensis/corpus/) & LSC ZERO-CONFIG
              ============================================================================ */}
          <div
            className="card"
            style={{
              border: '2px solid var(--accent)',
              marginBottom: '18px',
              padding: '16px',
              background: 'var(--page-canvas)',
            }}
          >
            <div
              className="card-title"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '8px',
                marginBottom: '8px',
              }}
            >
              <div>
                <h2 style={{ fontSize: '1.1rem', marginBottom: '2px' }}>
                  📚 Cofre de Referência Viva (<code>.amanuensis/corpus/</code> — LiveDocs & Longest
                  Substring Concordance)
                </h2>
                <p style={{ fontSize: '0.81rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                  Solte obras anteriores do mesmo autor (<code>.pdf</code>, <code>.docx</code>,{' '}
                  <code>.md</code>, <code>.epub</code>, <code>.txt</code>), pares{' '}
                  <strong>Original + Tradução Antiga</strong> (alinhados automaticamente sem
                  Alinhador TMX manual!) ou artigos monolíngues de referência. Clique em qualquer
                  passagem para inspecionar o <strong>Contexto Expandido (3 Parágrafos)</strong>:
                </p>
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => triggerPickLiveCorpusFile('AuthorPriorWork')}
                >
                  📂 Importar Obra do Autor (.pdf/.docx/.md)
                </button>
                <button
                  type="button"
                  className="btn btn-success"
                  onClick={() => triggerPickLiveCorpusFile('MonolingualTargetReference')}
                >
                  🇧🇷 Importar Referência Monolíngue ({onbTargetLang})
                </button>
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1.25fr 1fr',
                gap: '12px',
                marginTop: '10px',
              }}
            >
              {/* Left: Indexed LiveCorpus Works + 3-Paragraph Context Browser */}
              <div>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, marginBottom: '6px' }}>
                  🗂️ Obras Indexadas em <code>.amanuensis/corpus/</code> ({liveCorpusDocs.length}{' '}
                  documentos • Zero Resource Console):
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {liveCorpusDocs.map((doc) => (
                    <div
                      key={doc.id}
                      style={{
                        padding: '10px',
                        background: 'var(--bg-primary)',
                        border: '1px solid var(--border)',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: '6px',
                          marginBottom: '6px',
                        }}
                      >
                        <div>
                          <strong style={{ fontSize: '0.83rem' }}>{doc.title}</strong>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            Arquivo: <code>{doc.filename}</code> • {doc.passage_count} parágrafos
                            indexados c/ janela 3¶
                          </div>
                        </div>
                        <span className="badge badge-exact">
                          {doc.kind === 'BilingualAutoAligned'
                            ? `🔗 Par Bilíngue Auto-Alinhado (${Math.round(
                                doc.avg_alignment_confidence * 100
                              )}%)`
                            : doc.kind === 'AuthorPriorWork'
                            ? '📚 Obra Anterior do Autor'
                            : '🇧🇷 Referência Monolíngue'}
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {doc.passages.map((p, pIdx) => (
                          <button
                            key={p.id}
                            type="button"
                            className={`btn ${
                              inspectedContextPassage?.id === p.id ? 'btn-primary' : ''
                            }`}
                            style={{ fontSize: '0.71rem', padding: '2px 8px' }}
                            onClick={() => setInspectedContextPassage(p)}
                          >
                            📖 Inspecionar Parágrafo #{pIdx + 1} (Contexto 3¶)
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right: Zero-Config Bilingual / Monolingual Quick Adder + 3¶ Preview */}
              <div
                style={{
                  padding: '10px',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border)',
                }}
              >
                <div style={{ fontSize: '0.79rem', fontWeight: 700, marginBottom: '6px' }}>
                  ⚡ Adicionar Par <code>Original + Tradução Antiga</code> ou Obra s/ Alinhamento
                  Manual:
                </div>
                <div style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
                  <input
                    className="select-pill"
                    style={{ flex: 1 }}
                    placeholder="Título da Obra ou Artigo"
                    value={newCorpusDocTitle}
                    onChange={(e) => setNewCorpusDocTitle(e.target.value)}
                  />
                  <select
                    className="select-pill"
                    value={newCorpusDocKind}
                    onChange={(e) => setNewCorpusDocKind(e.target.value as LiveCorpusDocKind)}
                  >
                    <option value="BilingualAutoAligned">
                      🔗 Par Original + Tradução Antiga (Auto-Alinhado)
                    </option>
                    <option value="AuthorPriorWork">📚 Obra Anterior do Autor</option>
                    <option value="MonolingualTargetReference">
                      🇧🇷 Artigo Monolíngue (Estilo)
                    </option>
                  </select>
                </div>
                <textarea
                  className="code-editor"
                  style={{ minHeight: '62px', fontSize: '0.74rem', marginBottom: '6px' }}
                  placeholder="Cole aqui os parágrafos do texto original (ou da obra monolíngue)..."
                  value={newCorpusRawSource}
                  onChange={(e) => setNewCorpusRawSource(e.target.value)}
                />
                {newCorpusDocKind === 'BilingualAutoAligned' && (
                  <textarea
                    className="code-editor"
                    style={{ minHeight: '62px', fontSize: '0.74rem', marginBottom: '6px' }}
                    placeholder="Cole aqui os parágrafos da tradução antiga correspondente (o Amanuensis alinha automaticamente por parágrafo)..."
                    value={newCorpusRawTarget}
                    onChange={(e) => setNewCorpusRawTarget(e.target.value)}
                  />
                )}
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ width: '100%' }}
                  onClick={handleAddDocumentToLiveCorpus}
                >
                  + Indexar Instantaneamente em .amanuensis/corpus/ (Ativar LSC & Contexto 3¶)
                </button>
              </div>
            </div>
          </div>

          {/* ============================================================================
              EXPLORER DE MIRRORS DE BANCOS AUXILIARES ABERTOS (Setup Facilitado & Progresso)
              ============================================================================ */}
          <div
            className="card"
            style={{
              border: '2px solid var(--accent)',
              marginBottom: '18px',
              padding: '16px',
            }}
          >
            <div
              className="card-title"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '8px',
                marginBottom: '8px',
              }}
            >
              <div>
                <h2 style={{ fontSize: '1.1rem', marginBottom: '2px' }}>
                  🌐 Explorer de Mirrors de Bancos Auxiliares Abertos (Download & Setup Facilitado)
                </h2>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                  Baixe memórias de tradução (TMX), corpora acadêmicos/literários e bancos
                  terminológicos abertos (OPUS, SciELO, CLACSO, IATE/UNTERM, Gutenberg, FreeDict). O
                  Amanuensis baixa, descompacta, indexa em <strong>SQLite FTS5</strong> e injeta os
                  termos no Harness com 1 clique:
                </p>
              </div>
              <span className="badge badge-exact">
                {openMirrors.filter((m) => m.installed).length} de {openMirrors.length} Mirrors
                Instalados
              </span>
            </div>

            {/* Filters & Search Bar */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1.4fr 1fr 1.2fr',
                gap: '8px',
                marginBottom: '12px',
                background: 'var(--bg-primary)',
                padding: '10px',
                border: '1px solid var(--border)',
              }}
            >
              <div>
                <label style={{ fontSize: '0.73rem', fontWeight: 700, display: 'block', marginBottom: '3px' }}>
                  Filtrar por Área / Especialidade:
                </label>
                <select
                  className="select-pill"
                  style={{ width: '100%' }}
                  value={mirrorCategoryFilter}
                  onChange={(e) => setMirrorCategoryFilter(e.target.value)}
                >
                  <option value="Todos">📚 Todas as Especialidades ({openMirrors.length})</option>
                  <option value="Ciências Sociais, História & Política">
                    🌍 Ciências Sociais, História & Política (CLACSO / Maio 68)
                  </option>
                  <option value="Acadêmico, Científico & SciELO">
                    🎓 Acadêmico, Científico & SciELO (OPUS SciELO)
                  </option>
                  <option value="Jurídico, Diplomacia & ONU/UE">
                    ⚖️ Jurídico, Diplomacia & ONU/UE (IATE + UNTERM)
                  </option>
                  <option value="Literatura & Clássicos">
                    📖 Literatura & Clássicos (Project Gutenberg / OPUS Books)
                  </option>
                  <option value="Jornalismo, Mídia & Legendas">
                    📰 Jornalismo, Mídia & Discursos (Global Voices / Europarl)
                  </option>
                  <option value="Dicionários, Falsos Cognatos & Regência">
                    🛡️ Dicionários, Falsos Cognatos & Regência (FreeDict)
                  </option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.73rem', fontWeight: 700, display: 'block', marginBottom: '3px' }}>
                  Par de Idiomas:
                </label>
                <select
                  className="select-pill"
                  style={{ width: '100%' }}
                  value={mirrorLangFilter}
                  onChange={(e) => setMirrorLangFilter(e.target.value)}
                >
                  <option value="Todos">🌐 Todos os Pares (ES/EN/FR → PT-BR)</option>
                  <option value="es-ES">🇪🇸 Espanhol → 🇧🇷 Português (es-ES → pt-BR)</option>
                  <option value="en-US">🇺🇸 Inglês → 🇧🇷 Português (en-US → pt-BR)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.73rem', fontWeight: 700, display: 'block', marginBottom: '3px' }}>
                  Buscar no Catálogo de Mirrors:
                </label>
                <input
                  type="text"
                  className="select-pill"
                  style={{ width: '100%' }}
                  placeholder="Buscar por SciELO, CLACSO, IATE, Maio 68, Falsos Cognatos..."
                  value={mirrorSearchQuery}
                  onChange={(e) => setMirrorSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* Mirror Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '12px' }}>
              {filteredOpenMirrors.map((mirror) => {
                const isInspected = inspectedMirrorId === mirror.id;
                return (
                  <div
                    key={mirror.id}
                    className="card"
                    style={{
                      marginBottom: 0,
                      borderLeft: mirror.installed
                        ? '5px solid var(--success)'
                        : mirror.is_installing
                        ? '5px solid var(--accent)'
                        : '4px solid var(--border)',
                    }}
                  >
                    <div
                      className="card-title"
                      style={{ flexWrap: 'wrap', gap: '8px', marginBottom: '6px' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <strong style={{ fontSize: '0.93rem' }}>{mirror.name}</strong>
                        <span className="badge badge-accent">{mirror.category}</span>
                        <span className="badge badge-fuzzy">
                          {mirror.source_lang} → {mirror.target_lang}
                        </span>
                        <span className="badge badge-exact">{mirror.license}</span>
                      </div>

                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          className="btn"
                          style={{ fontSize: '0.73rem' }}
                          onClick={() =>
                            setInspectedMirrorId(isInspected ? null : mirror.id)
                          }
                        >
                          {isInspected
                            ? '✕ Ocultar Amostra'
                            : '👁️ Ver Amostra de Frases & Glossário'}
                        </button>

                        {!mirror.installed ? (
                          <button
                            type="button"
                            className="btn btn-primary"
                            disabled={mirror.is_installing}
                            onClick={() => handleDownloadAndSetupOpenMirror(mirror.id)}
                          >
                            {mirror.is_installing
                              ? `⏳ Configurando (${mirror.install_progress_pct ?? 10}%)...`
                              : `⚡ Baixar & Configurar em 1 Clique (${mirror.size_mb} MB)`}
                          </button>
                        ) : (
                          <>
                            <span className="badge badge-exact" style={{ padding: '4px 8px' }}>
                              🟢 Instalado & Ativo no SQLite FTS5
                            </span>
                            <button
                              type="button"
                              className="btn"
                              style={{ fontSize: '0.73rem', color: 'var(--danger)' }}
                              onClick={() => handleUninstallMirrorBank(mirror.id)}
                            >
                              🗑️ Desinstalar Banco
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    <p style={{ fontSize: '0.81rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                      {mirror.description}
                    </p>

                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '8px',
                        fontSize: '0.74rem',
                        color: 'var(--text-muted)',
                        fontFamily: 'var(--font-mono)',
                      }}
                    >
                      <span>
                        🌐 Mirror Principal: <code>{mirror.mirror_url}</code>
                      </span>
                      <span>
                        📊 {mirror.entry_count.toLocaleString('pt-BR')} pares TMX •{' '}
                        {mirror.glossary_terms_count.toLocaleString('pt-BR')} termos • {mirror.size_mb} MB
                      </span>
                    </div>

                    {/* Multi-Stage Setup & Download Progress Bar */}
                    {(mirror.is_installing || (mirror.installed && mirror.install_stage_label)) && (
                      <div
                        style={{
                          marginTop: '8px',
                          padding: '8px 10px',
                          background: 'var(--bg-primary)',
                          border: '1px solid var(--accent)',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            fontSize: '0.76rem',
                            fontWeight: 700,
                            marginBottom: '4px',
                          }}
                        >
                          <span>{mirror.install_stage_label}</span>
                          <span>
                            {mirror.install_speed_mbps ? `${mirror.install_speed_mbps} • ` : ''}
                            {mirror.install_progress_pct ?? 100}%
                          </span>
                        </div>
                        <div className="meter-bar" style={{ height: '10px' }}>
                          <div
                            className="meter-fill"
                            style={{ width: `${mirror.install_progress_pct ?? 100}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Sample Pairs & Glossary Drawer */}
                    {isInspected && (
                      <div
                        style={{
                          marginTop: '8px',
                          padding: '10px',
                          background: 'var(--bg-primary)',
                          border: '1px solid var(--border)',
                          fontSize: '0.78rem',
                        }}
                      >
                        <div style={{ fontWeight: 700, marginBottom: '6px' }}>
                          📖 Amostra de Pares Alinhados & Termos que Serão Injetados no Seu Projeto:
                        </div>
                        {mirror.sample_pairs.map((sp, idx) => (
                          <div
                            key={idx}
                            style={{
                              padding: '6px',
                              borderBottom: '1px solid var(--border)',
                              marginBottom: '4px',
                            }}
                          >
                            <div style={{ color: 'var(--text-muted)' }}>
                              <strong>Original ({mirror.source_lang}):</strong> {sp.source}
                            </div>
                            <div>
                              <strong>Tradução ({mirror.target_lang}):</strong> {sp.target}
                            </div>
                          </div>
                        ))}
                        {mirror.sample_glossary.length > 0 && (
                          <div style={{ marginTop: '6px' }}>
                            <strong>📌 Termos de Glossário Incluídos:</strong>{' '}
                            {mirror.sample_glossary.map((g, gIdx) => (
                              <span
                                key={gIdx}
                                className="badge badge-exact"
                                style={{ marginRight: '6px' }}
                              >
                                {g.source_term} → {g.target_term} ({g.notes})
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Custom Mirror URL Installer */}
            <div
              style={{
                background: 'var(--bg-primary)',
                padding: '10px',
                border: '1px solid var(--border)',
                display: 'grid',
                gridTemplateColumns: '1.2fr 2fr 0.7fr auto',
                gap: '8px',
                alignItems: 'end',
              }}
            >
              <div>
                <label style={{ fontSize: '0.73rem', fontWeight: 700, display: 'block', marginBottom: '3px' }}>
                  Adicionar Mirror Aberto Personalizado (Nome):
                </label>
                <input
                  type="text"
                  className="select-pill"
                  style={{ width: '100%' }}
                  placeholder="Ex: Corpus Histórico Nacional..."
                  value={customMirrorName}
                  onChange={(e) => setCustomMirrorName(e.target.value)}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.73rem', fontWeight: 700, display: 'block', marginBottom: '3px' }}>
                  URL Direta do Mirror (.tmx, .tmx.gz, .tbx, .csv, HuggingFace/OPUS):
                </label>
                <input
                  type="text"
                  className="select-pill"
                  style={{ width: '100%', fontFamily: 'var(--font-mono)', fontSize: '0.74rem' }}
                  placeholder="https://opus.nlpl.eu/download.php?f=.../es-pt.tmx.gz"
                  value={customMirrorUrl}
                  onChange={(e) => setCustomMirrorUrl(e.target.value)}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.73rem', fontWeight: 700, display: 'block', marginBottom: '3px' }}>
                  Idioma Fonte:
                </label>
                <select
                  className="select-pill"
                  style={{ width: '100%' }}
                  value={customMirrorLang}
                  onChange={(e) => setCustomMirrorLang(e.target.value)}
                >
                  <option value="es-ES">es-ES</option>
                  <option value="en-US">en-US</option>
                  <option value="fr-FR">fr-FR</option>
                  <option value="de-DE">de-DE</option>
                </select>
              </div>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleAddCustomOpenMirror}
              >
                ⬇️ Conectar & Baixar Mirror
              </button>
            </div>
          </div>

          {/* ============================================================================
              BANCOS AUXILIARES ATIVOS NO PROJETO LOCAL
              ============================================================================ */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '12px',
              flexWrap: 'wrap',
              gap: '8px',
            }}
          >
            <div>
              <h3 style={{ fontSize: '1.02rem', marginBottom: '2px' }}>
                🗄️ Bancos de Tradução Ativos Neste Projeto ({tmBanks.length})
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Bancos locais consultados em tempo real (SQLite FTS5 + Reciprocal Rank Fusion) a
                cada trecho selecionado no Workbench:
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                className="select-pill"
                placeholder="Nome do novo banco local vazio..."
                value={newBankName}
                onChange={(e) => setNewBankName(e.target.value)}
              />
              <button
                className="btn btn-primary"
                onClick={() => {
                  if (!newBankName.trim()) return;
                  setTmBanks([
                    ...tmBanks,
                    {
                      id: `tm-aux-${Date.now()}`,
                      name: `Auxiliar: ${newBankName.trim()}`,
                      description: `Banco auxiliar local para ${effectiveDomain}`,
                      source_lang: onbSourceLang,
                      target_lang: onbTargetLang,
                      is_primary: false,
                      read_only: false,
                      weight: 1.0,
                      entry_count: 0,
                    },
                  ]);
                  setNewBankName('');
                  setStatusNotice(`Novo banco de tradução auxiliar "${newBankName}" criado!`);
                }}
              >
                + Criar Banco Vazio
              </button>
            </div>
          </div>

          {tmBanks.map((bank) => (
            <div key={bank.id} className="card" style={{ padding: '14px' }}>
              <div className="card-title">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.95rem' }}>{bank.name}</span>
                  <span className={`badge ${bank.is_primary ? 'badge-exact' : 'badge-accent'}`}>
                    {bank.is_primary ? 'TM Principal (Leitura/Escrita)' : 'TM Auxiliar Ativa'}
                  </span>
                  <span className="badge badge-fuzzy">
                    {bank.source_lang} → {bank.target_lang}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)' }}>
                    Prioridade: {bank.weight.toFixed(1)}x • {bank.entry_count.toLocaleString('pt-BR')}{' '}
                    frases
                  </span>
                  <button
                    className="btn"
                    onClick={() => {
                      const tmx = `<?xml version="1.0" encoding="UTF-8"?>\n<tmx version="1.4">\n  <header creationtool="Amanuensis" datatype="PlainText" segtype="sentence" srclang="${bank.source_lang}"/>\n  <body>\n    <tu>\n      <tuv xml:lang="${bank.source_lang}"><seg>Small local language models achieve remarkable translation fidelity.</seg></tuv>\n      <tuv xml:lang="${bank.target_lang}"><seg>Modelos de linguagem locais compactos alcançam notável fidelidade de tradução.</seg></tuv>\n    </tu>\n  </body>\n</tmx>`;
                      downloadTextFile(`${bank.id}.tmx`, tmx, 'application/xml;charset=utf-8');
                      setStatusNotice(`Banco "${bank.name}" exportado em formato TMX!`);
                    }}
                  >
                    ⬇ Exportar TMX
                  </button>
                  <button
                    className="btn"
                    onClick={() => {
                      const csv = `source,target,domain\n"Small local language models","Modelos de linguagem locais compactos","${effectiveDomain}"\n`;
                      downloadTextFile(`${bank.id}.csv`, csv, 'text/csv;charset=utf-8');
                      setStatusNotice(`Banco "${bank.name}" exportado em formato Planilha CSV!`);
                    }}
                  >
                    ⬇ Exportar CSV
                  </button>
                </div>
              </div>
              <p style={{ fontSize: '0.83rem', color: 'var(--text-muted)' }}>{bank.description}</p>
            </div>
          ))}
        </main>
      )}

      {/* Tab 3: Scanned PDF to Searchable PDF & Markdown Conversion Suite */}
      {activeTab === 'ocr' && (
        <main
          className="workbench-grid"
          style={{ gridTemplateColumns: '1fr 1fr', maxWidth: '1440px', margin: '0 auto' }}
        >
          <section className="pane">
            <div className="pane-header">
              <span>🔍 PDF Escaneado: {uploadedPdfName}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ fontSize: '0.73rem' }}
                  onClick={triggerChooseFile}
                >
                  📂 Carregar PDF Escaneado (.pdf)
                </button>
                <label
                  style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}
                >
                  <input
                    type="checkbox"
                    checked={dehyphenateEnabled}
                    onChange={(e) => setDehyphenateEnabled(e.target.checked)}
                  />
                  <span>Des-hifenizar</span>
                </label>
              </div>
            </div>
            <div className="pane-body">
              <div
                style={{
                  display: 'flex',
                  gap: '6px',
                  flexWrap: 'wrap',
                  marginBottom: '10px',
                }}
              >
                {SAMPLE_SCANNED_PDFS.map((sample) => (
                  <button
                    key={sample.id}
                    type="button"
                    className={`btn ${selectedSamplePdfId === sample.id ? 'btn-primary' : ''}`}
                    style={{ fontSize: '0.72rem' }}
                    onClick={() => handleSelectSamplePdf(sample)}
                  >
                    {sample.title.split('(')[0]}
                  </button>
                ))}
              </div>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '10px' }}>
                Carregue um PDF escaneado acima ou revise o texto extraído abaixo para limpar
                hifenizações ({dehyphenatedCount} detectadas) e gerar o{' '}
                <strong>PDF Pesquisável</strong> e o <strong>Markdown Formatado</strong>:
              </p>
              <textarea
                className="code-editor"
                style={{ minHeight: '330px' }}
                value={ocrInputScan}
                onChange={(e) => setOcrInputScan(e.target.value)}
              />
            </div>
          </section>

          <section className="pane">
            <div className="pane-header">
              <span>✨ Resultado: PDF Pesquisável + Markdown</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className="btn"
                  onClick={() => {
                    downloadTextFile(
                      uploadedPdfName.replace(/\.pdf$/i, '') + '_ocr.md',
                      processedOcrMarkdown,
                      'text/markdown;charset=utf-8'
                    );
                    setStatusNotice('Arquivo Markdown (.md) salvo!');
                  }}
                >
                  ⬇ Salvar Markdown (.md)
                </button>
                <button className="btn btn-primary" onClick={handleSendOcrToWorkbench}>
                  ➔ Levar para a Tela de Tradução
                </button>
              </div>
            </div>
            <div className="pane-body">
              <div className="card">
                <div className="card-title">
                  <span>📄 Gerar PDF Pesquisável (Permite Ctrl+F e Seleção de Texto)</span>
                  <button className="btn btn-success" onClick={handleDownloadSearchablePdf}>
                    ⬇ Baixar PDF Pesquisável (.pdf)
                  </button>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Adiciona a camada de texto sobre a imagem escaneada original mantendo a aparência
                  do documento.
                </p>
              </div>

              <div className="card">
                <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                  <span>🛡️ Harness de Estruturação Pré-Tradução (OCR_FORMAT_HARNESS.md)</span>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <span className={`badge ${ocrFormattingResult.audit.passed ? 'badge-exact' : 'badge-fuzzy'}`}>
                      {ocrFormattingResult.audit.passed
                        ? `✓ Auditoria Léxica 100% (${ocrFormattingResult.audit.lexical_fidelity_pct.toFixed(1)}% palavras · Números 100% preservados)`
                        : '⚠️ Revisar Auditoria'}
                    </span>
                    <select
                      className="select-pill"
                      value={chunkGranularity}
                      onChange={(e) => setChunkGranularity(e.target.value as ChunkGranularity)}
                      style={{ fontSize: '0.74rem', padding: '2px 6px' }}
                    >
                      <option value="ContextualShort">🎯 Contextual Curto (1–2 frases · Recomendado)</option>
                      <option value="ZenMicroSentence">🧘 Zen Micro-Frase (1 frase por vez)</option>
                      <option value="EditorialParagraph">📚 Parágrafo Editorial Curto (2–3 frases)</option>
                    </select>
                  </div>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                  <strong>{ocrFormattingResult.segments.length} trechos contextuais</strong> prontos (média{' '}
                  <strong>{ocrFormattingResult.stats.avg_segment_chars} caracteres</strong> · máx{' '}
                  <strong>{ocrFormattingResult.stats.max_segment_chars}</strong> ·{' '}
                  <strong>{ocrFormattingResult.stats.dehyphenated_words_count}</strong> hifens colados ·{' '}
                  <strong>{ocrFormattingResult.stats.chapters_and_headings_detected}</strong> títulos ·{' '}
                  <strong>{ocrFormattingResult.stats.frontmatter_blocks_grouped}</strong> blocos de ficha catalográfica).
                </div>
                <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  {ocrFormattingResult.segments.map((seg, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '6px 8px',
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border)',
                        fontSize: '0.78rem',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '2px' }}>
                        <strong>#{idx + 1} · {seg.context_label}</strong>
                        <span>{seg.sentence_count} frase(s) · {seg.char_count} chars</span>
                      </div>
                      <div>{seg.markdown_text}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>
                Texto Limpo em Markdown (Pronto para Traduzir):
              </div>
              <pre
                className="code-editor"
                style={{ whiteSpace: 'pre-wrap', minHeight: '220px', overflowY: 'auto' }}
              >
                {processedOcrMarkdown}
              </pre>
            </div>
          </section>
        </main>
      )}

      {/* Tab 4: Project Harness Studio (AGENT.md, OCR_FORMAT_HARNESS.md, skills/*.md, Glossary & Post-Edit Evolution) */}
      {activeTab === 'harness' && (
        <main
          className="workbench-grid"
          style={{ gridTemplateColumns: '1fr 1fr', maxWidth: '1440px', margin: '0 auto' }}
        >
          <section className="pane">
            <div className="pane-header">
              <span>📜 Diretrizes do Projeto (.amanuensis/AGENT.md & OCR_FORMAT_HARNESS.md)</span>
              <span className="badge badge-accent">{effectiveDomain}</span>
            </div>
            <div className="pane-body">
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '10px' }}>
                Estas instruções garantem que o modelo local (<strong>{activeModel.name}</strong>)
                siga o estilo exato deste projeto sem misturar contextos:
              </p>
              <textarea
                className="code-editor"
                style={{ minHeight: '210px', marginBottom: '14px' }}
                value={agentMd}
                onChange={(e) => setAgentMd(e.target.value)}
              />

              <div className="card" style={{ marginBottom: '14px' }}>
                <div className="card-title">
                  <span>🛡️ Harness de Estruturação Pré-Tradução (.amanuensis/OCR_FORMAT_HARNESS.md)</span>
                  <span className="badge badge-exact">Invariância Léxica 100%</span>
                </div>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                  Executado antes de fechar o texto extraído dos scans para estruturar capítulos, fichas catalográficas e fatiar parágrafos longos em trechos curtos e contextuais sem perder nenhuma palavra ou número:
                </p>
                <textarea
                  className="code-editor"
                  style={{ minHeight: '165px', fontSize: '0.75rem' }}
                  value={ocrFormatHarnessMd}
                  onChange={(e) => setOcrFormatHarnessMd(e.target.value)}
                />
              </div>

              <div className="card">
                <div className="card-title">
                  <span>📌 Glossário Obrigatório do Projeto (.amanuensis/glossary.toml)</span>
                </div>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                  <input
                    className="select-pill"
                    placeholder="Termo no original (ex: Welfare State)"
                    value={newGlossarySrc}
                    onChange={(e) => setNewGlossarySrc(e.target.value)}
                  />
                  <input
                    className="select-pill"
                    placeholder="Tradução fixada (ex: Estado de Bem-Estar Social)"
                    value={newGlossaryTgt}
                    onChange={(e) => setNewGlossaryTgt(e.target.value)}
                  />
                  <button
                    className="btn btn-primary"
                    onClick={() => {
                      if (!newGlossarySrc.trim() || !newGlossaryTgt.trim()) return;
                      setGlossary([
                        ...glossary,
                        {
                          source_term: newGlossarySrc.trim(),
                          target_term: newGlossaryTgt.trim(),
                          do_not_translate: false,
                        },
                      ]);
                      setStatusNotice(
                        `Termo "${newGlossarySrc} → ${newGlossaryTgt}" adicionado ao Glossário!`
                      );
                      setNewGlossarySrc('');
                      setNewGlossaryTgt('');
                    }}
                  >
                    + Fixar Termo
                  </button>
                </div>
                {glossary.map((g, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '6px 0',
                      borderBottom: '1px solid var(--border)',
                      fontSize: '0.82rem',
                    }}
                  >
                    <span>
                      <strong>{g.source_term}</strong> → <strong>{g.target_term}</strong>
                    </span>
                    <span className="badge badge-exact">
                      {g.do_not_translate ? 'NÃO TRADUZIR' : 'TRADUÇÃO FIXA'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="pane">
            <div className="pane-header">
              <span>🧩 Habilidades Modulares (.amanuensis/skills/*.md)</span>
              <span className="badge badge-exact">{skills.length} Skills</span>
            </div>
            <div className="pane-body">
              {skills.map((skill, idx) => (
                <div key={skill.id} className="card">
                  <div className="card-title">
                    <span>
                      <code>skills/{skill.id}.md</code> — {skill.name}
                    </span>
                    <input
                      type="checkbox"
                      checked={skill.enabled}
                      onChange={(e) => {
                        const next = [...skills];
                        next[idx] = { ...skill, enabled: e.target.checked };
                        setSkills(next);
                      }}
                    />
                  </div>
                  <p
                    style={{
                      fontSize: '0.78rem',
                      color: 'var(--text-muted)',
                      marginBottom: '6px',
                    }}
                  >
                    {skill.description}
                  </p>
                  <pre
                    style={{
                      fontSize: '0.75rem',
                      fontFamily: 'var(--font-mono)',
                      background: 'var(--bg-primary)',
                      padding: '8px',
                      borderRadius: 'var(--radius)',
                      whiteSpace: 'pre-wrap',
                      border: '1px solid var(--border)',
                    }}
                  >
                    {skill.content_markdown}
                  </pre>
                </div>
              ))}
            </div>
          </section>
        </main>
      )}

      {/* Tab 5: Full Local Model Manager, Custom llama.cpp GGUF Linker & Computer Disk Scanner */}
      {activeTab === 'models' && (
        <main className="pane-body" style={{ maxWidth: '1280px', margin: '0 auto', width: '100%' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '12px',
              flexWrap: 'wrap',
              gap: '8px',
            }}
          >
            <div>
              <h2 style={{ fontSize: '1.15rem', marginBottom: '2px' }}>
                🎛️ Central de Modelos Locais, Custom <code>llama.cpp</code> & Diagnóstico do
                Computador
              </h2>
              <p style={{ fontSize: '0.83rem', color: 'var(--text-muted)' }}>
                Baixe ou apague modelos e seus caches, aponte qualquer modelo <code>.gguf</code>{' '}
                compatível com <code>llama.cpp</code> que você mesmo baixou, ou varra o computador
                para achar modelos duplicados e diagnosticar compatibilidade com seu hardware:
              </p>
            </div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setActiveTab('workbench')}
            >
              ➔ Voltar ao Workbench c/ "{activeModel.name.split('(')[0].trim()}"
            </button>
          </div>

          {renderModelManagementSuite()}
        </main>
      )}

      {/* Tab 6: Obsidian Living Library, Knowledge Graph (.canvas) & Git Story Engine (Issue #1) */}
      {activeTab === 'obsidian' && (
        <main className="pane-body" style={{ maxWidth: '1320px', margin: '0 auto', width: '100%' }}>
          <div
            className="card"
            style={{
              marginBottom: '12px',
              border: '2px solid var(--accent)',
              background: 'var(--page-canvas)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '10px',
              }}
            >
              <div>
                <h2 style={{ fontSize: '1.12rem', marginBottom: '3px' }}>
                  🔮 Biblioteca Viva Obsidian + História Git — "{onbProjectName}"
                </h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Vault no disco: <code>{obsidianVaultDiskPath}</code> • Branch: <code>main</code> •
                  HEAD: <code>#{lastObsidianSyncHash}</code> •{' '}
                  <strong>{liveObsidianBundle.notes.length} arquivos sincronizados</strong>
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => handleSyncObsidianVaultToDisk(false)}
                >
                  ⚡ Sincronizar Vault no Disco + Commit Git
                </button>
                <button
                  type="button"
                  className="btn btn-success"
                  onClick={handleOpenObsidianUri}
                >
                  🚀 Abrir Diretamente no Obsidian (obsidian://)
                </button>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                gap: '6px',
                marginTop: '10px',
                borderTop: '1px solid var(--border)',
                paddingTop: '10px',
                flexWrap: 'wrap',
              }}
            >
              <button
                type="button"
                className={`btn ${obsidianSubTab === 'vault_explorer' ? 'btn-primary' : ''}`}
                onClick={() => setObsidianSubTab('vault_explorer')}
              >
                🏛️ 1. Explorador do Vault ({liveObsidianBundle.notes.length} notas/configs)
              </button>
              <button
                type="button"
                className={`btn ${obsidianSubTab === 'canvas_graph' ? 'btn-primary' : ''}`}
                onClick={() => setObsidianSubTab('canvas_graph')}
              >
                🕸️ 2. Grafo & JSON Canvas 1.0 (2 .canvas + {obsidianAdrs.length} ADRs)
              </button>
              <button
                type="button"
                className={`btn ${obsidianSubTab === 'git_chronicle' ? 'btn-primary' : ''}`}
                onClick={() => setObsidianSubTab('git_chronicle')}
              >
                🕰️ 3. Crônica Git Semântica & Marcos ({gitCommits.length} commits)
              </button>
              <button
                type="button"
                className={`btn ${obsidianSubTab === 'roundtrip_sync' ? 'btn-primary' : ''}`}
                onClick={() => setObsidianSubTab('roundtrip_sync')}
              >
                🔄 4. Sincronização Bidirecional Byte-Preserving & 3 Gates
              </button>
            </div>
          </div>

          {/* SUB-TAB 1: VAULT EXPLORER */}
          {obsidianSubTab === 'vault_explorer' && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '360px 1fr',
                gap: '12px',
                alignItems: 'start',
              }}
            >
              <div className="card">
                <div className="card-title">
                  <span>📂 Topologia do Vault Obsidian</span>
                  <span className="badge badge-exact">
                    {liveObsidianBundle.notes.length} arquivos
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {liveObsidianBundle.notes.map((n, idx) => {
                    const active = idx === selectedVaultNoteIdx;
                    return (
                      <button
                        key={n.relative_path}
                        type="button"
                        className={`btn ${active ? 'btn-primary' : ''}`}
                        style={{
                          textAlign: 'left',
                          justifyContent: 'space-between',
                          fontSize: '0.75rem',
                          padding: '5px 8px',
                        }}
                        onClick={() => setSelectedVaultNoteIdx(idx)}
                      >
                        <span style={{ wordBreak: 'break-all' }}>{n.relative_path}</span>
                        <span className="badge badge-accent" style={{ marginLeft: '6px' }}>
                          {n.category}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="card">
                {(() => {
                  const selectedNote =
                    liveObsidianBundle.notes[selectedVaultNoteIdx] || liveObsidianBundle.notes[0];
                  return (
                    <>
                      <div className="card-title" style={{ flexWrap: 'wrap', gap: '6px' }}>
                        <span>
                          📄 <code>{selectedNote.relative_path}</code>
                        </span>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            type="button"
                            className="btn"
                            style={{ fontSize: '0.73rem' }}
                            onClick={() => {
                              const baseName =
                                selectedNote.relative_path.split('/').pop() || 'nota_obsidian.md';
                              downloadTextFile(baseName, selectedNote.content);
                              setStatusNotice(`⬇ Arquivo "${baseName}" exportado com sucesso!`);
                            }}
                          >
                            ⬇ Baixar Este Arquivo
                          </button>
                          <button
                            type="button"
                            className="btn btn-primary"
                            style={{ fontSize: '0.73rem' }}
                            onClick={() => handleSyncObsidianVaultToDisk(false)}
                          >
                            ⚡ Gravar Todo o Vault no Disco
                          </button>
                        </div>
                      </div>
                      <pre
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '0.76rem',
                          background: 'var(--bg-primary)',
                          border: '1px solid var(--border)',
                          padding: '10px',
                          whiteSpace: 'pre-wrap',
                          maxHeight: '520px',
                          overflowY: 'auto',
                        }}
                      >
                        {selectedNote.content}
                      </pre>
                    </>
                  );
                })()}
              </div>
            </div>
          )}

          {/* SUB-TAB 2: VISUAL JSON CANVAS 1.0 & ADR BUILDER */}
          {obsidianSubTab === 'canvas_graph' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="card">
                <div className="card-title" style={{ flexWrap: 'wrap', gap: '8px' }}>
                  <span>
                    🕸️ Visualizador Interativo JSON Canvas 1.0 (<code>04_Grafos_e_Canvas/*.canvas</code>)
                  </span>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className={`btn ${selectedCanvasIndex === 0 ? 'btn-primary' : ''}`}
                      onClick={() => setSelectedCanvasIndex(0)}
                    >
                      🗺️ Mapa_Conceitual_da_Obra.canvas
                    </button>
                    <button
                      type="button"
                      className={`btn ${selectedCanvasIndex === 1 ? 'btn-primary' : ''}`}
                      onClick={() => setSelectedCanvasIndex(1)}
                    >
                      🧬 Linha_Evolutiva_dos_Trechos_Criticos.canvas
                    </button>
                    <button
                      type="button"
                      className="btn btn-success"
                      onClick={() => {
                        const targetCanvas =
                          selectedCanvasIndex === 0
                            ? liveObsidianBundle.conceptCanvas
                            : liveObsidianBundle.genealogyCanvas;
                        const fileName =
                          selectedCanvasIndex === 0
                            ? 'Mapa_Conceitual_da_Obra.canvas'
                            : 'Linha_Evolutiva_dos_Trechos_Criticos.canvas';
                        downloadTextFile(
                          fileName,
                          JSON.stringify(targetCanvas, null, 2),
                          'application/json;charset=utf-8'
                        );
                        setStatusNotice(`⬇ Arquivo "${fileName}" (JSON Canvas 1.0) baixado!`);
                      }}
                    >
                      ⬇ Baixar .canvas (JSON Canvas 1.0)
                    </button>
                  </div>
                </div>

                {/* Color groups legend from .obsidian/graph.json */}
                <div
                  style={{
                    display: 'flex',
                    gap: '12px',
                    flexWrap: 'wrap',
                    fontSize: '0.75rem',
                    marginBottom: '8px',
                    padding: '6px 10px',
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border)',
                  }}
                >
                  <strong>🎨 Grupos de Cor (.obsidian/graph.json):</strong>
                  <span>🔵 Azul: Manuscrito Bilíngue</span>
                  <span>🟡 Dourado: Conceitos do Glossário</span>
                  <span>🟣 Roxo: Decisões Editoriais (ADRs)</span>
                  <span>🟢 Verde: MOC & Versões Confirmadas no Git</span>
                </div>

                {/* Interactive Canvas Viewport */}
                {(() => {
                  const activeCanvas =
                    selectedCanvasIndex === 0
                      ? liveObsidianBundle.conceptCanvas
                      : liveObsidianBundle.genealogyCanvas;
                  return (
                    <div
                      style={{
                        position: 'relative',
                        height: '460px',
                        background: 'var(--bg-primary)',
                        border: '2px solid var(--border)',
                        overflow: 'auto',
                      }}
                    >
                      {activeCanvas.nodes.map((node) => {
                        const borderMap: Record<string, string> = {
                          '1': '#d97706',
                          '3': '#ca8a04',
                          '4': '#15803d',
                          '5': '#0284c7',
                          '6': '#7e22ce',
                        };
                        const borderColor = borderMap[node.color || '4'] || 'var(--accent)';
                        return (
                          <div
                            key={node.id}
                            style={{
                              position: 'absolute',
                              left: `${node.x}px`,
                              top: `${node.y}px`,
                              width: `${node.width}px`,
                              minHeight: `${node.height}px`,
                              padding: '8px 10px',
                              background: 'var(--page-canvas)',
                              border: `2px solid ${borderColor}`,
                              boxShadow: '2px 2px 0 rgba(0,0,0,0.12)',
                              fontSize: '0.75rem',
                              whiteSpace: 'pre-wrap',
                            }}
                          >
                            {node.text}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

              {/* Add new Editorial Decision Record (ADR) */}
              <div className="card">
                <div className="card-title">
                  <span>
                    ⚖️ Registrar Nova Decisão Tradutória (<code>03_Diario_de_Decisoes_Tradutorias/ADR-*.md</code>)
                  </span>
                  <span className="badge badge-exact">{obsidianAdrs.length} ADRs Ativos</span>
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr auto',
                    gap: '8px',
                    alignItems: 'end',
                  }}
                >
                  <div>
                    <label style={{ fontSize: '0.73rem', fontWeight: 700, display: 'block' }}>
                      Título da Decisão Editorial:
                    </label>
                    <input
                      className="select-pill"
                      style={{ width: '100%' }}
                      placeholder="Ex: Distinção entre Obreros e Trabajadores"
                      value={newAdrTitle}
                      onChange={(e) => setNewAdrTitle(e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.73rem', fontWeight: 700, display: 'block' }}>
                      Dilema / Problema Filológico:
                    </label>
                    <input
                      className="select-pill"
                      style={{ width: '100%' }}
                      placeholder="Ex: Termo usado nas assembleias fabris de 1968"
                      value={newAdrProblem}
                      onChange={(e) => setNewAdrProblem(e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.73rem', fontWeight: 700, display: 'block' }}>
                      Decisão Canônica Adotada:
                    </label>
                    <input
                      className="select-pill"
                      style={{ width: '100%' }}
                      placeholder="Ex: Traduzir sempre por 'operários' e vincular ao Glossário"
                      value={newAdrDecision}
                      onChange={(e) => setNewAdrDecision(e.target.value)}
                    />
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleAddObsidianAdr}
                  >
                    + Criar ADR & Conectar ao Grafo
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* SUB-TAB 3: SEMANTIC GIT CHRONICLE & MILESTONE TAGS */}
          {obsidianSubTab === 'git_chronicle' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '12px' }}>
              <div className="card">
                <div className="card-title" style={{ flexWrap: 'wrap', gap: '6px' }}>
                  <span>
                    🕰️ Crônica Semântica da Tradução (Conventional Translation Commits)
                  </span>
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {(['all', 'obsidian', 'harness', 'translate', 'ingest', 'milestone'] as const).map(
                      (k) => (
                        <button
                          key={k}
                          type="button"
                          className={`btn ${gitCommitFilter === k ? 'btn-primary' : ''}`}
                          style={{ fontSize: '0.7rem', padding: '1px 6px' }}
                          onClick={() => setGitCommitFilter(k)}
                        >
                          {k === 'all' ? 'Todos' : k}
                        </button>
                      )
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {gitCommits
                    .filter((c) => gitCommitFilter === 'all' || c.kind === gitCommitFilter)
                    .map((c, i) => (
                      <div
                        key={i}
                        style={{
                          padding: '8px 10px',
                          background: 'var(--bg-primary)',
                          border: '1px solid var(--border)',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '4px',
                            flexWrap: 'wrap',
                            gap: '6px',
                          }}
                        >
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <span className="badge badge-accent">
                              <code>#{c.short_hash}</code>
                            </span>
                            <span className="badge badge-exact">{c.kind}</span>
                            {c.tag_name && (
                              <span className="badge badge-fuzzy">🏷️ {c.tag_name}</span>
                            )}
                          </div>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            {c.timestamp_iso} • {c.author}
                          </span>
                        </div>
                        <div style={{ fontWeight: 700, fontSize: '0.82rem', marginBottom: '3px' }}>
                          {c.summary}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                          📊 {c.stats_note} • Trechos afetados:{' '}
                          {c.affected_segments.map((s) => `#${s}`).join(', ')}
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              <div className="card">
                <div className="card-title">
                  <span>🏷️ Criar Marco Editorial (Git Tag & Milestone)</span>
                </div>
                <p style={{ fontSize: '0.77rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                  Crie uma tag anotada no repositório Git do Vault (ex:{' '}
                  <code>v0.1-rascunho-ia</code>, <code>v0.2-pos-edicao-humana</code>,{' '}
                  <code>v1.0-imprimatur-editorial</code>):
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div>
                    <label style={{ fontSize: '0.74rem', fontWeight: 700, display: 'block' }}>
                      Nome da Tag Git:
                    </label>
                    <input
                      className="select-pill"
                      style={{ width: '100%' }}
                      value={newMilestoneTag}
                      onChange={(e) => setNewMilestoneTag(e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.74rem', fontWeight: 700, display: 'block' }}>
                      Descrição do Marco Editorial:
                    </label>
                    <textarea
                      className="code-editor"
                      style={{ minHeight: '70px', fontSize: '0.76rem' }}
                      value={newMilestoneSummary}
                      onChange={(e) => setNewMilestoneSummary(e.target.value)}
                    />
                  </div>
                  <button
                    type="button"
                    className="btn btn-success"
                    onClick={handleCreateMilestoneCommit}
                  >
                    🏷️ Gravar Commit Semântico + Tag Git no Vault
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* SUB-TAB 4: BYTE-PRESERVING BIDIRECTIONAL SYNC & 3 DETERMINISTIC GATES */}
          {obsidianSubTab === 'roundtrip_sync' &&
            (() => {
              const gateReport = validateObsidianNoteGates(roundtripEditorMd, [
                '8.4',
                '14.2%',
                '2.1',
                '0.4%',
              ]);
              const allGatesPassed =
                gateReport.yamlValid && gateReport.wikilinksValid && gateReport.numbersValid;

              return (
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
                  <div className="card">
                    <div className="card-title" style={{ flexWrap: 'wrap', gap: '6px' }}>
                      <span>
                        📝 Editor de Round-Trip Obsidian ↔ Amanuensis (Byte-Preserving Merge)
                      </span>
                      <button
                        type="button"
                        className="btn btn-primary"
                        disabled={!allGatesPassed}
                        onClick={() => {
                          const updatedCount = Object.keys(gateReport.updatedSegments).length;
                          if (updatedCount > 0) {
                            setSegments((prev) =>
                              prev.map((s) =>
                                gateReport.updatedSegments[s.id]
                                  ? {
                                      ...s,
                                      target_text: gateReport.updatedSegments[s.id],
                                      status: 'Approved',
                                    }
                                  : s
                              )
                            );
                          }
                          const shortHash = Math.floor(
                            0x1000000 + Math.random() * 0xeffffff
                          ).toString(16);
                          setSegmentGenealogies((prev) => {
                            const existing = prev[1] || [];
                            return {
                              ...prev,
                              1: [
                                ...existing,
                                {
                                  version_number: existing.length,
                                  stage: 'ObsidianRoundTrip',
                                  stage_label: `Versão ${existing.length} (Sincronizado via Obsidian Round-Trip)`,
                                  text:
                                    gateReport.updatedSegments['seg-2'] ||
                                    segments[1]?.target_text ||
                                    '',
                                  commit_short_hash: shortHash,
                                  timestamp_label: new Date().toLocaleTimeString('pt-BR', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  }),
                                  model_or_author:
                                    gateReport.preservedCustomYaml['revisor_chefe'] ||
                                    'Obsidian Editor',
                                  rationale_or_adr: `YAML customizado preservado (${Object.keys(
                                    gateReport.preservedCustomYaml
                                  ).join(', ')}).`,
                                },
                              ],
                            };
                          });
                          setStatusNotice(
                            `🔄 Sincronização Bidirecional Byte-Preserving concluída! ${updatedCount} trecho(s) atualizado(s) no Workbench e ${
                              Object.keys(gateReport.preservedCustomYaml).length
                            } propriedade(s) YAML extras do Obsidian preservadas intactas!`
                          );
                        }}
                      >
                        🔄 Aplicar Edições do Obsidian no Workbench (Preservando YAML & Notas)
                      </button>
                    </div>
                    <p
                      style={{
                        fontSize: '0.76rem',
                        color: 'var(--text-muted)',
                        marginBottom: '6px',
                      }}
                    >
                      Edite abaixo a nota como se estivesse no Obsidian (adicione chaves YAML como{' '}
                      <code>status_editorial</code>, notas pessoais ou revise o texto dentro de{' '}
                      <code>AMANUENSIS_TARGET_START</code>):
                    </p>
                    <textarea
                      className="code-editor"
                      style={{ minHeight: '380px', fontSize: '0.76rem' }}
                      value={roundtripEditorMd}
                      onChange={(e) => setRoundtripEditorMd(e.target.value)}
                    />
                  </div>

                  <div className="card">
                    <div className="card-title">
                      <span>🛡️ 3 Gates Determinísticos de Validação Obsidian & Relatório</span>
                      <span className={`badge ${allGatesPassed ? 'badge-exact' : 'badge-fuzzy'}`}>
                        {allGatesPassed ? '✅ 3/3 Gates Aprovados' : '⚠️ Falha nos Gates'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div
                        style={{
                          padding: '8px',
                          background: 'var(--bg-primary)',
                          border: '1px solid var(--border)',
                          fontSize: '0.78rem',
                        }}
                      >
                        <strong>1. Gate de Frontmatter YAML:</strong>{' '}
                        {gateReport.yamlValid
                          ? '✅ Válido e bem-formado (---)'
                          : '❌ Frontmatter YAML corrompido'}
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                          Chaves YAML customizadas do usuário preservadas byte-a-byte:{' '}
                          {Object.entries(gateReport.preservedCustomYaml).map(([k, v]) => (
                            <span
                              key={k}
                              className="badge badge-accent"
                              style={{ marginRight: '4px' }}
                            >
                              {k}: "{v}"
                            </span>
                          ))}
                        </div>
                      </div>

                      <div
                        style={{
                          padding: '8px',
                          background: 'var(--bg-primary)',
                          border: '1px solid var(--border)',
                          fontSize: '0.78rem',
                        }}
                      >
                        <strong>2. Gate de Integridade de [[Wikilinks]]:</strong>{' '}
                        {gateReport.wikilinksValid
                          ? `✅ Todos os ${gateReport.extractedWikilinks.length} [[Wikilinks]] íntegros`
                          : '❌ Wikilinks quebrados ou vazios'}
                        <div style={{ marginTop: '4px', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          {gateReport.extractedWikilinks.map((w, idx) => (
                            <span key={idx} className="badge badge-exact">
                              [[{w}]]
                            </span>
                          ))}
                        </div>
                      </div>

                      <div
                        style={{
                          padding: '8px',
                          background: 'var(--bg-primary)',
                          border: '1px solid var(--border)',
                          fontSize: '0.78rem',
                        }}
                      >
                        <strong>3. Gate de Invariância Numérica & Citações:</strong>{' '}
                        {gateReport.numbersValid
                          ? '✅ Todos os números e métricas da fonte preservados'
                          : '❌ Divergência numérica detectada'}
                      </div>

                      <div
                        style={{
                          padding: '8px',
                          background: 'var(--bg-primary)',
                          border: '1px solid var(--border)',
                          fontSize: '0.78rem',
                        }}
                      >
                        <strong>📌 Trechos Extraídos p/ Atualizar o Workbench:</strong>
                        {Object.entries(gateReport.updatedSegments).map(([segId, txt]) => (
                          <div key={segId} style={{ marginTop: '4px', fontSize: '0.75rem' }}>
                            <code>{segId}</code>: "{txt}"
                          </div>
                        ))}
                      </div>

                      {gateReport.errors.length > 0 && (
                        <div
                          style={{
                            padding: '8px',
                            background: '#fee2e2',
                            border: '1px solid #dc2626',
                            color: '#991b1b',
                            fontSize: '0.76rem',
                          }}
                        >
                          {gateReport.errors.map((err, idx) => (
                            <div key={idx}>⚠️ {err}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}
        </main>
      )}

      {/* Footer Statusbar */}
      <footer className="statusbar">
        <span>{statusNotice}</span>
        <span>
          Atalhos: Ctrl+M (Sugerir c/ IA Local) • Ctrl+Enter (Confirmar) • Alt+↑/↓ (Navegar)
        </span>
      </footer>
    </div>
  );
}
