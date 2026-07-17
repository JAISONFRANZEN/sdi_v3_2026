import { useParams } from "react-router-dom";
import { trpc } from "../lib/trpc";
import { ISIGauge } from "@/components/ISIGauge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const PRIORITY_LABEL: Record<string, string> = {
  alta: "Alta",
  media: "Média",
  baixa: "Baixa",
};

const PRIORITY_ORDER: Record<string, number> = { alta: 0, media: 1, baixa: 2 };

export default function InspectionDetailPage() {
  const { id } = useParams();
  const query = trpc.inspections.getById.useQuery(
    { id: Number(id) },
    { enabled: !!id, retry: 1 }
  );

  if (query.isLoading) return <p>Carregando...</p>;
  if (query.isError || !query.data)
    return <p>Não foi possível carregar a inspeção (é preciso estar online).</p>;

  const inspection = query.data;
  const { score } = inspection;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-2xl font-bold">Inspeção #{inspection.id}</h1>
        <Badge variant="secondary">Versão {inspection.version}</Badge>
        {inspection.previousInspectionId && (
          <Badge variant="outline">substitui inspeção #{inspection.previousInspectionId}</Badge>
        )}
      </div>
      <p className="text-sm text-muted-foreground">
        Inspetor: {inspection.inspectorName} · Local: {inspection.location || "—"} ·{" "}
        {new Date(inspection.inspectionDate).toLocaleString("pt-BR")}
      </p>

      <div className="grid gap-4 sm:grid-cols-3">
        <ISIGauge value={score.isi} label="ISI" />
        <ISIGauge value={score.isiAjustado} label="ISI Ajustado (risco residual)" size="sm" />
        <ISIGauge value={score.isiProjetado} label="ISI Projetado (potencial)" size="sm" />
      </div>

      <p className="text-sm text-muted-foreground">
        Conformidade simples (sem pesos): {score.conformidadeSimples}% · Fator de unidade:{" "}
        {score.unitFactor}× · Nível de ameaça local: {score.localThreatLevel}
      </p>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Conformidade por seção</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-1 text-sm">
            {inspection.sectionBreakdown.map((s) => (
              <li key={s.sectionId} className="flex justify-between border-b py-1">
                <span>
                  {s.sectionName}{" "}
                  <span className="text-muted-foreground">(peso {s.weight})</span>
                </span>
                <span className="font-medium">{s.score}%</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Recomendações ({inspection.recommendations.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            {inspection.recommendations
              .slice()
              .sort(
                (a, b) => (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9)
              )
              .map((r) => (
                <li key={r.id}>
                  <Badge
                    variant={r.priority === "alta" ? "destructive" : "secondary"}
                    className="mr-2"
                  >
                    {PRIORITY_LABEL[r.priority] ?? r.priority}
                  </Badge>
                  {r.recommendationText}
                </li>
              ))}
          </ul>
        </CardContent>
      </Card>

      {inspection.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Observações gerais</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{inspection.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
