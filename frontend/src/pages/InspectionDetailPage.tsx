import React from "react";
import { useParams } from "react-router-dom";
import { trpc } from "../lib/trpc";

const PRIORITY_LABEL: Record<string, string> = {
  alta: "Alta",
  media: "Média",
  baixa: "Baixa",
};

export default function InspectionDetailPage() {
  const { id } = useParams();
  const query = trpc.inspections.getById.useQuery({ id: Number(id) }, { enabled: !!id, retry: 1 });

  if (query.isLoading) return <p>Carregando...</p>;
  if (query.isError || !query.data) return <p>Não foi possível carregar a inspeção (é preciso estar online).</p>;

  const inspection = query.data;

  return (
    <div>
      <h1>Inspeção #{inspection.id}</h1>
      <p>
        Inspetor: {inspection.inspectorName} · Local: {inspection.location || "—"} ·{" "}
        {new Date(inspection.inspectionDate).toLocaleString("pt-BR")}
      </p>

      <div className="compliance-score">Conformidade geral: {inspection.globalCompliance}%</div>

      <h2>Conformidade por seção</h2>
      <ul>
        {inspection.sectionBreakdown.map((s) => (
          <li key={s.sectionId}>
            {s.sectionName}: {s.score}%
          </li>
        ))}
      </ul>

      <h2>Recomendações ({inspection.recommendations.length})</h2>
      <ul>
        {inspection.recommendations
          .slice()
          .sort((a, b) => a.priority.localeCompare(b.priority))
          .map((r) => (
            <li key={r.id}>
              <strong>[{PRIORITY_LABEL[r.priority] ?? r.priority}]</strong> {r.recommendationText}
            </li>
          ))}
      </ul>

      {inspection.notes && (
        <>
          <h2>Observações gerais</h2>
          <p>{inspection.notes}</p>
        </>
      )}
    </div>
  );
}
