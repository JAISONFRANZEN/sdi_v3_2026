import { eq, inArray } from "drizzle-orm";
import { getDb } from "./db";
import {
  answers as answersTable,
  items,
  sections,
  inspections,
} from "../drizzle/schema";

export type AnswerStatus = "Sim" | "Não" | "Parcialmente" | "N/A";

export interface Answer {
  itemId: number;
  status: AnswerStatus;
  observations?: string | null;
}

export type Priority = "alta" | "media" | "baixa";

export interface Recommendation {
  itemId: number;
  recommendationText: string;
  priority: Priority;
}

// ─── PESOS BASE ──────────────────────────────────────────────────────────────

const STATUS_WEIGHT: Record<AnswerStatus, number | null> = {
  Sim: 1,
  Parcialmente: 0.5,
  Não: 0,
  "N/A": null, // excluído do denominador
};

// ─── PONTUAÇÃO INVERTIDA ─────────────────────────────────────────────────────
// Para questões onde "Sim" indica vulnerabilidade (ex: "Possui histórico de
// alagamento?"), a pontuação é invertida: Sim=0, Não=1, Parcialmente=0.5

function getItemScore(
  status: AnswerStatus,
  isInverted: boolean
): number | null {
  if (status === "N/A") return null;

  if (isInverted) {
    switch (status) {
      case "Sim":
        return 0; // "Sim, possui vulnerabilidade" = ruim
      case "Não":
        return 1; // "Não possui vulnerabilidade" = bom
      case "Parcialmente":
        return 0.5;
      default:
        return null;
    }
  }

  return STATUS_WEIGHT[status];
}

// ─── FATORES POR TIPO DE UNIDADE ─────────────────────────────────────────────
// Fonte: isi-logica-calculo.xlsx, aba "Fatores Unidade"

const UNIT_FACTOR: Record<string, number> = {
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

// ─── CLASSIFICAÇÃO ───────────────────────────────────────────────────────────

const CLASSIFICATION_BANDS: { min: number; label: string; color: string }[] = [
  { min: 90, label: "Excelente", color: "#16a34a" },
  { min: 75, label: "Bom", color: "#65a30d" },
  { min: 50, label: "Regular", color: "#ca8a04" },
  { min: 25, label: "Crítico", color: "#ea580c" },
  { min: 0, label: "Muito Crítico", color: "#dc2626" },
];

function classify(score: number): { label: string; color: string } {
  const band =
    CLASSIFICATION_BANDS.find((b) => score >= b.min) ??
    CLASSIFICATION_BANDS[CLASSIFICATION_BANDS.length - 1];
  return { label: band.label, color: band.color };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ─── SCORE DE RESPOSTAS (com suporte a inversão) ─────────────────────────────

interface ScoredRow {
  status: string;
  sectionWeight: number;
  isInverted: boolean;
}

function scoreAnswersSimple(
  answerList: { status: AnswerStatus; isInverted?: boolean }[]
): number {
  const scored = answerList
    .map((a) => getItemScore(a.status, a.isInverted ?? false))
    .filter((w): w is number => w !== null);

  if (scored.length === 0) return 100;

  const sum = scored.reduce((acc, w) => acc + w, 0);
  return round2((sum / scored.length) * 100);
}

// ─── INTERFACES DE RESULTADO ─────────────────────────────────────────────────

export interface SectionScore {
  sectionId: number;
  sectionName: string;
  weight: number;
  score: number;
  totalItems: number;
  answeredItems: number;
}

export interface ScoreResult {
  /** ISI = (Σ(valorItem × pesoSeção) / ΣpesoSeção aplicável) × FatorUnidade */
  isi: number;
  /** ISI ajustado: ISI / NívelAmeaçaLocal */
  isiAjustado: number;
  /** ISI projetado: cenário ideal (todas "Sim" ou "Não" invertido) */
  isiProjetado: number;
  /** Conformidade simples: (# "Sim") / (# respondidos) × 100, sem pesos */
  conformidadeSimples: number;
  classification: { label: string; color: string };
  classificationAjustado: { label: string; color: string };
  classificationProjetado: { label: string; color: string };
  unitFactor: number;
  localThreatLevel: number;
}

// ─── ENGINE ──────────────────────────────────────────────────────────────────

export interface RiskScoreEngine {
  calculateSectionScore(
    sectionId: number,
    answerList: { status: AnswerStatus; isInverted?: boolean }[]
  ): number;
  calculateScore(inspectionId: number): Promise<ScoreResult>;
  calculateSectionBreakdown(inspectionId: number): Promise<SectionScore[]>;
  generateRecommendations(answerList: Answer[]): Promise<Recommendation[]>;
}

export const riskScoreEngine: RiskScoreEngine = {
  calculateSectionScore(
    _sectionId: number,
    answerList: { status: AnswerStatus; isInverted?: boolean }[]
  ): number {
    return scoreAnswersSimple(answerList);
  },

  async calculateScore(inspectionId: number): Promise<ScoreResult> {
    const db = getDb();

    const inspection = await db.query.inspections.findFirst({
      where: eq(inspections.id, inspectionId),
    });

    // JOIN com items para obter isInverted
    const rows = await db
      .select({
        status: answersTable.status,
        sectionWeight: sections.weight,
        isInverted: items.isInverted,
      })
      .from(answersTable)
      .innerJoin(items, eq(answersTable.itemId, items.id))
      .innerJoin(sections, eq(items.sectionId, sections.id))
      .where(eq(answersTable.inspectionId, inspectionId));

    // Filtrar apenas itens aplicáveis (não N/A)
    const applicable = rows.filter(
      (r) =>
        getItemScore(r.status as AnswerStatus, r.isInverted ?? false) !== null
    );

    const unitFactor = inspection?.unitType
      ? UNIT_FACTOR[inspection.unitType] ?? 1.0
      : 1.0;
    const localThreatLevel = inspection
      ? Number(inspection.localThreatLevel)
      : 1.0;

    // ISI ponderado com suporte a inversão
    const weightedSum = applicable.reduce((acc, r) => {
      const score = getItemScore(
        r.status as AnswerStatus,
        r.isInverted ?? false
      )!;
      return acc + score * r.sectionWeight;
    }, 0);
    const maxWeight = applicable.reduce((acc, r) => acc + r.sectionWeight, 0);

    const isiBruto = maxWeight === 0 ? 100 : (weightedSum / maxWeight) * 100;
    const isi = round2(
      isiBruto * unitFactor > 100 ? 100 : isiBruto * unitFactor
    );

    const isiAjustadoRaw = isi / (localThreatLevel || 1);
    const isiAjustado = round2(Math.min(100, isiAjustadoRaw));

    const isiProjetadoRaw = maxWeight === 0 ? 100 : 100 * unitFactor;
    const isiProjetado = round2(Math.min(100, isiProjetadoRaw));

    // Conformidade simples (sem pesos, sem inversão — apenas contagem de "Sim")
    const simCount = applicable.length;
    const simYes = applicable.filter((r) => {
      if (r.isInverted) {
        return r.status === "Não"; // Para invertidos, "Não" é o desejável
      }
      return r.status === "Sim";
    }).length;
    const conformidadeSimples =
      simCount === 0 ? 100 : round2((simYes / simCount) * 100);

    return {
      isi,
      isiAjustado,
      isiProjetado,
      conformidadeSimples,
      classification: classify(isi),
      classificationAjustado: classify(isiAjustado),
      classificationProjetado: classify(isiProjetado),
      unitFactor,
      localThreatLevel,
    };
  },

  async calculateSectionBreakdown(
    inspectionId: number
  ): Promise<SectionScore[]> {
    const db = getDb();
    const rows = await db
      .select({
        status: answersTable.status,
        sectionId: sections.id,
        sectionName: sections.sectionName,
        weight: sections.weight,
        isInverted: items.isInverted,
      })
      .from(answersTable)
      .innerJoin(items, eq(answersTable.itemId, items.id))
      .innerJoin(sections, eq(items.sectionId, sections.id))
      .where(eq(answersTable.inspectionId, inspectionId));

    const bySection = new Map<
      number,
      {
        sectionName: string;
        weight: number;
        answerList: { status: AnswerStatus; isInverted: boolean }[];
        totalItems: number;
      }
    >();

    for (const row of rows) {
      const entry = bySection.get(row.sectionId) ?? {
        sectionName: row.sectionName,
        weight: row.weight,
        answerList: [],
        totalItems: 0,
      };
      entry.answerList.push({
        status: row.status as AnswerStatus,
        isInverted: row.isInverted ?? false,
      });
      entry.totalItems++;
      bySection.set(row.sectionId, entry);
    }

    return Array.from(bySection.entries()).map(
      ([sectionId, { sectionName, weight, answerList, totalItems }]) => ({
        sectionId,
        sectionName,
        weight,
        score: scoreAnswersSimple(answerList),
        totalItems,
        answeredItems: answerList.filter(
          (a) => getItemScore(a.status, a.isInverted) !== null
        ).length,
      })
    );
  },

  async generateRecommendations(answerList: Answer[]): Promise<Recommendation[]> {
    const db = getDb();

    // Buscar informações dos itens para verificar inversão
    const itemIds = answerList.map((a) => a.itemId);
    const itemRows = await db
      .select({
        id: items.id,
        itemText: items.itemText,
        isInverted: items.isInverted,
      })
      .from(items)
      .where(inArray(items.id, itemIds));

    const itemMap = new Map(itemRows.map((r) => [r.id, r]));

    const flagged = answerList.filter((a) => {
      const item = itemMap.get(a.itemId);
      if (!item) return false;

      if (item.isInverted) {
        // Para invertidos: "Sim" e "Parcialmente" são problemáticos
        return a.status === "Sim" || a.status === "Parcialmente";
      }
      // Para normais: "Não" e "Parcialmente" são problemáticos
      return a.status === "Não" || a.status === "Parcialmente";
    });

    if (flagged.length === 0) return [];

    return flagged.map((a) => {
      const item = itemMap.get(a.itemId);
      const itemText = item?.itemText ?? `item #${a.itemId}`;
      const isInverted = item?.isInverted ?? false;

      let priority: Priority;
      let recommendationText: string;

      if (isInverted) {
        // Item invertido: "Sim" = vulnerabilidade confirmada (alta prioridade)
        priority = a.status === "Sim" ? "alta" : "media";
        recommendationText =
          a.status === "Sim"
            ? `VULNERABILIDADE CONFIRMADA — Elaborar plano de mitigação: "${itemText}"`
            : `Vulnerabilidade parcial identificada — Avaliar medidas preventivas: "${itemText}"`;
      } else {
        // Item normal: "Não" = não-conformidade (alta prioridade)
        priority = a.status === "Não" ? "alta" : "media";
        recommendationText =
          a.status === "Não"
            ? `Providenciar correção imediata: "${itemText}"`
            : `Avaliar e reforçar o item parcialmente atendido: "${itemText}"`;
      }

      return { itemId: a.itemId, recommendationText, priority };
    });
  },
};
