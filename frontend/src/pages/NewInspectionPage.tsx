import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { trpc } from "../lib/trpc";
import { useAuth } from "../lib/authContext";
import { useOnlineStatus } from "../lib/useOnlineStatus";
import { cacheChecklistIndex, getCachedChecklistIndex, resolveChecklistId } from "../lib/checklistIndex";
import { cacheChecklist, getCachedChecklist, saveInspectionLocally, type AnswerStatus } from "../lib/offlineDb";
import SectionCard, { type ChecklistSection } from "../components/SectionCard";

const UNIT_TYPES = [
  "GAECO",
  "Isolada",
  "Administrativo",
  "Apoio Técnico",
  "Fórum de Justiça",
  "Fórum de Justiça - Ala",
  "Fórum de Justiça - Sala de apoio",
  "Terreno",
  "Outro",
] as const;

interface ChecklistFull {
  id: number;
  name: string;
  profileType: "residencial" | "mpsc";
  sections: ChecklistSection[];
}

export default function NewInspectionPage() {
  const { profileType } = useParams<{ profileType: "residencial" | "mpsc" }>();
  const navigate = useNavigate();
  const online = useOnlineStatus();
  const { token, name } = useAuth();

  const [checklistId, setChecklistId] = useState<number | undefined>(() =>
    resolveChecklistId(getCachedChecklistIndex(), profileType)
  );
  const [checklist, setChecklist] = useState<ChecklistFull | null>(null);
  const [inspectorName, setInspectorName] = useState(name ?? "");
  const [location, setLocation] = useState("");
  const [unitType, setUnitType] = useState<(typeof UNIT_TYPES)[number] | "">("");
  const [localThreatLevel, setLocalThreatLevel] = useState("1.0");
  const [notes, setNotes] = useState("");
  const [answersByItemId, setAnswersByItemId] = useState<
    Record<number, { status: AnswerStatus; observations?: string }>
  >({});
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const listQuery = trpc.checklists.list.useQuery(undefined, { retry: 1 });
  useEffect(() => {
    if (listQuery.data) {
      cacheChecklistIndex(listQuery.data.map((c) => ({ id: c.id, profileType: c.profileType, name: c.name })));
      const resolved = resolveChecklistId(listQuery.data, profileType);
      if (resolved) setChecklistId(resolved);
    }
  }, [listQuery.data, profileType]);

  const fullQuery = trpc.checklists.getFull.useQuery(
    { checklistId: checklistId as number },
    { enabled: checklistId != null, retry: 1 }
  );

  useEffect(() => {
    if (fullQuery.data && checklistId != null) {
      setChecklist(fullQuery.data as ChecklistFull);
      void cacheChecklist(checklistId, profileType as "residencial" | "mpsc", fullQuery.data);
    }
  }, [fullQuery.data, checklistId, profileType]);

  useEffect(() => {
    if ((fullQuery.isError || !online) && checklistId != null && !checklist) {
      void getCachedChecklist(checklistId).then((cached) => {
        if (cached) setChecklist(cached.data as ChecklistFull);
      });
    }
  }, [fullQuery.isError, online, checklistId, checklist]);

  const syncMutation = trpc.inspections.sync.useMutation();

  const totalItems = useMemo(
    () => checklist?.sections.flatMap((s) => s.items).filter((i) => !i.isSubheading).length ?? 0,
    [checklist]
  );
  const answeredItems = Object.keys(answersByItemId).length;

  function handleAnswerChange(itemId: number, status: AnswerStatus) {
    setAnswersByItemId((prev) => ({ ...prev, [itemId]: { ...prev[itemId], status } }));
  }

  function handleObservationChange(itemId: number, observations: string) {
    setAnswersByItemId((prev) => ({
      ...prev,
      [itemId]: { status: prev[itemId]?.status ?? "N/A", observations },
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!checklist || checklistId == null) return;

    const clientUuid = crypto.randomUUID();
    const answersPayload = Object.entries(answersByItemId).map(([itemId, a]) => ({
      itemId: Number(itemId),
      status: a.status,
      observations: a.observations,
    }));

    await saveInspectionLocally({
      clientUuid,
      checklistId,
      profileType: profileType as "residencial" | "mpsc",
      inspectorName,
      location: location || undefined,
      unitType: unitType || undefined,
      localThreatLevel: profileType === "mpsc" ? Number(localThreatLevel) : undefined,
      notes: notes || undefined,
      answers: answersPayload,
      updatedAt: Date.now(),
      synced: false,
    });

    if (online && token) {
      try {
        await syncMutation.mutateAsync({
          clientUuid,
          checklistId,
          inspectorName,
          location: location || undefined,
          unitType: unitType || undefined,
          localThreatLevel: profileType === "mpsc" ? Number(localThreatLevel) : undefined,
          notes: notes || undefined,
          answers: answersPayload,
        });
        setSavedMessage("Inspeção salva e sincronizada com sucesso.");
      } catch {
        setSavedMessage("Inspeção salva localmente. Será sincronizada quando possível.");
      }
    } else {
      setSavedMessage("Inspeção salva localmente (offline). Será sincronizada quando você fizer login e estiver online.");
    }

    setTimeout(() => navigate(`/checklist/${profileType}/inspections`), 1200);
  }

  if (!checklist) {
    return <p>Carregando checklist{!online ? " (offline, usando cache local se disponível)" : ""}...</p>;
  }

  return (
    <div>
      <h1>Nova Inspeção — {checklist.name}</h1>
      <form onSubmit={handleSubmit}>
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginBottom: "1rem" }}>
          <input
            placeholder="Nome do inspetor"
            value={inspectorName}
            onChange={(e) => setInspectorName(e.target.value)}
            required
          />
          <input placeholder="Local / Endereço" value={location} onChange={(e) => setLocation(e.target.value)} />
          {profileType === "mpsc" && (
            <>
              <select value={unitType} onChange={(e) => setUnitType(e.target.value as typeof unitType)}>
                <option value="">Tipo de unidade</option>
                {UNIT_TYPES.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
              <label>
                Nível de ameaça local (1,0 a 2,0)
                <input
                  type="number"
                  min={1}
                  max={2}
                  step={0.1}
                  value={localThreatLevel}
                  onChange={(e) => setLocalThreatLevel(e.target.value)}
                  style={{ marginLeft: "0.5rem", width: 70 }}
                />
              </label>
            </>
          )}
        </div>

        <p>
          {answeredItems} / {totalItems} itens respondidos
        </p>

        {checklist.sections
          .slice()
          .sort((a, b) => a.sectionOrder - b.sectionOrder)
          .map((section) => (
            <SectionCard
              key={section.id}
              section={section}
              answersByItemId={answersByItemId}
              onChange={handleAnswerChange}
              onObservationChange={handleObservationChange}
            />
          ))}

        <textarea
          placeholder="Observações gerais"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          style={{ width: "100%" }}
        />

        {savedMessage && <p>{savedMessage}</p>}

        <button type="submit">Salvar Inspeção</button>
      </form>
    </div>
  );
}
