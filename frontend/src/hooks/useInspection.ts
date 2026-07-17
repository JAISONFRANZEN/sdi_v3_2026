/**
 * SDI v4 — Hook useInspection
 *
 * Gerencia o estado do formulário de inspeção, incluindo:
 * - Pré-preenchimento com última versão
 * - Cálculo em tempo real do ISI
 * - Salvamento e versionamento
 */

import { useState, useCallback, useMemo, useEffect } from "react";
import type { AnswerStatus, ChecklistFull, InspectionFormData, Unit } from "@/types/inspection";
import { calculateISI, prefillFromPrevious, type InspectionAnswer } from "@/lib/inspection-utils";

interface UseInspectionOptions {
  checklist: ChecklistFull | null;
  selectedUnit?: Unit | null;
  previousAnswers?: { itemId: number; status: AnswerStatus; observations?: string }[];
  profileType: "mpsc" | "residencial";
}

interface AnswerState {
  status: AnswerStatus | null;
  observations: string;
}

export function useInspection({
  checklist,
  selectedUnit,
  previousAnswers,
  profileType,
}: UseInspectionOptions) {
  const [answers, setAnswers] = useState<Map<number, AnswerState>>(new Map());
  const [currentSection, setCurrentSection] = useState(0);
  const [localThreatLevel, setLocalThreatLevel] = useState(1.0);
  const [observations, setObservations] = useState("");

  // Pré-preencher com última inspeção quando disponível
  useEffect(() => {
    if (previousAnswers && previousAnswers.length > 0) {
      const prefilled = prefillFromPrevious(previousAnswers);
      const newAnswers = new Map<number, AnswerState>();
      for (const [itemId, data] of prefilled.entries()) {
        newAnswers.set(itemId, {
          status: data.status,
          observations: data.observations ?? "",
        });
      }
      setAnswers(newAnswers);
    }
  }, [previousAnswers]);

  // Atualizar resposta de um item
  const setAnswer = useCallback((itemId: number, status: AnswerStatus) => {
    setAnswers((prev) => {
      const next = new Map(prev);
      const existing = next.get(itemId);
      next.set(itemId, { status, observations: existing?.observations ?? "" });
      return next;
    });
  }, []);

  // Atualizar observação de um item
  const setItemObservation = useCallback((itemId: number, obs: string) => {
    setAnswers((prev) => {
      const next = new Map(prev);
      const existing = next.get(itemId);
      next.set(itemId, { status: existing?.status ?? null, observations: obs });
      return next;
    });
  }, []);

  // Calcular ISI em tempo real
  const liveResult = useMemo(() => {
    if (!checklist) return null;

    const inspectionAnswers: InspectionAnswer[] = [];
    for (const section of checklist.sections) {
      for (const item of section.items) {
        if (item.isSubheading) continue;
        const answer = answers.get(item.id);
        if (answer?.status) {
          inspectionAnswers.push({
            itemId: item.id,
            sectionOrder: section.sectionOrder,
            status: answer.status,
            observations: answer.observations,
            isInverted: item.isInverted,
          });
        }
      }
    }

    if (inspectionAnswers.length === 0) return null;

    return calculateISI(
      inspectionAnswers,
      profileType,
      selectedUnit?.type,
      localThreatLevel
    );
  }, [answers, checklist, selectedUnit, profileType, localThreatLevel]);

  // Progresso de preenchimento
  const progress = useMemo(() => {
    if (!checklist) return { total: 0, answered: 0, percentage: 0 };

    let total = 0;
    let answered = 0;
    for (const section of checklist.sections) {
      for (const item of section.items) {
        if (item.isSubheading) continue;
        total++;
        const answer = answers.get(item.id);
        if (answer?.status) answered++;
      }
    }

    return { total, answered, percentage: total === 0 ? 0 : Math.round((answered / total) * 100) };
  }, [answers, checklist]);

  // Progresso por seção
  const sectionProgress = useMemo(() => {
    if (!checklist) return [];

    return checklist.sections.map((section) => {
      const answerable = section.items.filter((item) => !item.isSubheading);
      const total = answerable.length;
      const answered = answerable.filter((item) => answers.get(item.id)?.status).length;
      return {
        sectionOrder: section.sectionOrder,
        sectionName: section.name,
        total,
        answered,
        percentage: total === 0 ? 0 : Math.round((answered / total) * 100),
        isComplete: answered === total,
      };
    });
  }, [answers, checklist]);

  // Montar dados do formulário para envio
  const getFormData = useCallback((): InspectionFormData | null => {
    if (!checklist) return null;

    const formAnswers: InspectionFormData["answers"] = [];
    for (const section of checklist.sections) {
      for (const item of section.items) {
        if (item.isSubheading) continue;
        const answer = answers.get(item.id);
        if (answer?.status) {
          formAnswers.push({
            itemId: item.id,
            status: answer.status,
            observations: answer.observations || undefined,
          });
        }
      }
    }

    return {
      checklistId: checklist.id,
      unitId: selectedUnit?.id,
      unitName: selectedUnit?.name ?? "",
      unitType: selectedUnit?.type ?? "",
      localThreatLevel,
      observations: observations || undefined,
      answers: formAnswers,
    };
  }, [answers, checklist, selectedUnit, localThreatLevel, observations]);

  // Resetar formulário
  const reset = useCallback(() => {
    setAnswers(new Map());
    setCurrentSection(0);
    setLocalThreatLevel(1.0);
    setObservations("");
  }, []);

  return {
    answers,
    setAnswer,
    setItemObservation,
    currentSection,
    setCurrentSection,
    localThreatLevel,
    setLocalThreatLevel,
    observations,
    setObservations,
    liveResult,
    progress,
    sectionProgress,
    getFormData,
    reset,
  };
}
