import React from "react";
import type { AnswerStatus } from "../lib/offlineDb";

export interface ChecklistItem {
  id: number;
  itemText: string;
  itemOrder: number;
  isSubheading: boolean | null;
}

export interface ChecklistSection {
  id: number;
  sectionName: string;
  sectionOrder: number;
  items: ChecklistItem[];
}

const STATUS_OPTIONS: AnswerStatus[] = ["Sim", "Parcialmente", "Não", "N/A"];

interface Props {
  section: ChecklistSection;
  answersByItemId: Record<number, { status: AnswerStatus; observations?: string }>;
  onChange: (itemId: number, status: AnswerStatus) => void;
  onObservationChange: (itemId: number, observations: string) => void;
}

// Componente reutilizável: renderiza uma seção do checklist recebendo os
// dados via props, independentemente do perfil (residencial ou MPSC).
export default function SectionCard({ section, answersByItemId, onChange, onObservationChange }: Props) {
  return (
    <div className="section-card">
      <h2>{section.sectionName}</h2>
      {section.items.map((item) =>
        item.isSubheading ? (
          <div className="section-subheading" key={item.id}>
            {item.itemText}
          </div>
        ) : (
          <div className="item-row" key={item.id}>
            <span>{item.itemText}</span>
            <div className="status-options">
              {STATUS_OPTIONS.map((status) => (
                <label key={status}>
                  <input
                    type="radio"
                    name={`item-${item.id}`}
                    checked={answersByItemId[item.id]?.status === status}
                    onChange={() => onChange(item.id, status)}
                  />
                  {status}
                </label>
              ))}
              <input
                type="text"
                placeholder="Observações"
                value={answersByItemId[item.id]?.observations ?? ""}
                onChange={(e) => onObservationChange(item.id, e.target.value)}
                style={{ width: 140 }}
              />
            </div>
          </div>
        )
      )}
    </div>
  );
}
