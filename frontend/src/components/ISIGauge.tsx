/**
 * SDI v4 — Componente ISIGauge
 *
 * Exibe o ISI como um gauge visual com:
 * - Arco colorido por faixa de classificação
 * - Valor numérico central
 * - Label de classificação
 * - Comparação com versão anterior (delta)
 */

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { classify, CLASSIFICATION_BANDS } from "@/constants/security-weights";

interface ISIGaugeProps {
  value: number;
  label?: string;
  previousValue?: number;
  size?: "sm" | "md" | "lg";
  showCard?: boolean;
}

export function ISIGauge({
  value,
  label = "ISI",
  previousValue,
  size = "md",
  showCard = true,
}: ISIGaugeProps) {
  const classification = classify(value);
  const delta = previousValue !== undefined ? value - previousValue : null;

  const sizeConfig = {
    sm: { width: 120, strokeWidth: 8, fontSize: "text-lg", labelSize: "text-xs" },
    md: { width: 160, strokeWidth: 10, fontSize: "text-2xl", labelSize: "text-sm" },
    lg: { width: 200, strokeWidth: 12, fontSize: "text-3xl", labelSize: "text-base" },
  }[size];

  const radius = (sizeConfig.width - sizeConfig.strokeWidth) / 2;
  const circumference = Math.PI * radius; // semicircle
  const progress = (value / 100) * circumference;

  const content = (
    <div className="flex flex-col items-center gap-2">
      {/* Gauge SVG */}
      <div className="relative" style={{ width: sizeConfig.width, height: sizeConfig.width / 2 + 20 }}>
        <svg
          width={sizeConfig.width}
          height={sizeConfig.width / 2 + 10}
          viewBox={`0 0 ${sizeConfig.width} ${sizeConfig.width / 2 + 10}`}
        >
          {/* Background arc */}
          <path
            d={`M ${sizeConfig.strokeWidth / 2} ${sizeConfig.width / 2} A ${radius} ${radius} 0 0 1 ${sizeConfig.width - sizeConfig.strokeWidth / 2} ${sizeConfig.width / 2}`}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth={sizeConfig.strokeWidth}
            strokeLinecap="round"
          />
          {/* Progress arc */}
          <path
            d={`M ${sizeConfig.strokeWidth / 2} ${sizeConfig.width / 2} A ${radius} ${radius} 0 0 1 ${sizeConfig.width - sizeConfig.strokeWidth / 2} ${sizeConfig.width / 2}`}
            fill="none"
            stroke={classification.color}
            strokeWidth={sizeConfig.strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${progress} ${circumference}`}
            className="transition-all duration-700 ease-out"
          />
        </svg>
        {/* Value */}
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
          <span className={`font-bold ${sizeConfig.fontSize}`} style={{ color: classification.color }}>
            {value.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Label e Classificação */}
      <div className="text-center">
        <p className={`text-muted-foreground ${sizeConfig.labelSize}`}>{label}</p>
        <Badge
          className="mt-1"
          style={{ backgroundColor: classification.bgColor, color: classification.color }}
        >
          {classification.label}
        </Badge>
      </div>

      {/* Delta (comparação com versão anterior) */}
      {delta !== null && (
        <div className={`flex items-center gap-1 ${sizeConfig.labelSize}`}>
          {delta > 0 ? (
            <>
              <TrendingUp className="w-3 h-3 text-green-600" />
              <span className="text-green-600 font-medium">+{delta.toFixed(1)}%</span>
            </>
          ) : delta < 0 ? (
            <>
              <TrendingDown className="w-3 h-3 text-red-600" />
              <span className="text-red-600 font-medium">{delta.toFixed(1)}%</span>
            </>
          ) : (
            <>
              <Minus className="w-3 h-3 text-gray-500" />
              <span className="text-gray-500">Sem alteração</span>
            </>
          )}
        </div>
      )}
    </div>
  );

  if (!showCard) return content;

  return (
    <Card>
      <CardContent className="py-6 flex justify-center">
        {content}
      </CardContent>
    </Card>
  );
}
