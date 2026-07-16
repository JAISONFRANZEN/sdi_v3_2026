import { eq, inArray } from "drizzle-orm";
import { getDb } from "./db";
import { answers as answersTable, items, sections } from "../drizzle/schema";

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

function scoreAnswers(answerList: Pick<Answer, "status">[]): number {
  const scored = answerList
    .map((a) => STATUS_WEIGHT[a.status])
    .filter((w): w is number => w !== null);

  if (scored.length === 0) return 100;

  const sum = scored.reduce((acc, w) => acc + w, 0);
  return Math.round((sum / scored.length) * 100 * 100) / 100;
}

export interface SectionScore {
  sectionId: number;
  sectionName: string;
  score: number;
}

export interface RiskScoreEngine {
  calculateSectionScore(sectionId: number, answerList: Answer[]): number;
  calculateGlobalCompliance(inspectionId: number): Promise<number>;
  calculateSectionBreakdown(inspectionId: number): Promise<SectionScore[]>;
  generateRecommendations(answerList: Answer[]): Promise<Recommendation[]>;
}

export const riskScoreEngine: RiskScoreEngine = {
  calculateSectionScore(_sectionId: number, answerList: Answer[]): number {
    return scoreAnswers(answerList);
  },

  async calculateGlobalCompliance(inspectionId: number): Promise<number> {
    const db = getDb();
    const rows = await db
      .select({ status: answersTable.status })
      .from(answersTable)
      .where(eq(answersTable.inspectionId, inspectionId));
    return scoreAnswers(rows);
  },

  async calculateSectionBreakdown(inspectionId: number): Promise<SectionScore[]> {
    const db = getDb();
    const rows = await db
      .select({
        status: answersTable.status,
        sectionId: sections.id,
        sectionName: sections.sectionName,
      })
      .from(answersTable)
      .innerJoin(items, eq(answersTable.itemId, items.id))
      .innerJoin(sections, eq(items.sectionId, sections.id))
      .where(eq(answersTable.inspectionId, inspectionId));

    const bySection = new Map<number, { sectionName: string; answerList: Pick<Answer, "status">[] }>();
    for (const row of rows) {
      const entry = bySection.get(row.sectionId) ?? { sectionName: row.sectionName, answerList: [] };
      entry.answerList.push({ status: row.status as AnswerStatus });
      bySection.set(row.sectionId, entry);
    }

    return Array.from(bySection.entries()).map(([sectionId, { sectionName, answerList }]) => ({
      sectionId,
      sectionName,
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
