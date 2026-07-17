/**
 * SDI v4 — Utilitários de Inspeção (Frontend)
 *
 * Funções de cálculo do ISI, classificação, geração de recomendações
 * e pré-preenchimento de formulários.
 */

import {
  type AnswerStatus,
  type ClassificationBand,
  type ISIResult,
  getItemScore,
  classify,
  UNIT_TYPE_FACTOR,
  SECTION_WEIGHTS_MPSC,
  SECTION_WEIGHTS_RESIDENCIAL,
  CLASSIFICATION_BANDS,
} from "@/constants/security-weights";

// ─── TIPOS ───────────────────────────────────────────────────────────────────

export interface InspectionAnswer {
  itemId: number | string;
  sectionOrder: number;
  status: AnswerStatus;
  observations?: string;
  isInverted?: boolean;
}

export interface SectionResult {
  sectionOrder: number;
  sectionName: string;
  weight: number;
  score: number;
  totalItems: number;
  answeredItems: number;
  naItems: number;
}

export interface InspectionResult {
  isiBase: number;
  isi: number;
  isiAjustado: number;
  isiProjetado: number;
  conformidadeSimples: number;
  classification: ClassificationBand;
  classificationAjustado: ClassificationBand;
  sections: SectionResult[];
  totalItems: number;
  answeredItems: number;
  recommendations: GeneratedRecommendation[];
}

export interface GeneratedRecommendation {
  itemId: number | string;
  text: string;
  priority: "alta" | "media" | "baixa";
  sectionName: string;
}

// ─── CÁLCULO PRINCIPAL ───────────────────────────────────────────────────────

/**
 * Calcula o ISI completo de uma inspeção.
 *
 * @param answers - Array de respostas com itemId, sectionOrder, status e isInverted
 * @param profileType - "mpsc" ou "residencial"
 * @param unitType - Tipo da unidade (para fator multiplicador)
 * @param localThreatLevel - Nível de ameaça local (1.0 a 2.0)
 */
export function calculateISI(
  answers: InspectionAnswer[],
  profileType: "mpsc" | "residencial",
  unitType?: string,
  localThreatLevel: number = 1.0
): InspectionResult {
  const weights =
    profileType === "mpsc" ? SECTION_WEIGHTS_MPSC : SECTION_WEIGHTS_RESIDENCIAL;
  const unitFactor = unitType ? (UNIT_TYPE_FACTOR[unitType] ?? 1.0) : 1.0;

  // Agrupar por seção
  const bySectionMap = new Map<number, InspectionAnswer[]>();
  for (const answer of answers) {
    const list = bySectionMap.get(answer.sectionOrder) ?? [];
    list.push(answer);
    bySectionMap.set(answer.sectionOrder, list);
  }

  // Calcular score por seção
  const sectionResults: SectionResult[] = [];
  let weightedSum = 0;
  let totalWeight = 0;

  for (const [sectionOrder, sectionAnswers] of bySectionMap.entries()) {
    const sectionConfig = weights[sectionOrder];
    if (!sectionConfig) continue;

    const scored = sectionAnswers
      .map((a) => ({
        score: getItemScore(a.status, a.isInverted ?? false),
        answer: a,
      }))
      .filter((s) => s.score !== null);

    const naItems = sectionAnswers.length - scored.length;
    const sectionScore =
      scored.length === 0
        ? 0
        : (scored.reduce((acc, s) => acc + s.score!, 0) / scored.length) * 100;

    sectionResults.push({
      sectionOrder,
      sectionName: sectionConfig.name,
      weight: sectionConfig.weight,
      score: Math.round(sectionScore * 100) / 100,
      totalItems: sectionAnswers.length,
      answeredItems: scored.length,
      naItems,
    });

    // Acumular para ISI ponderado
    if (scored.length > 0) {
      const avgScore = scored.reduce((acc, s) => acc + s.score!, 0) / scored.length;
      weightedSum += avgScore * sectionConfig.weight;
      totalWeight += sectionConfig.weight;
    }
  }

  // ISI Base (ponderado por peso de seção)
  const isiBase = totalWeight === 0 ? 0 : (weightedSum / totalWeight) * 100;

  // ISI com fator de unidade
  const isi = Math.min(100, Math.round(isiBase * unitFactor * 100) / 100);

  // ISI Ajustado (dividido pelo nível de ameaça)
  const isiAjustado = Math.min(
    100,
    Math.round((isi / (localThreatLevel || 1)) * 100) / 100
  );

  // ISI Projetado (cenário ideal)
  const isiProjetado = Math.min(100, Math.round(100 * unitFactor * 100) / 100);

  // Conformidade simples (sem pesos)
  const allScored = answers
    .map((a) => getItemScore(a.status, a.isInverted ?? false))
    .filter((s): s is number => s !== null);
  const conformidadeSimples =
    allScored.length === 0
      ? 0
      : Math.round(
          (allScored.reduce((acc, s) => acc + s, 0) / allScored.length) * 100 * 100
        ) / 100;

  // Gerar recomendações
  const recommendations = generateRecommendations(answers, weights);

  return {
    isiBase: Math.round(isiBase * 100) / 100,
    isi,
    isiAjustado,
    isiProjetado,
    conformidadeSimples,
    classification: classify(isi),
    classificationAjustado: classify(isiAjustado),
    sections: sectionResults.sort((a, b) => a.sectionOrder - b.sectionOrder),
    totalItems: answers.length,
    answeredItems: allScored.length,
    recommendations,
  };
}

// ─── GERAÇÃO DE RECOMENDAÇÕES ────────────────────────────────────────────────

function generateRecommendations(
  answers: InspectionAnswer[],
  weights: Record<number, { name: string; weight: number }>
): GeneratedRecommendation[] {
  const recs: GeneratedRecommendation[] = [];

  for (const answer of answers) {
    const isInverted = answer.isInverted ?? false;
    const sectionConfig = weights[answer.sectionOrder];
    const sectionName = sectionConfig?.name ?? `Seção ${answer.sectionOrder}`;

    // Determinar se o item está em não-conformidade
    let isNonConformant = false;
    let priority: "alta" | "media" | "baixa" = "baixa";

    if (isInverted) {
      // Invertido: "Sim" = vulnerabilidade (ruim)
      if (answer.status === "Sim") {
        isNonConformant = true;
        priority = "alta";
      } else if (answer.status === "Parcialmente") {
        isNonConformant = true;
        priority = "media";
      }
    } else {
      // Normal: "Não" = não-conforme (ruim)
      if (answer.status === "Não") {
        isNonConformant = true;
        priority = "alta";
      } else if (answer.status === "Parcialmente") {
        isNonConformant = true;
        priority = "media";
      }
    }

    if (isNonConformant) {
      const text = isInverted
        ? answer.status === "Sim"
          ? "Vulnerabilidade confirmada — Elaborar plano de mitigação."
          : "Vulnerabilidade parcial — Avaliar medidas preventivas."
        : answer.status === "Não"
          ? "Não conforme — Providenciar correção imediata."
          : "Parcialmente conforme — Avaliar e reforçar.";

      recs.push({
        itemId: answer.itemId,
        text,
        priority,
        sectionName,
      });
    }
  }

  // Ordenar por prioridade (alta > media > baixa)
  const priorityOrder = { alta: 0, media: 1, baixa: 2 };
  return recs.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
}

// ─── PRÉ-PREENCHIMENTO ──────────────────────────────────────────────────────

/**
 * Importa as respostas da última inspeção para pré-preencher o formulário.
 * O usuário pode alterar qualquer resposta antes de salvar a nova versão.
 */
export function prefillFromPrevious(
  previousAnswers: { itemId: number; status: AnswerStatus; observations?: string }[]
): Map<number, { status: AnswerStatus; observations?: string }> {
  const map = new Map<number, { status: AnswerStatus; observations?: string }>();
  for (const answer of previousAnswers) {
    map.set(answer.itemId, {
      status: answer.status,
      observations: answer.observations,
    });
  }
  return map;
}

// ─── COMPARAÇÃO ENTRE VERSÕES ────────────────────────────────────────────────

export interface VersionDiff {
  itemId: number | string;
  previousStatus: AnswerStatus;
  currentStatus: AnswerStatus;
  improved: boolean;
  worsened: boolean;
}

export function compareVersions(
  previous: InspectionAnswer[],
  current: InspectionAnswer[]
): VersionDiff[] {
  const prevMap = new Map(previous.map((a) => [a.itemId, a]));
  const diffs: VersionDiff[] = [];

  for (const curr of current) {
    const prev = prevMap.get(curr.itemId);
    if (!prev || prev.status === curr.status) continue;

    const prevScore = getItemScore(prev.status, prev.isInverted ?? false);
    const currScore = getItemScore(curr.status, curr.isInverted ?? false);

    if (prevScore === null || currScore === null) continue;

    diffs.push({
      itemId: curr.itemId,
      previousStatus: prev.status,
      currentStatus: curr.status,
      improved: currScore > prevScore,
      worsened: currScore < prevScore,
    });
  }

  return diffs;
}

// ─── EXPORTAÇÃO DE RELATÓRIO ─────────────────────────────────────────────────

export interface ReportData {
  inspectionId: number;
  version: number;
  inspectorName: string;
  unitName: string;
  unitType: string;
  date: string;
  result: InspectionResult;
  answers: InspectionAnswer[];
  previousVersion?: number;
  versionDiff?: VersionDiff[];
}

/**
 * Formata os dados de uma inspeção para geração de relatório PDF.
 */
export function formatReportData(data: ReportData): string {
  const lines: string[] = [];
  lines.push(`RELATÓRIO DE INSPEÇÃO DE SEGURANÇA — v${data.version}`);
  lines.push(`${"═".repeat(60)}`);
  lines.push(`Inspetor: ${data.inspectorName}`);
  lines.push(`Unidade: ${data.unitName} (${data.unitType})`);
  lines.push(`Data: ${data.date}`);
  lines.push(`Versão: ${data.version}`);
  lines.push("");
  lines.push(`ISI: ${data.result.isi}% — ${data.result.classification.label}`);
  lines.push(`ISI Ajustado: ${data.result.isiAjustado}%`);
  lines.push(`Conformidade Simples: ${data.result.conformidadeSimples}%`);
  lines.push("");
  lines.push("RESULTADO POR SEÇÃO:");
  lines.push("-".repeat(60));

  for (const sec of data.result.sections) {
    lines.push(
      `  S${sec.sectionOrder}. ${sec.sectionName}: ${sec.score}% (peso ${sec.weight})`
    );
  }

  if (data.result.recommendations.length > 0) {
    lines.push("");
    lines.push("RECOMENDAÇÕES:");
    lines.push("-".repeat(60));
    for (const rec of data.result.recommendations) {
      lines.push(`  [${rec.priority.toUpperCase()}] ${rec.sectionName}: ${rec.text}`);
    }
  }

  if (data.versionDiff && data.versionDiff.length > 0) {
    lines.push("");
    lines.push(`COMPARAÇÃO COM VERSÃO ${data.previousVersion}:`);
    lines.push("-".repeat(60));
    const improved = data.versionDiff.filter((d) => d.improved).length;
    const worsened = data.versionDiff.filter((d) => d.worsened).length;
    lines.push(`  Itens melhorados: ${improved}`);
    lines.push(`  Itens piorados: ${worsened}`);
  }

  return lines.join("\n");
}
