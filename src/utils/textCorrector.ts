/**
 * Utilitário de Corretor Automático Ortográfico e Acentuação para a Língua Portuguesa
 * Especializado em Nomes Próprios, Sobrenomes e Nomes de Empresas/Instituições Brasileiras.
 */

// Dicionário de Nomes e Sobrenomes mais comuns no Brasil com acentuação correta
const NAMES_DICTIONARY: Record<string, string> = {
  // Nomes Próprios
  'JOAO': 'JOÃO',
  'JOSE': 'JOSÉ',
  'ANTONIO': 'ANTÔNIO',
  'MARCIO': 'MÁRCIO',
  'MARCIA': 'MÁRCIA',
  'FABIO': 'FÁBIO',
  'FABIA': 'FÁBIA',
  'SERGIO': 'SÉRGIO',
  'CLAUDIO': 'CLÁUDIO',
  'CLAUDIA': 'CLÁUDIA',
  'FLAVIO': 'FLÁVIO',
  'FLAVIA': 'FLÁVIA',
  'JULIO': 'JÚLIO',
  'JULIA': 'JÚLIA',
  'LUCIO': 'LÚCIO',
  'LUCIA': 'LÚCIA',
  'CELIO': 'CÉLIO',
  'CELIA': 'CÉLIA',
  'HELIO': 'HÉLIO',
  'HELIA': 'HÉLIA',
  'REGIS': 'RÉGIS',
  'ROGERIO': 'ROGÉRIO',
  'VALERIO': 'VALÉRIO',
  'VALERIA': 'VALÉRIA',
  'OTAVIO': 'OTÁVIO',
  'OTAVIA': 'OTÁVIA',
  'CESAR': 'CÉSAR',
  'INACIO': 'INÁCIO',
  'DARIO': 'DÁRIO',
  'MARIO': 'MÁRIO',
  'TULIO': 'TÚLIO',
  'SILVIO': 'SÍLVIO',
  'SILVIA': 'SÍLVIA',
  'DECIO': 'DÉCIO',
  'PLINIO': 'PLÍNIO',
  'FABRICIO': 'FABRÍCIO',
  'PATRICIA': 'PATRÍCIA',
  'LETICIA': 'LETÍCIA',
  'LAERCIO': 'LAÉRCIO',
  'MAURICIO': 'MAURÍCIO',
  'ALUIZIO': 'ALUÍZIO',
  'ALUISIO': 'ALUÍSIO',
  'DIONISIO': 'DIONÍSIO',
  'BONIFACIO': 'BONIFÁCIO',
  'AMALIA': 'AMÁLIA',
  'CECILIA': 'CECÍLIA',
  'EULALIA': 'EULÁLIA',
  'EMILIA': 'EMÍLIA',
  'NATALIA': 'NATÁLIA',
  'ROSALIA': 'ROSÁLIA',
  'VITORIA': 'VITÓRIA',
  'GLORIA': 'GLÓRIA',
  'SONIA': 'SÔNIA',
  'TANIA': 'TÂNIA',
  'MONICA': 'MÔNICA',
  'VERONICA': 'VERÔNICA',
  'MIRIAN': 'MÍRIAN',
  'MIRIAM': 'MÍRIAM',
  'ANDRE': 'ANDRÉ',
  'RENE': 'RENÉ',
  'TOME': 'TOMÉ',
  'MOISES': 'MOISÉS',
  'EDIPO': 'ÉDIPO',
  'ILIDIO': 'ILÍDIO',
  'ERICO': 'ÉRICO',
  'LUIS': 'LUÍS',
  'ALVARO': 'ÁLVARO',
  'AVILA': 'ÁVILA',
  'ITALO': 'ÍTALO',
  'AMERICO': 'AMÉRICO',
  'CLEBER': 'CLÉBER',
  'KLEBER': 'KLÉBER',
  'AILTON': 'AÍLTON',
  'RUBENS': 'RÚBENS',
  'SEBASTIAO': 'SEBASTIÃO',
  'DAMIAO': 'DAMIÃO',
  'ESTEVAO': 'ESTEVÃO',
  'SIMAO': 'SIMÃO',
  'CRISTOVAO': 'CRISTÓVÃO',
  'LIVIA': 'LÍVIA',
  'CLETO': 'CLÉTO',
  'EUNICE': 'EUNICE',
  'HELENA': 'HELENA',

  // Sobrenomes e Nomes de Família
  'CONCEICAO': 'CONCEIÇÃO',
  'ARAUJO': 'ARAÚJO',
  'SA': 'SÁ',
  'MAGALHAES': 'MAGALHÃES',
  'GUIMARAES': 'GUIMARÃES',
  'FRANCA': 'FRANÇA',
  'ALCANTARA': 'ALCÂNTARA',
  'CAMARA': 'CÂMARA',
  'BELEM': 'BELÉM',
  'CORREA': 'CORRÊA',
  'GONCALVES': 'GONÇALVES',
  'FALCAO': 'FALCÃO',
  'BRANDAO': 'BRANDÃO',
  'LEAO': 'LEÃO',
  'SERRAO': 'SERRÃO',
  'MOURAO': 'MOURÃO',
  'SIMOES': 'SIMÕES',
  'TAVORA': 'TÁVORA',
  'ASSUNCAO': 'ASSUNÇÃO',
  'ANUNCIACAO': 'ANUNCIAÇÃO',
  'ASCENSAO': 'ASCENSÃO',
  'ENCARNACAO': 'ENCARNAÇÃO',
  'PAIXAO': 'PAIXÃO',
  'CANCAO': 'CANÇÃO',
  'GASPAR': 'GASPAR',
  'LOBAO': 'LOBÃO',
  'TORRAO': 'TORRÃO',
  'GALVAO': 'GALVÃO',
  'GUSAO': 'GUSMÃO',
  'GUSMAO': 'GUSMÃO',
  'RODAO': 'RODÃO',
  'BRAGANCA': 'BRAGANÇA',
  'ABREU': 'ABREU',
};

// Dicionário de Termos Corporativos, Comerciais e Institucionais
const CORPORATE_DICTIONARY: Record<string, string> = {
  // Atividades e Setores
  'COMERCIO': 'COMÉRCIO',
  'INDUSTRIA': 'INDÚSTRIA',
  'INDUSTRIAS': 'INDÚSTRIAS',
  'SERVICO': 'SERVIÇO',
  'SERVICOS': 'SERVIÇOS',
  'INFORMATICA': 'INFORMÁTICA',
  'LOGISTICA': 'LOGÍSTICA',
  'ELETRICA': 'ELÉTRICA',
  'ELETRICO': 'ELÉTRICO',
  'ELETRICOS': 'ELÉTRICOS',
  'ELETRICAS': 'ELÉTRICAS',
  'ELETRONICA': 'ELETRÔNICA',
  'ELETRONICOS': 'ELETRÔNICOS',
  'MECANICA': 'MECÂNICA',
  'QUIMICA': 'QUÍMICA',
  'QUIMICO': 'QUÍMICO',
  'QUIMICOS': 'QUÍMICOS',
  'FARMACEUTICA': 'FARMACÊUTICA',
  'FARMACEUTICOS': 'FARMACÊUTICOS',
  'FARMACIA': 'FARMÁCIA',
  'FARMACIAS': 'FARMÁCIAS',
  'SAUDE': 'SAÚDE',
  'MEDICA': 'MÉDICA',
  'MEDICO': 'MÉDICO',
  'MEDICOS': 'MÉDICOS',
  'CLINICA': 'CLÍNICA',
  'CLINICAS': 'CLÍNICAS',
  'LABORATORIO': 'LABORATÓRIO',
  'LABORATORIOS': 'LABORATÓRIOS',
  'DIAGNOSTICO': 'DIAGNÓSTICO',
  'DIAGNOSTICOS': 'DIAGNÓSTICOS',
  'OTICA': 'ÓTICA',
  'OPTICA': 'ÓPTICA',
  'OTICAS': 'ÓTICAS',
  'GRAFICA': 'GRÁFICA',
  'GRAFICAS': 'GRÁFICAS',
  'COMUNICACAO': 'COMUNICAÇÃO',
  'TELECOMUNICACOES': 'TELECOMUNICAÇÕES',
  'TELECOMUNICACAO': 'TELECOMUNICAÇÃO',
  'SOLUCOES': 'SOLUÇÕES',
  'CONSTRUCAO': 'CONSTRUÇÃO',
  'CONSTRUCOES': 'CONSTRUÇÕES',
  'IMOBILIARIA': 'IMOBILIÁRIA',
  'IMOBILIARIAS': 'IMOBILIÁRIAS',
  'JURIDICO': 'JURÍDICO',
  'JURIDICA': 'JURÍDICA',
  'CONTABIL': 'CONTÁBIL',
  'ADMINISTRACAO': 'ADMINISTRAÇÃO',
  'GESTAO': 'GESTÃO',
  'CREDITO': 'CRÉDITO',
  'PARTICIPACOES': 'PARTICIPAÇÕES',
  'ASSOCIACAO': 'ASSOCIAÇÃO',
  'FUNDACAO': 'FUNDAÇÃO',
  'FEDERACAO': 'FEDERAÇÃO',
  'CONFEDERACAO': 'CONFEDERAÇÃO',
  'EDUCACAO': 'EDUCAÇÃO',
  'COLEGIO': 'COLÉGIO',
  'MUNICIPIO': 'MUNICÍPIO',
  'MINISTERIO': 'MINISTÉRIO',
  'PUBLICO': 'PÚBLICO',
  'PUBLICA': 'PÚBLICA',
  'PUBLICOS': 'PÚBLICOS',
  'PUBLICAS': 'PÚBLICAS',
  'AGENCIA': 'AGÊNCIA',
  'NUCLEO': 'NÚCLEO',
  'POLICIA': 'POLÍCIA',
  'TRANSITO': 'TRÂNSITO',
  'VIACAO': 'VIAÇÃO',
  'DISTRIBUICAO': 'DISTRIBUIÇÃO',
  'NUTRICAO': 'NUTRIÇÃO',
  'REFEICOES': 'REFEIÇÕES',
  'PANIFICACAO': 'PANIFICAÇÃO',
  'AGROPECUARIA': 'AGROPECUÁRIA',
  'AGRICOLA': 'AGRÍCOLA',
  'AGRICOLAS': 'AGRÍCOLAS',
  'PECUARIA': 'PECUÁRIA',
  'VETERINARIA': 'VETERINÁRIA',
  'ECOLOGICA': 'ECOLÓGICA',
  'HIDRAULICA': 'HIDRÁULICA',
  'PNEUMATICA': 'PNEUMÁTICA',
  'TEXTIL': 'TÊXTIL',
  'CALCADOS': 'CALÇADOS',
  'METALURGICA': 'METALÚRGICA',
  'METALURGICO': 'METALÚRGICO',
  'SIDERURGICA': 'SIDERÚRGICA',
  'MINERACAO': 'MINERAÇÃO',
  'PETROLEO': 'PETRÓLEO',
  'GAS': 'GÁS',
  'AGUA': 'ÁGUA',
  'AGUAS': 'ÁGUAS',
  'SEGURANCA': 'SEGURANÇA',
  'VIGILANCIA': 'VIGILÂNCIA',
  'CONSERVACAO': 'CONSERVAÇÃO',
  'GRAOS': 'GRÃOS',
  'UNIAO': 'UNIÃO',
  'ESPIRITO': 'ESPÍRITO',
  'SAO': 'SÃO',
  'EXPEDICAO': 'EXPEDIÇÃO',
  'PRODUCAO': 'PRODUÇÃO',
  'AUTOMACAO': 'AUTOMAÇÃO',
  'MANUTENCAO': 'MANUTENÇÃO',
  'IMPORTACAO': 'IMPORTAÇÃO',
  'EXPORTACAO': 'EXPORTAÇÃO',
  'INSTALACAO': 'INSTALAÇÃO',
  'INSTALACOES': 'INSTALAÇÕES',
  'CAPACITACAO': 'CAPACITAÇÃO',
  'AVALIACAO': 'AVALIAÇÃO',
  'PREVENCAO': 'PREVENÇÃO',
  'ATENCAO': 'ATENÇÃO',
  'OPERACAO': 'OPERAÇÃO',
  'OPERACOES': 'OPERAÇÕES',
  'HABITACAO': 'HABITAÇÃO',
  'LOCACAO': 'LOCAÇÃO',
  'RENOVACAO': 'RENOVAÇÃO',
  'CONCESSAO': 'CONCESSÃO',
  'TRANSMISSAO': 'TRANSMISSÃO',
  'DISTRIBUICOES': 'DISTRIBUIÇÕES',
  'FUNDICOES': 'FUNDIÇÕES',
  'FUNDICAO': 'FUNDIÇÃO',
  'ACUCAR': 'AÇÚCAR',
  'ALCOOL': 'ÁLCOOL',
  'ALGODAO': 'ALGODÃO',
  'CAFE': 'CAFÉ',
  'CARVAO': 'CARVÃO',
  'COOP': 'COOP',
};

// Dicionário Unificado
const FULL_DICTIONARY: Record<string, string> = {
  ...NAMES_DICTIONARY,
  ...CORPORATE_DICTIONARY,
};

/**
 * Remove acentos de uma palavra para pesquisa no dicionário sem acentos
 */
function removeAccents(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Aplica regras morfológicas comuns do português para palavras que não estão no dicionário
 */
function applyPortugueseMorphologyRules(word: string): string {
  const upper = word.toUpperCase();
  const rawWithoutAccents = removeAccents(upper);

  // Se já tem acento original mantido, não sobrescrever se for válido
  if (upper !== rawWithoutAccents) {
    return upper;
  }

  // 1. Terminações comuns em -CAO -> -ÇÃO (mínimo 4 letras: AÇÃO, ELEIÇÃO, ATENÇÃO...)
  if (rawWithoutAccents.length >= 4 && rawWithoutAccents.endsWith('CAO')) {
    // Exceções conhecidas: VULCAO -> VULCÃO (não vulção)
    if (rawWithoutAccents === 'VULCAO') return 'VULCÃO';
    return rawWithoutAccents.slice(0, -3) + 'ÇÃO';
  }

  // 2. Terminações em -COES -> -ÇÕES (ex: SOLUCOES -> SOLUÇÕES)
  if (rawWithoutAccents.length >= 5 && rawWithoutAccents.endsWith('COES')) {
    return rawWithoutAccents.slice(0, -4) + 'ÇÕES';
  }

  // 3. Terminações em -SOES -> -SÕES (ex: DECISOES -> DECISÕES, EMISSOES -> EMISSÕES)
  if (rawWithoutAccents.length >= 5 && rawWithoutAccents.endsWith('SOES')) {
    return rawWithoutAccents.slice(0, -4) + 'SÕES';
  }

  // 4. Terminações em -ZOES -> -ZÕES (ex: RAZOES -> RAZÕES)
  if (rawWithoutAccents.length >= 5 && rawWithoutAccents.endsWith('ZOES')) {
    return rawWithoutAccents.slice(0, -4) + 'ZÕES';
  }

  // 5. Terminações em -IAO -> -IÃO (ex: JOAO tratado acima; REGIAO -> REGIÃO, UNIAO -> UNIÃO, REUNIAO -> REUNIÃO)
  if (rawWithoutAccents.length >= 4 && rawWithoutAccents.endsWith('IAO')) {
    return rawWithoutAccents.slice(0, -3) + 'IÃO';
  }

  // 6. Terminações em -TICA / -TICO proparoxítonas comuns em empresas (ex: LOGISTICA -> LOGÍSTICA, INFORMATICA -> INFORMÁTICA)
  // Já cobertas no dicionário, mas caso apareçam derivadas:
  if (rawWithoutAccents.endsWith('LOGICA')) {
    return rawWithoutAccents.slice(0, -6) + 'LÓGICA';
  }
  if (rawWithoutAccents.endsWith('LOGICO')) {
    return rawWithoutAccents.slice(0, -6) + 'LÓGICO';
  }

  return upper;
}

/**
 * Corrige uma única palavra de acordo com o dicionário e regras ortográficas do Português.
 * Preserva caracteres especiais ou pontuação adjacente (ex: "S/A", "LTDA.", "(PETROBRAS)")
 */
export function correctWord(word: string): string {
  if (!word) return '';

  // Separa pontuações iniciais e finais (ex: "(COMERCIO," -> "(", "COMERCIO", ",")
  const match = word.match(/^([^a-zA-Z0-9À-ÿ]*)([a-zA-Z0-9À-ÿ]+)([^a-zA-Z0-9À-ÿ]*)$/);
  if (!match) {
    return word.toUpperCase();
  }

  const [, leadingPunct, coreWord, trailingPunct] = match;
  const coreUpper = coreWord.toUpperCase();
  const normalizedCore = removeAccents(coreUpper);

  // 1. Verifica no dicionário direto
  if (FULL_DICTIONARY[normalizedCore]) {
    return leadingPunct + FULL_DICTIONARY[normalizedCore] + trailingPunct;
  }

  // 2. Aplica regras fonéticas e morfológicas do Português
  const morphological = applyPortugueseMorphologyRules(coreUpper);

  return leadingPunct + morphological + trailingPunct;
}

/**
 * Corrige e acentua automaticamente frases completas (Nome Completo, Razão Social, Empresa).
 * - Transforma em letras maiúsculas
 * - Corrige e insere acentuação automática nas palavras
 * - Normaliza espaços duplos
 */
export function autoCorrectAndAccent(text: string): string {
  if (!text) return '';

  // Normaliza espaços duplos
  const cleanSpaces = text.replace(/\s+/g, ' ');

  // Separa palavras preservando espaços
  const tokens = cleanSpaces.split(' ');
  const correctedTokens = tokens.map((token) => {
    // Se for preposição comum em minúscula ou maiúscula (DE, DA, DO, DOS, DAS, E)
    const upper = token.toUpperCase();
    if (['DE', 'DA', 'DO', 'DOS', 'DAS', 'E', 'EM', 'POR', 'COM', 'SEM'].includes(upper)) {
      return upper;
    }
    return correctWord(token);
  });

  return correctedTokens.join(' ');
}

/**
 * Informa se um determinado texto possui alguma sugestão de acentuação/correção
 */
export function hasCorrectionSuggestion(text: string): boolean {
  if (!text) return false;
  const corrected = autoCorrectAndAccent(text);
  return corrected !== text.toUpperCase();
}

/**
 * Normaliza o nome para verificação de duplicidade (ignora acentos, caixa alta/baixa e múltiplos espaços)
 */
export function normalizeNameForComparison(name: string): string {
  if (!name) return '';
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Validação rigorosa de Nome Completo:
 * Exige obrigatoriamente nome e pelo menos um sobrenome (mínimo de 2 partes com caracteres válidos).
 */
export function isValidFullName(name: string): { valid: boolean; error?: string } {
  if (!name || typeof name !== 'string') {
    return { valid: false, error: 'O nome completo é obrigatório.' };
  }

  const trimmed = name.trim();
  if (trimmed.length < 3) {
    return { valid: false, error: 'O nome completo deve conter no mínimo 3 caracteres.' };
  }

  // Divide pelas palavras
  const words = trimmed.split(/\s+/).filter((w) => w.length > 0);

  if (words.length < 2) {
    return {
      valid: false,
      error: 'Por favor, informe o nome completo (nome e sobrenome). Não é permitido realizar a inscrição com apenas o primeiro nome.',
    };
  }

  // Preposições permitidas de 1 letra como 'e'/'E', as demais partes devem ter pelo menos 2 letras
  const validWords = words.filter((w) => w.length >= 2 || ['e', 'E'].includes(w));
  if (validWords.length < 2) {
    return {
      valid: false,
      error: 'Por favor, informe um sobrenome válido com pelo menos duas letras.',
    };
  }

  return { valid: true };
}
