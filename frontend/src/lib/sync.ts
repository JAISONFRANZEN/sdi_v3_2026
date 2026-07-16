import { listUnsyncedInspections, markInspectionSynced, type AnswerStatus } from "./offlineDb";

export interface SyncResult {
  attempted: number;
  succeeded: number;
  failed: number;
}

// Percorre as inspeções salvas localmente (criadas offline) e envia cada uma
// ainda não sincronizada para o backend via inspections.sync. Idempotente:
// pode ser chamado repetidamente sem duplicar dados, pois o backend faz
// upsert por clientUuid.
export async function flushPendingInspections(
  syncMutate: (input: {
    clientUuid: string;
    checklistId: number;
    inspectorName: string;
    location?: string;
    unitType?: LocalUnitType;
    localThreatLevel?: number;
    notes?: string;
    answers: { itemId: number; status: AnswerStatus; observations?: string }[];
  }) => Promise<{ inspectionId: number }>
): Promise<SyncResult> {
  const pending = await listUnsyncedInspections();
  const result: SyncResult = { attempted: pending.length, succeeded: 0, failed: 0 };

  for (const inspection of pending) {
    try {
      const response = await syncMutate({
        clientUuid: inspection.clientUuid,
        checklistId: inspection.checklistId,
        inspectorName: inspection.inspectorName,
        location: inspection.location,
        unitType: inspection.unitType as LocalUnitType | undefined,
        localThreatLevel: inspection.localThreatLevel,
        notes: inspection.notes,
        answers: inspection.answers,
      });
      await markInspectionSynced(inspection.clientUuid, response.inspectionId);
      result.succeeded += 1;
    } catch (err) {
      console.warn("Falha ao sincronizar inspeção", inspection.clientUuid, err);
      result.failed += 1;
    }
  }

  return result;
}

type LocalUnitType =
  | "GAECO"
  | "Isolada"
  | "Administrativo"
  | "Apoio Técnico"
  | "Fórum de Justiça"
  | "Fórum de Justiça - Ala"
  | "Fórum de Justiça - Sala de apoio"
  | "Terreno"
  | "Residência"
  | "Outro";

export function onConnectivityRestored(callback: () => void) {
  window.addEventListener("online", callback);
  return () => window.removeEventListener("online", callback);
}
