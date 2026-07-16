export interface ChecklistIndexEntry {
  id: number;
  profileType: "residencial" | "mpsc";
  name: string;
}

const STORAGE_KEY = "checklists_index";

export function cacheChecklistIndex(entries: ChecklistIndexEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export function getCachedChecklistIndex(): ChecklistIndexEntry[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as ChecklistIndexEntry[];
  } catch {
    return [];
  }
}

export function resolveChecklistId(
  entries: ChecklistIndexEntry[],
  profileType: string | undefined
): number | undefined {
  return entries.find((e) => e.profileType === profileType)?.id;
}
