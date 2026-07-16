import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { trpc } from "../lib/trpc";
import { useAuth } from "../lib/authContext";
import { listLocalInspections, type LocalInspection } from "../lib/offlineDb";
import { getCachedChecklistIndex, resolveChecklistId } from "../lib/checklistIndex";

export default function InspectionListPage() {
  const { profileType } = useParams();
  const { token } = useAuth();
  const [localInspections, setLocalInspections] = useState<LocalInspection[]>([]);
  const checklistId = resolveChecklistId(getCachedChecklistIndex(), profileType);

  useEffect(() => {
    void listLocalInspections().then((all) =>
      setLocalInspections(all.filter((i) => i.profileType === profileType && !i.synced))
    );
  }, [profileType]);

  const remoteQuery = trpc.inspections.list.useQuery(
    checklistId != null ? { checklistId } : undefined,
    { enabled: !!token, retry: 1 }
  );

  return (
    <div>
      <h1>Inspeções — {profileType === "mpsc" ? "MPSC" : "Residencial"}</h1>

      {localInspections.length > 0 && (
        <section>
          <h2>Pendentes de sincronização ({localInspections.length})</h2>
          <ul>
            {localInspections.map((i) => (
              <li key={i.clientUuid}>
                {i.inspectorName} — {i.location || "sem local"} — {new Date(i.updatedAt).toLocaleString("pt-BR")}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2>Sincronizadas</h2>
        {!token && <p>Faça login para ver as inspeções sincronizadas.</p>}
        {token && remoteQuery.isLoading && <p>Carregando...</p>}
        {token && remoteQuery.isError && <p>Não foi possível carregar (offline?).</p>}
        {token && remoteQuery.data && (
          <ul>
            {remoteQuery.data.map((i) => (
              <li key={i.id}>
                <Link to={`/checklist/${profileType}/inspections/${i.id}`}>
                  {i.inspectorName} — {i.location || "sem local"} —{" "}
                  {new Date(i.inspectionDate).toLocaleDateString("pt-BR")}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
