/**
 * SDI v4 — Componente InspectionForm
 *
 * Formulário de inspeção com visual Lovable:
 * - Tabs por seção com indicador de progresso
 * - Cards para cada item com radio buttons estilizados
 * - ISI em tempo real no topo
 * - Pré-preenchimento visual (itens importados ficam com borda azul)
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { AlertTriangle, CheckCircle2, XCircle, MinusCircle, HelpCircle, ChevronRight, ChevronLeft, Save } from "lucide-react";
import type { ChecklistFull, AnswerStatus } from "@/types/inspection";
import { useInspection } from "@/hooks/useInspection";
import type { Unit } from "@/types/inspection";

interface InspectionFormProps {
  checklist: ChecklistFull;
  selectedUnit?: Unit | null;
  previousAnswers?: { itemId: number; status: AnswerStatus; observations?: string }[];
  profileType: "mpsc" | "residencial";
  onSubmit: (data: ReturnType<ReturnType<typeof useInspection>["getFormData"]>) => void;
  isSubmitting?: boolean;
}

const STATUS_OPTIONS: { value: AnswerStatus; label: string; icon: React.ReactNode; color: string }[] = [
  { value: "Sim", label: "Sim", icon: <CheckCircle2 className="w-4 h-4" />, color: "text-green-600 border-green-200 bg-green-50" },
  { value: "Parcialmente", label: "Parcial", icon: <MinusCircle className="w-4 h-4" />, color: "text-yellow-600 border-yellow-200 bg-yellow-50" },
  { value: "Não", label: "Não", icon: <XCircle className="w-4 h-4" />, color: "text-red-600 border-red-200 bg-red-50" },
  { value: "N/A", label: "N/A", icon: <HelpCircle className="w-4 h-4" />, color: "text-gray-500 border-gray-200 bg-gray-50" },
];

export function InspectionForm({
  checklist,
  selectedUnit,
  previousAnswers,
  profileType,
  onSubmit,
  isSubmitting = false,
}: InspectionFormProps) {
  const {
    answers,
    setAnswer,
    setItemObservation,
    currentSection,
    setCurrentSection,
    liveResult,
    progress,
    sectionProgress,
    getFormData,
  } = useInspection({ checklist, selectedUnit, previousAnswers, profileType });

  const [expandedObs, setExpandedObs] = useState<Set<number>>(new Set());

  const toggleObservation = (itemId: number) => {
    setExpandedObs((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  const handleSubmit = () => {
    const data = getFormData();
    if (data) onSubmit(data);
  };

  const sections = checklist.sections;
  const currentSectionData = sections[currentSection];

  return (
    <div className="space-y-6">
      {/* ─── ISI em Tempo Real ─── */}
      {liveResult && (
        <Card className="border-l-4" style={{ borderLeftColor: liveResult.classification.color }}>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">ISI em Tempo Real</p>
                <p className="text-2xl font-bold" style={{ color: liveResult.classification.color }}>
                  {liveResult.isi}%
                </p>
              </div>
              <Badge style={{ backgroundColor: liveResult.classification.bgColor, color: liveResult.classification.color }}>
                {liveResult.classification.label}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── Progresso Geral ─── */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Progresso</span>
            <span className="text-sm text-muted-foreground">
              {progress.answered}/{progress.total} itens ({progress.percentage}%)
            </span>
          </div>
          <Progress value={progress.percentage} className="h-2" />
        </CardContent>
      </Card>

      {/* ─── Tabs de Seções ─── */}
      <Tabs value={String(currentSection)} onValueChange={(v) => setCurrentSection(Number(v))}>
        <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
          {sections.map((section, idx) => {
            const sp = sectionProgress[idx];
            return (
              <TabsTrigger
                key={section.id}
                value={String(idx)}
                className="relative text-xs px-3 py-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                S{section.sectionOrder}
                {sp?.isComplete && (
                  <CheckCircle2 className="w-3 h-3 ml-1 text-green-500" />
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {sections.map((section, idx) => (
          <TabsContent key={section.id} value={String(idx)} className="mt-4 space-y-4">
            {/* Cabeçalho da Seção */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">
                  S{section.sectionOrder}. {section.name}
                </h3>
                <p className="text-sm text-muted-foreground">
                  Peso: {section.weight} | {sectionProgress[idx]?.total ?? section.items.length} itens
                </p>
              </div>
              <Badge variant="outline">
                {sectionProgress[idx]?.answered ?? 0}/{sectionProgress[idx]?.total ?? section.items.length}
              </Badge>
            </div>

            {/* Itens da Seção */}
            {(() => {
              let questionNumber = 0;
              return section.items.map((item) => {
              if (item.isSubheading) {
                return (
                  <h4 key={item.id} className="text-sm font-semibold text-muted-foreground pt-2">
                    {item.text}
                  </h4>
                );
              }
              questionNumber++;
              const itemIdx = questionNumber - 1;
              const answer = answers.get(item.id);
              const isPrefilled = previousAnswers?.some((pa) => pa.itemId === item.id);

              return (
                <Card
                  key={item.id}
                  className={`transition-all ${
                    isPrefilled && !answer?.status ? "border-blue-200 bg-blue-50/30" : ""
                  } ${answer?.status === "Não" ? "border-red-200" : ""}`}
                >
                  <CardContent className="py-4 space-y-3">
                    {/* Texto do item */}
                    <div className="flex gap-2">
                      <span className="text-sm font-medium text-muted-foreground min-w-[2rem]">
                        {section.sectionOrder}.{itemIdx + 1}
                      </span>
                      <div className="flex-1">
                        <p className="text-sm leading-relaxed">{item.text}</p>
                        {item.isInverted && (
                          <Badge variant="outline" className="mt-1 text-xs text-amber-600 border-amber-300">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Pontuação invertida
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Radio buttons */}
                    <RadioGroup
                      value={answer?.status ?? ""}
                      onValueChange={(v) => setAnswer(item.id, v as AnswerStatus)}
                      className="flex flex-wrap gap-2"
                    >
                      {STATUS_OPTIONS.map((opt) => (
                        <div key={opt.value} className="flex items-center">
                          <RadioGroupItem value={opt.value} id={`${item.id}-${opt.value}`} className="sr-only" />
                          <Label
                            htmlFor={`${item.id}-${opt.value}`}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border cursor-pointer transition-all text-sm ${
                              answer?.status === opt.value
                                ? opt.color + " font-medium ring-2 ring-offset-1 ring-current"
                                : "text-muted-foreground border-border hover:bg-muted/50"
                            }`}
                          >
                            {opt.icon}
                            {opt.label}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>

                    {/* Observações */}
                    <div>
                      <button
                        type="button"
                        onClick={() => toggleObservation(item.id)}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {expandedObs.has(item.id) ? "▾ Ocultar observação" : "▸ Adicionar observação"}
                      </button>
                      {expandedObs.has(item.id) && (
                        <Textarea
                          placeholder="Observação sobre este item..."
                          value={answer?.observations ?? ""}
                          onChange={(e) => setItemObservation(item.id, e.target.value)}
                          className="mt-2 text-sm min-h-[60px]"
                        />
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
              });
            })()}

            {/* Navegação entre seções */}
            <div className="flex justify-between pt-4">
              <Button
                variant="outline"
                onClick={() => setCurrentSection(Math.max(0, currentSection - 1))}
                disabled={currentSection === 0}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Anterior
              </Button>

              {currentSection < sections.length - 1 ? (
                <Button
                  onClick={() => setCurrentSection(currentSection + 1)}
                >
                  Próxima
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting || progress.answered === 0}
                  className="bg-green-700 hover:bg-green-800"
                >
                  <Save className="w-4 h-4 mr-1" />
                  {isSubmitting ? "Salvando..." : "Salvar Inspeção"}
                </Button>
              )}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
