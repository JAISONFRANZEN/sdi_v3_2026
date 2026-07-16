import React from "react";
import { Link, useParams } from "react-router-dom";
import { trpc } from "../lib/trpc";
import { getCachedChecklistIndex, resolveChecklistId } from "../lib/checklistIndex";

export default function AnalyticsPage() {
  const { profileType } = useParams();
  const checklistId = resolveChecklistId(getCachedChecklistIndex(), profileType);

  const query = trpc.analytics.summary.useQuery(
    { checklistId: checklistId as number },
    { enabled: checklistId != null, retry: 1 }
  );

  if (checklistId == null) return <p>Abra "Nova Inspeção" ou "Inspeções" primeiro para carregar os dados do checklist.</p>;
  if (query.isLoading) return <p>Carregando...</p>;
  if (query.isError || !query.data) return <p>Não foi possível carregar a análise (é preciso estar online).</p>;

  const { totalInspections, averageCompliance, inspections } = query.data;

  return (
    <div>
      <h1>Análise — {profileType === "mpsc" ? "MPSC" : "Residencial"}</h1>
      <p>Total de inspeções: {totalInspections}</p>
      <div className="compliance-score">Conformidade média: {averageCompliance}%</div>

      <h2>Por inspeção</h2>
      <ul>
        {inspections.map((i) => (
          <li key={i.inspectionId}>
            <Link to={`/checklist/${profileType}/inspections/${i.inspectionId}`}>
              {i.location || i.unitType || `Inspeção #${i.inspectionId}`} —{" "}
              {new Date(i.inspectionDate).toLocaleDateString("pt-BR")}: {i.compliance}%
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
