import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { trpc } from "../lib/trpc";
import { useAuth } from "../lib/authContext";
import { useOnlineStatus } from "../lib/useOnlineStatus";
import {
  cacheChecklistIndex,
  getCachedChecklistIndex,
  resolveChecklistId,
} from "../lib/checklistIndex";
import {
  cacheChecklist,
  getCachedChecklist,
  saveInspectionLocally,
} from "../lib/offlineDb";
import { InspectionForm } from "@/components/InspectionForm";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { THREAT_LEVELS } from "@/constants/security-weights";
import type { ChecklistFull, InspectionFormData, Unit } from "@/types/inspection";

// O backend expõe sectionName/itemText (nomes das colunas); o pacote de
// componentes v4 espera name/text. Este adaptador converte a resposta da API
// (ou o cache offline) para o formato dos componentes.
interface BackendChecklist {
  id: number;
  name: string;
  profileType: "residencial" | "mpsc";
  description: string | null;
  createdAt: string | Date;
  sections: {
    id: number;
    checklistId: number;
    sectionOrder: number;
    sectionName: string;
    weight: number;
    items: {
      id: number;
      sectionId: number;
      itemOrder: number;
      itemText: string;
      isSubheading: boolean | null;
      isInverted: boolean | null;
    }[];
  }[];
}

function adaptChecklist(raw: BackendChecklist): ChecklistFull {
  return {
    id: raw.id,
    name: raw.name,
    profileType: raw.profileType,
    description: raw.description,
    createdAt: new Date(raw.createdAt),
    sections: raw.sections
      .slice()
      .sort((a, b) => a.sectionOrder - b.sectionOrder)
      .map((s) => ({
        id: s.id,
        checklistId: s.checklistId,
        name: s.sectionName,
        sectionOrder: s.sectionOrder,
        weight: s.weight,
        items: s.items.map((i) => ({
          id: i.id,
          sectionId: i.sectionId,
          text: i.itemText,
          itemOrder: i.itemOrder,
          isInverted: i.isInverted ?? false,
          isSubheading: i.isSubheading ?? false,
        })),
      })),
  };
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
  const [selectedUnitId, setSelectedUnitId] = useState<string>("");
  const [threatLevel, setThreatLevel] = useState("1");
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const listQuery = trpc.checklists.list.useQuery(undefined, { retry: 1 });
  useEffect(() => {
    if (listQuery.data) {
      cacheChecklistIndex(
        listQuery.data.map((c) => ({ id: c.id, profileType: c.profileType, name: c.name }))
      );
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
      setChecklist(adaptChecklist(fullQuery.data as unknown as BackendChecklist));
      void cacheChecklist(checklistId, profileType as "residencial" | "mpsc", fullQuery.data);
    }
  }, [fullQuery.data, checklistId, profileType]);

  useEffect(() => {
    if ((fullQuery.isError || !online) && checklistId != null && !checklist) {
      void getCachedChecklist(checklistId).then((cached) => {
        if (cached) setChecklist(adaptChecklist(cached.data as BackendChecklist));
      });
    }
  }, [fullQuery.isError, online, checklistId, checklist]);

  // Unidades cadastradas (apenas MPSC; exige estar online e autenticado)
  const unitsQuery = trpc.units.list.useQuery(undefined, {
    enabled: profileType === "mpsc" && !!token,
    retry: 1,
  });
  const units = (unitsQuery.data ?? []) as unknown as Unit[];
  const selectedUnit: Unit | null =
    units.find((u) => String(u.id) === selectedUnitId) ?? null;

  // Pré-preenchimento automático com a última inspeção da unidade selecionada:
  // assim que uma unidade com histórico é escolhida, o formulário já carrega
  // as respostas da versão anterior (o inspetor só revisa e ajusta).
  const lastQuery = trpc.inspections.getLastByUnit.useQuery(
    { unitId: Number(selectedUnitId), checklistId: checklistId as number },
    { enabled: !!selectedUnitId && checklistId != null && !!token, retry: 1 }
  );
  const previousAnswers = useMemo(() => {
    if (!lastQuery.data) return undefined;
    return lastQuery.data.answers.map((a) => ({
      itemId: a.itemId,
      status: a.status,
      observations: a.observations ?? undefined,
    }));
  }, [lastQuery.data]);

  const syncMutation = trpc.inspections.sync.useMutation();

  async function handleSubmit(data: InspectionFormData | null) {
    if (!data || checklistId == null) return;

    const clientUuid = crypto.randomUUID();
    const threat = profileType === "mpsc" ? Number(threatLevel) : undefined;
    const unitType =
      profileType === "mpsc" ? selectedUnit?.type : ("Residência" as const);

    await saveInspectionLocally({
      clientUuid,
      checklistId,
      profileType: profileType as "residencial" | "mpsc",
      inspectorName,
      location: location || undefined,
      unitId: selectedUnit?.id,
      unitType,
      localThreatLevel: threat,
      notes: data.observations,
      answers: data.answers,
      updatedAt: Date.now(),
      synced: false,
    });

    if (online && token) {
      try {
        const result = await syncMutation.mutateAsync({
          clientUuid,
          checklistId,
          inspectorName,
          location: location || undefined,
          unitId: selectedUnit?.id,
          unitType,
          localThreatLevel: threat,
          notes: data.observations,
          answers: data.answers,
        });
        setSavedMessage(
          `Inspeção salva e sincronizada (versão ${result.version}, ISI ${result.score.isi}%).`
        );
      } catch {
        setSavedMessage("Inspeção salva localmente. Será sincronizada quando possível.");
      }
    } else {
      setSavedMessage(
        "Inspeção salva localmente (offline). Será sincronizada quando você fizer login e estiver online."
      );
    }

    setTimeout(() => navigate(`/checklist/${profileType}/inspections`), 1500);
  }

  if (!checklist) {
    return (
      <p>
        Carregando checklist{!online ? " (offline, usando cache local se disponível)" : ""}...
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Nova Inspeção — {checklist.name}</h1>

      <Card>
        <CardContent className="py-4 grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="inspector">Nome do inspetor</Label>
            <Input
              id="inspector"
              value={inspectorName}
              onChange={(e) => setInspectorName(e.target.value)}
              placeholder="Nome do inspetor"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="location">Local / Endereço</Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Local / Endereço"
            />
          </div>

          {profileType === "mpsc" && (
            <>
              <div className="space-y-1.5">
                <Label>Unidade</Label>
                <Select value={selectedUnitId} onValueChange={setSelectedUnitId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a unidade" />
                  </SelectTrigger>
                  <SelectContent>
                    {units.map((u) => (
                      <SelectItem key={u.id} value={String(u.id)}>
                        {u.name} ({u.type}
                        {u.status === "em_comissionamento" ? " — em comissionamento" : ""})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedUnitId && previousAnswers && (
                  <p className="text-xs text-muted-foreground pt-1">
                    Formulário pré-preenchido com a última inspeção desta unidade (versão{" "}
                    {lastQuery.data?.version}). Revise e ajuste as respostas antes de salvar.
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Nível de ameaça local</Label>
                <Select value={threatLevel} onValueChange={setThreatLevel}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {THREAT_LEVELS.map((t) => (
                      <SelectItem key={t.value} value={String(t.value)}>
                        {t.label} ({t.value.toFixed(1)}) — {t.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {savedMessage && (
        <Card className="border-green-300 bg-green-50">
          <CardContent className="py-3 text-sm text-green-800">{savedMessage}</CardContent>
        </Card>
      )}

      <InspectionForm
        checklist={checklist}
        selectedUnit={selectedUnit}
        previousAnswers={previousAnswers}
        profileType={profileType as "mpsc" | "residencial"}
        onSubmit={handleSubmit}
        isSubmitting={syncMutation.isLoading}
      />
    </div>
  );
}
