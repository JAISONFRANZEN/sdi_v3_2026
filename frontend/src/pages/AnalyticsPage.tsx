import { Link, useParams } from "react-router-dom";
import { trpc } from "../lib/trpc";
import { getCachedChecklistIndex, resolveChecklistId } from "../lib/checklistIndex";
import { ISIGauge } from "@/components/ISIGauge";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function AnalyticsPage() {
  const { profileType } = useParams();
  const checklistId = resolveChecklistId(getCachedChecklistIndex(), profileType);

  const query = trpc.analytics.summary.useQuery(
    { checklistId: checklistId as number },
    { enabled: checklistId != null, retry: 1 }
  );

  if (checklistId == null)
    return (
      <p>Abra "Nova Inspeção" ou "Inspeções" primeiro para carregar os dados do checklist.</p>
    );
  if (query.isLoading) return <p>Carregando...</p>;
  if (query.isError || !query.data)
    return <p>Não foi possível carregar a análise (é preciso estar online).</p>;

  const { totalInspections, averageISI, criticalUnits, inspections } = query.data;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">
        Análise — {profileType === "mpsc" ? "MPSC" : "Residencial"}
      </h1>

      <div className="grid gap-4 sm:grid-cols-3">
        <ISIGauge value={averageISI} label="ISI médio" />
        <Card>
          <CardContent className="py-6 text-center">
            <p className="text-3xl font-bold">{totalInspections}</p>
            <p className="text-sm text-muted-foreground">Inspeções realizadas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-6 text-center">
            <p className="text-3xl font-bold text-red-600">{criticalUnits}</p>
            <p className="text-sm text-muted-foreground">Inspeções com ISI &lt; 50% (críticas)</p>
          </CardContent>
        </Card>
      </div>

      <h2 className="text-lg font-semibold">Ranking por inspeção</h2>
      <ul className="space-y-2">
        {inspections
          .slice()
          .sort((a, b) => a.isi - b.isi)
          .map((i) => (
            <li key={i.inspectionId}>
              <Link
                to={`/checklist/${profileType}/inspections/${i.inspectionId}`}
                className="flex items-center justify-between rounded-md border p-3 hover:bg-muted/50 transition-colors"
              >
                <span className="text-sm">
                  {i.location || i.unitType || `Inspeção #${i.inspectionId}`}{" "}
                  <span className="text-muted-foreground">
                    · v{i.version} · {new Date(i.inspectionDate).toLocaleDateString("pt-BR")}
                  </span>
                </span>
                <Badge
                  style={{
                    backgroundColor: i.classification.color + "22",
                    color: i.classification.color,
                  }}
                >
                  ISI {i.isi}% — {i.classification.label}
                </Badge>
              </Link>
            </li>
          ))}
      </ul>
    </div>
  );
}
