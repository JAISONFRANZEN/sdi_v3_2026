/**
 * SDI v4 — Tipos e Interfaces do Sistema de Diagnóstico de Segurança
 */

// ─── ENUMS ───────────────────────────────────────────────────────────────────

export type AnswerStatus = "Sim" | "Não" | "Parcialmente" | "N/A";

export type UserRole = "admin" | "inspetor_mpsc" | "usuario_residencial";

export type UnitStatus = "ativa" | "inativa" | "em_comissionamento";

export type UnitType =
  | "GAECO"
  | "Isolada"
  | "Administrativo"
  | "Apoio Técnico"
  | "Fórum de Justiça"
  | "Fórum de Justiça - Ala"
  | "Fórum de Justiça - Sala de apoio"
  | "Terreno"
  | "Residência"
  | "Outro";

export type ProfileType = "mpsc" | "residencial";

export type Priority = "alta" | "media" | "baixa";

// ─── USUÁRIO ─────────────────────────────────────────────────────────────────

export interface User {
  id: number;
  openId: string;
  name: string | null;
  email: string | null;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
  lastSignedIn: Date;
}

export interface UserProfile {
  id: number;
  userId: number;
  matricula: string | null;
  cargo: string | null;
  lotacao: string | null;
  comarca: string | null;
  telefone: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// ─── UNIDADE ─────────────────────────────────────────────────────────────────

export interface Unit {
  id: number;
  name: string;
  code: string | null;
  type: UnitType;
  status: UnitStatus;
  comarca: string | null;
  endereco: string | null;
  latitude: number | null;
  longitude: number | null;
  isIsolated: boolean;
  distanceFromSede: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUnitInput {
  name: string;
  code?: string;
  type: UnitType;
  status?: UnitStatus;
  comarca?: string;
  endereco?: string;
  latitude?: number;
  longitude?: number;
  isIsolated?: boolean;
  distanceFromSede?: number;
}

export interface UpdateUnitInput extends Partial<CreateUnitInput> {
  id: number;
}

// ─── CHECKLIST ───────────────────────────────────────────────────────────────

export interface Checklist {
  id: number;
  name: string;
  profileType: ProfileType;
  description: string | null;
  createdAt: Date;
}

export interface Section {
  id: number;
  checklistId: number;
  name: string;
  sectionOrder: number;
  weight: number;
}

export interface Item {
  id: number;
  sectionId: number;
  text: string;
  itemOrder: number;
  isInverted: boolean;
  // Linha de subtítulo dentro da seção (ex.: "9.1. Inundações e Alagamentos").
  // Não é respondível e fica fora de progresso e cálculo.
  isSubheading?: boolean;
}

export interface SectionWithItems extends Section {
  items: Item[];
}

export interface ChecklistFull extends Checklist {
  sections: SectionWithItems[];
}

// ─── INSPEÇÃO ────────────────────────────────────────────────────────────────

export interface Inspection {
  id: number;
  checklistId: number;
  userId: number;
  unitId: number | null;
  unitName: string;
  unitType: string;
  inspectorName: string;
  localThreatLevel: number;
  isiBase: number;
  isi: number;
  isiAjustado: number;
  isiProjetado: number;
  conformidadeSimples: number;
  classification: string;
  version: number;
  previousInspectionId: number | null;
  observations: string | null;
  createdAt: Date;
}

export interface InspectionAnswer {
  id: number;
  inspectionId: number;
  itemId: number;
  status: AnswerStatus;
  observations: string | null;
}

export interface InspectionWithAnswers extends Inspection {
  answers: InspectionAnswer[];
}

// ─── RECOMENDAÇÃO ────────────────────────────────────────────────────────────

export interface Recommendation {
  id: number;
  inspectionId: number;
  itemId: number;
  text: string;
  priority: Priority;
  resolved: boolean;
  resolvedAt: Date | null;
  createdAt: Date;
}

// ─── RELATÓRIO (VERSIONAMENTO) ───────────────────────────────────────────────

export interface InspectionVersion {
  version: number;
  inspectionId: number;
  date: Date;
  isi: number;
  classification: string;
  inspectorName: string;
}

export interface VersionComparison {
  previousVersion: InspectionVersion;
  currentVersion: InspectionVersion;
  isiDelta: number;
  improved: boolean;
  itemsChanged: number;
  itemsImproved: number;
  itemsWorsened: number;
}

// ─── ANALYTICS ───────────────────────────────────────────────────────────────

export interface AnalyticsSummary {
  totalInspections: number;
  averageISI: number;
  averageConformidade: number;
  criticalUnits: number;
  totalUnits: number;
  bestSection: { name: string; score: number };
  worstSection: { name: string; score: number };
}

export interface SectionAnalytics {
  sectionOrder: number;
  sectionName: string;
  averageScore: number;
  weight: number;
}

export interface UnitRanking {
  unitId: number;
  unitName: string;
  unitType: UnitType;
  comarca: string | null;
  isIsolated: boolean;
  lastISI: number;
  lastClassification: string;
  totalInspections: number;
  lastInspectionDate: Date;
}

// ─── FORMULÁRIO ──────────────────────────────────────────────────────────────

export interface InspectionFormData {
  checklistId: number;
  unitId?: number;
  unitName: string;
  unitType: string;
  localThreatLevel: number;
  observations?: string;
  answers: {
    itemId: number;
    status: AnswerStatus;
    observations?: string;
  }[];
}
