/**
 * SDI v4 — Pesos e Constantes de Segurança
 *
 * Este arquivo define os pesos por seção, fatores por tipo de unidade,
 * faixas de classificação e a lógica de pontuação invertida.
 */

// ─── PESOS POR SEÇÃO (MPSC) ─────────────────────────────────────────────────

export const SECTION_WEIGHTS_MPSC: Record<number, { name: string; weight: number }> = {
  1: { name: "Segurança Perimetral", weight: 4 },
  2: { name: "Acessos Diretos (Portas e Entradas)", weight: 5 },
  3: { name: "Janelas e Aberturas", weight: 3 },
  4: { name: "Sistemas Eletrônicos de Segurança", weight: 5 },
  5: { name: "Iluminação e Sinalização", weight: 3 },
  6: { name: "Segurança Contra Incêndio", weight: 4 },
  7: { name: "Segurança da Informação (Física)", weight: 4 },
  8: { name: "Procedimentos Operacionais de Segurança", weight: 5 },
  9: { name: "Impactos Climáticos e Ambientais", weight: 4 },
};

// ─── PESOS POR SEÇÃO (RESIDENCIAL) ──────────────────────────────────────────

export const SECTION_WEIGHTS_RESIDENCIAL: Record<number, { name: string; weight: number }> = {
  1: { name: "Segurança Perimetral", weight: 1 },
  2: { name: "Acessos Diretos (Portas)", weight: 1 },
  3: { name: "Janelas e Aberturas", weight: 1 },
  4: { name: "Sistemas Eletrônicos de Segurança", weight: 1 },
  5: { name: "Iluminação e Visibilidade", weight: 1 },
  6: { name: "Procedimentos e Hábitos de Segurança", weight: 1 },
};

// ─── FATORES POR TIPO DE UNIDADE ─────────────────────────────────────────────
// Multiplicador aplicado ao ISI base. Unidades de maior risco recebem fator > 1
// (exigência maior), unidades de menor risco recebem fator < 1.

export const UNIT_TYPE_FACTOR: Record<string, number> = {
  GAECO: 1.5,
  Isolada: 1.3,
  Administrativo: 1.2,
  "Apoio Técnico": 0.8,
  "Fórum de Justiça": 1.0,
  "Fórum de Justiça - Ala": 1.0,
  "Fórum de Justiça - Sala de apoio": 0.8,
  Terreno: 0.5,
  Residência: 1.0,
  Outro: 1.0,
};

// ─── FAIXAS DE CLASSIFICAÇÃO ISI ─────────────────────────────────────────────

export interface ClassificationBand {
  min: number;
  max: number;
  label: string;
  color: string;
  bgColor: string;
  action: string;
}

export const CLASSIFICATION_BANDS: ClassificationBand[] = [
  {
    min: 90,
    max: 100,
    label: "Excelente",
    color: "#16a34a",
    bgColor: "#dcfce7",
    action: "Manter padrão. Revisão anual.",
  },
  {
    min: 75,
    max: 89.99,
    label: "Bom",
    color: "#65a30d",
    bgColor: "#ecfccb",
    action: "Pequenos ajustes. Revisão semestral.",
  },
  {
    min: 50,
    max: 74.99,
    label: "Regular",
    color: "#ca8a04",
    bgColor: "#fef9c3",
    action: "Plano de ação em 90 dias. Revisão trimestral.",
  },
  {
    min: 25,
    max: 49.99,
    label: "Crítico",
    color: "#ea580c",
    bgColor: "#ffedd5",
    action: "Intervenção imediata. Revisão em 30 dias.",
  },
  {
    min: 0,
    max: 24.99,
    label: "Muito Crítico",
    color: "#dc2626",
    bgColor: "#fee2e2",
    action: "Emergência. Ação corretiva em 7 dias.",
  },
];

// ─── PONTUAÇÃO POR STATUS ────────────────────────────────────────────────────

export type AnswerStatus = "Sim" | "Não" | "Parcialmente" | "N/A";

/**
 * Retorna o score numérico de uma resposta.
 *
 * @param status - A resposta dada (Sim, Não, Parcialmente, N/A)
 * @param isInverted - Se true, a pontuação é invertida:
 *   - "Sim" = 0 (indica vulnerabilidade)
 *   - "Não" = 1 (indica ausência de vulnerabilidade)
 *   - "Parcialmente" = 0.5
 *   - "N/A" = null (excluído do cálculo)
 *
 * Exemplos de itens invertidos (S9):
 * - "Possui histórico de alagamento?" → Sim = ruim (0), Não = bom (1)
 * - "Está em área de risco geológico?" → Sim = ruim (0), Não = bom (1)
 */
export function getItemScore(status: AnswerStatus, isInverted: boolean = false): number | null {
  if (status === "N/A") return null;

  if (isInverted) {
    switch (status) {
      case "Sim": return 0;       // Vulnerabilidade confirmada
      case "Não": return 1;       // Sem vulnerabilidade
      case "Parcialmente": return 0.5;
      default: return null;
    }
  }

  // Pontuação normal
  switch (status) {
    case "Sim": return 1;         // Conforme
    case "Não": return 0;         // Não conforme
    case "Parcialmente": return 0.5;
    default: return null;
  }
}

// ─── CÁLCULO DO ISI ──────────────────────────────────────────────────────────

/**
 * Fórmula do ISI (Índice de Segurança Institucional):
 *
 * ISI_base = (Σ(scoreItem × pesoSeção) / Σ(pesoSeção_aplicável)) × 100
 *
 * ISI = min(100, ISI_base × FatorTipoUnidade)
 *
 * ISI_ajustado = ISI / NívelAmeaçaLocal
 *
 * Onde:
 * - scoreItem: valor numérico da resposta (0, 0.5 ou 1), considerando inversão
 * - pesoSeção: peso da seção à qual o item pertence (1-5)
 * - FatorTipoUnidade: multiplicador baseado no tipo de unidade (0.5 a 1.5)
 * - NívelAmeaçaLocal: fator de ameaça do entorno (1.0 a 2.0)
 *
 * Itens com status "N/A" são excluídos tanto do numerador quanto do denominador.
 * Itens com isInverted=true têm a pontuação invertida antes do cálculo.
 */

export interface ISIResult {
  isiBase: number;
  isi: number;
  isiAjustado: number;
  isiProjetado: number;
  classification: ClassificationBand;
}

export function classify(score: number): ClassificationBand {
  return (
    CLASSIFICATION_BANDS.find((b) => score >= b.min && score <= b.max) ??
    CLASSIFICATION_BANDS[CLASSIFICATION_BANDS.length - 1]
  );
}

// ─── NÍVEL DE AMEAÇA LOCAL ───────────────────────────────────────────────────

export const THREAT_LEVELS: { value: number; label: string; description: string }[] = [
  { value: 1.0, label: "Baixo", description: "Área urbana central, baixa criminalidade" },
  { value: 1.2, label: "Moderado", description: "Área urbana periférica ou cidade média" },
  { value: 1.5, label: "Alto", description: "Área isolada, histórico de incidentes" },
  { value: 1.8, label: "Muito Alto", description: "Região de conflito, ameaças recorrentes" },
  { value: 2.0, label: "Extremo", description: "Ameaça direta confirmada ao membro/unidade" },
];

// ─── STATUS DE UNIDADE ───────────────────────────────────────────────────────

export const UNIT_STATUS_OPTIONS = [
  { value: "ativa", label: "Ativa", color: "#16a34a" },
  { value: "inativa", label: "Inativa", color: "#6b7280" },
  { value: "em_comissionamento", label: "Em Comissionamento", color: "#ca8a04" },
] as const;

export type UnitStatus = (typeof UNIT_STATUS_OPTIONS)[number]["value"];
