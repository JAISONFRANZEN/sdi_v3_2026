/**
 * SDI v4 — Dados estáticos do Checklist MPSC (9 seções)
 * Usado como fallback offline ou para pré-renderização.
 * A fonte primária é o banco de dados (via tRPC checklists.getFull).
 */

export interface ChecklistItem {
  id: string;
  text: string;
  isSubheading?: boolean;
  isInverted?: boolean;
}

export interface ChecklistSection {
  id: number;
  order: number;
  name: string;
  weight: number;
  items: ChecklistItem[];
}

export const CHECKLIST_MPSC: ChecklistSection[] = [
  {
    id: 1,
    order: 1,
    name: "Segurança Perimetral",
    weight: 4,
    items: [
      { id: "s1_01", text: "A edificação possui barreira perimetral (muro, grade ou cerca) em todo o perímetro?" },
      { id: "s1_02", text: "A barreira perimetral possui altura mínima de 2,5 metros?" },
      { id: "s1_03", text: "Existe elemento dissuasório no topo (concertina, cerca elétrica, lanças)?" },
      { id: "s1_04", text: "O portão de acesso de veículos é automatizado com controle de acesso?" },
      { id: "s1_05", text: "Há portaria ou recepção com controle de entrada de pessoas?" },
      { id: "s1_06", text: "O perímetro está livre de vegetação alta que facilite escalada ou ocultação?" },
      { id: "s1_07", text: "Existem pontos cegos no perímetro sem cobertura visual ou eletrônica?" },
      { id: "s1_08", text: "A iluminação perimetral é adequada e possui acionamento automático (sensor/timer)?" },
    ],
  },
  {
    id: 2,
    order: 2,
    name: "Acessos Diretos (Portas e Entradas)",
    weight: 5,
    items: [
      { id: "s2_01", text: "As portas de acesso principal possuem fechaduras de alta segurança?" },
      { id: "s2_02", text: "Existe controle de acesso eletrônico (crachá, biometria, senha) nas entradas?" },
      { id: "s2_03", text: "As portas de emergência possuem barra antipânico e alarme de abertura?" },
      { id: "s2_04", text: "Há registro (log) de entrada e saída de pessoas no edifício?" },
      { id: "s2_05", text: "As áreas restritas (gabinetes, arquivo, TI) possuem controle de acesso diferenciado?" },
      { id: "s2_06", text: "Existe procedimento formal para controle de visitantes (identificação, registro, acompanhamento)?" },
    ],
  },
  {
    id: 3,
    order: 3,
    name: "Janelas e Aberturas",
    weight: 3,
    items: [
      { id: "s3_01", text: "As janelas do pavimento térreo possuem grades, telas ou películas de segurança?" },
      { id: "s3_02", text: "As janelas possuem fechos ou travas de segurança internos?" },
      { id: "s3_03", text: "Os vidros são temperados ou laminados (resistentes a impacto)?" },
      { id: "s3_04", text: "Há aberturas (basculantes, exaustores) que permitam acesso não autorizado?" },
      { id: "s3_05", text: "As janelas de áreas sensíveis (arquivo, TI, gabinetes) possuem proteção reforçada?" },
    ],
  },
  {
    id: 4,
    order: 4,
    name: "Sistemas Eletrônicos de Segurança",
    weight: 5,
    items: [
      { id: "s4_01", text: "A unidade possui sistema de CFTV (câmeras) em funcionamento?" },
      { id: "s4_02", text: "As câmeras cobrem todos os acessos, corredores e áreas comuns?" },
      { id: "s4_03", text: "O sistema de gravação armazena imagens por no mínimo 30 dias?" },
      { id: "s4_04", text: "Existe sistema de alarme monitorado 24h?" },
      { id: "s4_05", text: "O sistema de alarme possui bateria backup (funciona sem energia elétrica)?" },
      { id: "s4_06", text: "Há botão de pânico ou acionamento silencioso disponível?" },
      { id: "s4_07", text: "Existe sensor de presença em áreas críticas (após expediente)?" },
      { id: "s4_08", text: "O sistema permite monitoramento remoto pela CISI ou empresa contratada?" },
      { id: "s4_09", text: "Há controle de acesso eletrônico integrado ao sistema de segurança?" },
      { id: "s4_10", text: "O cabeamento dos sistemas está protegido contra sabotagem (em eletrodutos)?" },
      { id: "s4_11", text: "Existe nobreak ou gerador que garanta funcionamento dos sistemas em falta de energia?" },
    ],
  },
  {
    id: 5,
    order: 5,
    name: "Iluminação e Sinalização",
    weight: 3,
    items: [
      { id: "s5_01", text: "A iluminação externa cobre toda a fachada e acessos do edifício?" },
      { id: "s5_02", text: "Há iluminação com sensor de presença nas áreas de estacionamento?" },
      { id: "s5_03", text: "A sinalização de emergência (rotas de fuga, saídas) está visível e atualizada?" },
      { id: "s5_04", text: "Existe iluminação de emergência autônoma nos corredores e escadas?" },
      { id: "s5_05", text: "A identificação do prédio (placa, número) é visível para serviços de emergência?" },
    ],
  },
  {
    id: 6,
    order: 6,
    name: "Segurança Contra Incêndio",
    weight: 4,
    items: [
      { id: "s6_01", text: "A edificação possui AVCB/CLCB (Auto de Vistoria do Corpo de Bombeiros) válido?" },
      { id: "s6_02", text: "Os extintores estão dentro da validade, sinalizados e desobstruídos?" },
      { id: "s6_03", text: "Existe sistema de hidrantes ou sprinklers conforme exigência do CBMSC?" },
      { id: "s6_04", text: "Há detectores de fumaça instalados nas áreas críticas?" },
      { id: "s6_05", text: "As rotas de fuga estão desobstruídas e sinalizadas com fotoluminescência?" },
      { id: "s6_06", text: "A brigada de incêndio está constituída e treinada (ou há responsável designado)?" },
    ],
  },
  {
    id: 7,
    order: 7,
    name: "Segurança da Informação (Física)",
    weight: 4,
    items: [
      { id: "s7_01", text: "A sala de servidores/rack de TI possui controle de acesso restrito?" },
      { id: "s7_02", text: "Há sistema de climatização adequado na sala de TI (temperatura controlada)?" },
      { id: "s7_03", text: "O cabeamento de rede está organizado, identificado e protegido?" },
      { id: "s7_04", text: "Existe política de mesa limpa e tela bloqueada implementada?" },
    ],
  },
  {
    id: 8,
    order: 8,
    name: "Procedimentos Operacionais de Segurança",
    weight: 5,
    items: [
      { id: "s8_01", text: "Existe Plano de Segurança Orgânica (PSO) formalizado para a unidade?" },
      { id: "s8_02", text: "Há procedimento escrito para situações de emergência (ameaça, invasão, incêndio)?" },
      { id: "s8_03", text: "Os servidores receberam treinamento ou orientação sobre segurança institucional?" },
      { id: "s8_04", text: "Existe canal de comunicação direto com a CISI ou segurança institucional?" },
      { id: "s8_05", text: "Há ronda ou vigilância patrimonial (própria ou terceirizada) na unidade?" },
      { id: "s8_06", text: "O controle de chaves é formalizado (registro de quem possui cópia)?" },
      { id: "s8_07", text: "Existe procedimento para abertura e fechamento da unidade (checklist diário)?" },
      { id: "s8_08", text: "Há registro de ocorrências de segurança (livro ou sistema eletrônico)?" },
    ],
  },
  {
    id: 9,
    order: 9,
    name: "Impactos Climáticos e Ambientais",
    weight: 4,
    items: [
      { id: "s9_h1", text: "9.1. Inundações e Alagamentos", isSubheading: true },
      {
        id: "s9_01",
        text: "O entorno imediato e as vias de acesso à edificação possuem histórico de alagamentos que dificultam ou impedem a chegada ao local?",
        isInverted: true,
      },
      {
        id: "s9_02",
        text: "A edificação possui histórico de inundação ou alagamento que tenha atingido o seu interior?",
        isInverted: true,
      },
      {
        id: "s9_03",
        text: "A edificação dispõe de mecanismos físicos para mitigar a entrada de água (ex: nível do piso elevado em relação à rua, comportas, bombas de sucção ou escoamento eficiente)?",
      },
      {
        id: "s9_04",
        text: "Os ativos críticos de TI (racks, switches, servidores locais) estão posicionados em andares superiores ou fixados em locais elevados (ex: próximos ao teto) para evitar danos por lâmina d'água?",
      },
      {
        id: "s9_05",
        text: "O acervo documental (arquivos físicos) está armazenado de forma segura contra inundações (em andares superiores ou sobre estrados/prateleiras elevadas)?",
      },
      { id: "s9_h2", text: "9.2. Riscos Geológicos e do Entorno", isSubheading: true },
      {
        id: "s9_06",
        text: "A edificação está localizada em encosta, área de risco geológico mapeada (Defesa Civil) ou apresenta vulnerabilidades no entorno imediato (ex: risco de deslizamento, desmoronamento de muros de arrimo ou queda de árvores de grande porte)?",
        isInverted: true,
      },
      { id: "s9_h3", text: "9.3. Riscos Atmosféricos e Estruturais", isSubheading: true },
      {
        id: "s9_07",
        text: "A edificação apresenta vulnerabilidade aparente ou histórico de danos estruturais causados por ventos fortes e ciclones extratropicais (ex: destelhamentos recorrentes, quebra de vidraças)?",
        isInverted: true,
      },
      {
        id: "s9_08",
        text: "A edificação possui Sistema de Proteção contra Descargas Atmosféricas (SPDA - Para-raios) instalado e aterramento adequado para proteger a infraestrutura elétrica e de dados?",
      },
    ],
  },
];
