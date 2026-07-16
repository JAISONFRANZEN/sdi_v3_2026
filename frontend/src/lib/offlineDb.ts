import { openDB, type DBSchema, type IDBPDatabase } from "idb";

export type AnswerStatus = "Sim" | "Não" | "Parcialmente" | "N/A";

export interface LocalAnswer {
  itemId: number;
  status: AnswerStatus;
  observations?: string;
}

export interface LocalInspection {
  clientUuid: string;
  checklistId: number;
  profileType: "residencial" | "mpsc";
  inspectorName: string;
  location?: string;
  unitType?: string;
  localThreatLevel?: number;
  notes?: string;
  answers: LocalAnswer[];
  updatedAt: number;
  synced: boolean;
  serverInspectionId?: number;
}

export interface CachedChecklist {
  checklistId: number;
  profileType: "residencial" | "mpsc";
  data: unknown;
  cachedAt: number;
}

interface ChecklistOfflineDB extends DBSchema {
  inspections: {
    key: string;
    value: LocalInspection;
  };
  checklists: {
    key: number;
    value: CachedChecklist;
  };
}

let dbPromise: Promise<IDBPDatabase<ChecklistOfflineDB>> | undefined;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<ChecklistOfflineDB>("checklist-seguranca-offline", 1, {
      upgrade(db) {
        db.createObjectStore("inspections", { keyPath: "clientUuid" });
        db.createObjectStore("checklists", { keyPath: "checklistId" });
      },
    });
  }
  return dbPromise;
}

export async function saveInspectionLocally(inspection: LocalInspection) {
  const db = await getDb();
  await db.put("inspections", inspection);
}

export async function getLocalInspection(clientUuid: string) {
  const db = await getDb();
  return db.get("inspections", clientUuid);
}

export async function listLocalInspections() {
  const db = await getDb();
  return db.getAll("inspections");
}

export async function listUnsyncedInspections() {
  const all = await listLocalInspections();
  return all.filter((i) => !i.synced);
}

export async function markInspectionSynced(clientUuid: string, serverInspectionId: number) {
  const db = await getDb();
  const existing = await db.get("inspections", clientUuid);
  if (!existing) return;
  await db.put("inspections", { ...existing, synced: true, serverInspectionId });
}

export async function cacheChecklist(checklistId: number, profileType: "residencial" | "mpsc", data: unknown) {
  const db = await getDb();
  await db.put("checklists", { checklistId, profileType, data, cachedAt: Date.now() });
}

export async function getCachedChecklist(checklistId: number) {
  const db = await getDb();
  return db.get("checklists", checklistId);
}
