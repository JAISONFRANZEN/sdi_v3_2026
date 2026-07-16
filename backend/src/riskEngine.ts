import { eq, inArray } from "drizzle-orm";
import { getDb } from "./db";
import { answers as answersTable, items, sections, inspections } from "../drizzle/schema";

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

const STATUS_WEIGHT: Record<AnswerStatus, number | null> = {
  Sim: 1,
  Parcialmente: 0.5,
  Não: 0,
  "N/A": null, // excluído do denominador
};

// FatorUnidade — isi-logica-calculo.xlsx, aba "Fatores Unidade".
// "Residência" e "Outro" usam fator neutro (1.0): não constam na planilha
// (que é específica do MPSC), mas precisam de um valor para o perfil Residencial.
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

// Classificação do ISI — isi-logica-calculo.xlsx, aba "Classificação".
const CLASSIFICATION_BANDS: { min: number; label: string }[] = [
  { min: 90, label: "Excelente" },
  { min: 75, label: "Bom" },
  { min: 50, label: "Regular" },
  { min: 25, label: "Crítico" },
  { min: 0, label: "Muito Crítico" },
];

function classify(score: number): string {
  return CLASSIFICATION_BANDS.find((b) => score >= b.min)?.label ?? "Muito Crítico";
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function scoreAnswers(answerList: Pick<Answer, "status">[]): number {
  const scored = answerList
    .map((a) => STATUS_WEIGHT[a.status])
    .filter((w): w is number => w !== null);

  if (scored.length === 0) return 100;

  const sum = scored.reduce((acc, w) => acc + w, 0);
  return round2((sum / scored.length) * 100);
}

export interface SectionScore {
  sectionId: number;
  sectionName: string;
  weight: number;
  score: number;
}

export interface ScoreResult {
  // ISI = (Σ(valorItem × pesoSeção) / ΣpesoSeção aplicável) × FatorUnidade
  isi: number;
  // ISI ajustado ao contexto de ameaça local: ISI / NívelAmeaçaLocal
  isiAjustado: number;
  // ISI projetado: simula todas as respostas aplicáveis como "Sim" (potencial máximo)
  isiProjetado: number;
  // Conformidade simples: (# "Sim") / (# respondidos) × 100, sem pesos
  conformidadeSimples: number;
  classification: string;
  classificationAjustado: string;
  classificationProjetado: string;
  unitFactor: number;
  localThreatLevel: number;
}

export interface RiskScoreEngine {
  calculateSectionScore(sectionId: number, answerList: Answer[]): number;
  calculateScore(inspectionId: number): Promise<ScoreResult>;
  calculateSectionBreakdown(inspectionId: number): Promise<SectionScore[]>;
  generateRecommendations(answerList: Answer[]): Promise<Recommendation[]>;
}

export const riskScoreEngine: RiskScoreEngine = {
  calculateSectionScore(_sectionId: number, answerList: Answer[]): number {
    return scoreAnswers(answerList);
  },

  async calculateScore(inspectionId: number): Promise<ScoreResult> {
    const db = getDb();

    const inspection = await db.query.inspections.findFirst({
      where: eq(inspections.id, inspectionId),
    });

    const rows = await db
      .select({ status: answersTable.status, sectionWeight: sections.weight })
      .from(answersTable)
      .innerJoin(items, eq(answersTable.itemId, items.id))
      .innerJoin(sections, eq(items.sectionId, sections.id))
      .where(eq(answersTable.inspectionId, inspectionId));

    const applicable = rows.filter((r) => STATUS_WEIGHT[r.status as AnswerStatus] !== null);

    const unitFactor = inspection?.unitType ? UNIT_FACTOR[inspection.unitType] ?? 1.0 : 1.0;
    const localThreatLevel = inspection ? Number(inspection.localThreatLevel) : 1.0;

    const weightedSum = applicable.reduce(
      (acc, r) => acc + STATUS_WEIGHT[r.status as AnswerStatus]! * r.sectionWeight,
      0
    );
    const maxWeight = applicable.reduce((acc, r) => acc + r.sectionWeight, 0);

    const isiBruto = maxWeight === 0 ? 100 : (weightedSum / maxWeight) * 100;
    const isi = round2(isiBruto * unitFactor > 100 ? 100 : isiBruto * unitFactor);

    const isiAjustadoRaw = isi / (localThreatLevel || 1);
    const isiAjustado = round2(Math.min(100, isiAjustadoRaw));

    const isiProjetadoRaw = maxWeight === 0 ? 100 : 100 * unitFactor;
    const isiProjetado = round2(Math.min(100, isiProjetadoRaw));

    const simCount = applicable.length;
    const simYes = applicable.filter((r) => r.status === "Sim").length;
    const conformidadeSimples = simCount === 0 ? 100 : round2((simYes / simCount) * 100);

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

  async calculateSectionBreakdown(inspectionId: number): Promise<SectionScore[]> {
    const db = getDb();
    const rows = await db
      .select({
        status: answersTable.status,
        sectionId: sections.id,
        sectionName: sections.sectionName,
        weight: sections.weight,
      })
      .from(answersTable)
      .innerJoin(items, eq(answersTable.itemId, items.id))
      .innerJoin(sections, eq(items.sectionId, sections.id))
      .where(eq(answersTable.inspectionId, inspectionId));

    const bySection = new Map<
      number,
      { sectionName: string; weight: number; answerList: Pick<Answer, "status">[] }
    >();
    for (const row of rows) {
      const entry = bySection.get(row.sectionId) ?? {
        sectionName: row.sectionName,
        weight: row.weight,
        answerList: [],
      };
      entry.answerList.push({ status: row.status as AnswerStatus });
      bySection.set(row.sectionId, entry);
    }

    return Array.from(bySection.entries()).map(([sectionId, { sectionName, weight, answerList }]) => ({
      sectionId,
      sectionName,
      weight,
      score: scoreAnswers(answerList),
    }));
  },

  async generateRecommendations(answerList: Answer[]): Promise<Recommendation[]> {
    const flagged = answerList.filter((a) => a.status === "Não" || a.status === "Parcialmente");
    if (flagged.length === 0) return [];

    const db = getDb();
    const itemIds = flagged.map((a) => a.itemId);
    const itemRows = await db
      .select({ id: items.id, itemText: items.itemText })
      .from(items)
      .where(inArray(items.id, itemIds));
    const itemTextById = new Map(itemRows.map((r) => [r.id, r.itemText]));

    return flagged.map((a) => {
      const itemText = itemTextById.get(a.itemId) ?? `item #${a.itemId}`;
      const priority: Priority = a.status === "Não" ? "alta" : "media";
      const recommendationText =
        a.status === "Não"
          ? `Providenciar correção imediata: "${itemText}"`
          : `Avaliar e reforçar o item parcialmente atendido: "${itemText}"`;
      return { itemId: a.itemId, recommendationText, priority };
    });
  },
};
