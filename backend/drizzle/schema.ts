import {
  mysqlTable,
  int,
  varchar,
  text,
  boolean,
  timestamp,
  mysqlEnum,
  uniqueIndex,
  decimal,
} from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";

// ─── USERS ───────────────────────────────────────────────────────────────────

export const users = mysqlTable(
  "users",
  {
    id: int("id").autoincrement().primaryKey(),
    email: varchar("email", { length: 255 }).notNull(),
    passwordHash: varchar("password_hash", { length: 255 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    role: mysqlEnum("role", ["admin", "inspetor_mpsc", "usuario_residencial"])
      .notNull()
      .default("usuario_residencial"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    emailIdx: uniqueIndex("users_email_idx").on(table.email),
  })
);

// ─── USER PROFILES (perfil expandido — integração futura com RH) ─────────────

export const userProfiles = mysqlTable("user_profiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id")
    .references(() => users.id)
    .notNull()
    .unique(),
  matricula: varchar("matricula", { length: 50 }),
  cargo: varchar("cargo", { length: 255 }),
  lotacao: varchar("lotacao", { length: 255 }),
  comarca: varchar("comarca", { length: 255 }),
  telefone: varchar("telefone", { length: 20 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── UNITS (cadastro dinâmico de unidades) ───────────────────────────────────

export const units = mysqlTable("units", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 50 }),
  type: mysqlEnum("type", [
    "GAECO",
    "Isolada",
    "Administrativo",
    "Apoio Técnico",
    "Fórum de Justiça",
    "Fórum de Justiça - Ala",
    "Fórum de Justiça - Sala de apoio",
    "Terreno",
    "Residência",
    "Outro",
  ]).notNull(),
  status: mysqlEnum("status", ["ativa", "inativa", "em_comissionamento"])
    .notNull()
    .default("ativa"),
  comarca: varchar("comarca", { length: 255 }),
  endereco: text("endereco"),
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  isIsolated: boolean("is_isolated").default(false),
  distanceFromSede: decimal("distance_from_sede", { precision: 6, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── CHECKLISTS ──────────────────────────────────────────────────────────────

export const checklists = mysqlTable("checklists", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  profileType: mysqlEnum("profile_type", ["residencial", "mpsc"]).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── SECTIONS ────────────────────────────────────────────────────────────────

export const sections = mysqlTable("sections", {
  id: int("id").autoincrement().primaryKey(),
  checklistId: int("checklist_id")
    .references(() => checklists.id)
    .notNull(),
  sectionOrder: int("section_order").notNull(),
  sectionName: varchar("section_name", { length: 255 }).notNull(),
  description: text("description"),
  weight: int("weight").notNull().default(1),
});

// ─── ITEMS ───────────────────────────────────────────────────────────────────

export const items = mysqlTable("items", {
  id: int("id").autoincrement().primaryKey(),
  sectionId: int("section_id")
    .references(() => sections.id)
    .notNull(),
  itemOrder: int("item_order").notNull(),
  itemText: text("item_text").notNull(),
  isSubheading: boolean("is_subheading").default(false),
  // NOVO: indica que a pontuação é invertida (Sim=0, Não=1)
  isInverted: boolean("is_inverted").default(false),
});

// ─── INSPECTIONS (com versionamento) ─────────────────────────────────────────

export const inspections = mysqlTable(
  "inspections",
  {
    id: int("id").autoincrement().primaryKey(),
    clientUuid: varchar("client_uuid", { length: 36 }).notNull(),
    checklistId: int("checklist_id")
      .references(() => checklists.id)
      .notNull(),
    userId: int("user_id")
      .references(() => users.id)
      .notNull(),
    // NOVO: referência à unidade cadastrada
    unitId: int("unit_id").references(() => units.id),
    inspectorName: varchar("inspector_name", { length: 255 }).notNull(),
    inspectionDate: timestamp("inspection_date").defaultNow().notNull(),
    location: varchar("location", { length: 255 }),
    unitType: mysqlEnum("unit_type", [
      "GAECO",
      "Isolada",
      "Administrativo",
      "Apoio Técnico",
      "Fórum de Justiça",
      "Fórum de Justiça - Ala",
      "Fórum de Justiça - Sala de apoio",
      "Terreno",
      "Residência",
      "Outro",
    ]),
    localThreatLevel: decimal("local_threat_level", { precision: 3, scale: 2 })
      .notNull()
      .default("1.00"),
    // NOVO: versionamento
    version: int("version").notNull().default(1),
    previousInspectionId: int("previous_inspection_id"),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    clientUuidIdx: uniqueIndex("inspections_client_uuid_idx").on(
      table.clientUuid
    ),
  })
);

// ─── ANSWERS ─────────────────────────────────────────────────────────────────

export const answers = mysqlTable("answers", {
  id: int("id").autoincrement().primaryKey(),
  inspectionId: int("inspection_id")
    .references(() => inspections.id)
    .notNull(),
  itemId: int("item_id")
    .references(() => items.id)
    .notNull(),
  status: mysqlEnum("status", ["Sim", "Não", "Parcialmente", "N/A"]).notNull(),
  observations: text("observations"),
});

// ─── RECOMMENDATIONS ─────────────────────────────────────────────────────────

export const recommendations = mysqlTable("recommendations", {
  id: int("id").autoincrement().primaryKey(),
  inspectionId: int("inspection_id")
    .references(() => inspections.id)
    .notNull(),
  recommendationText: text("recommendation_text").notNull(),
  priority: mysqlEnum("priority", ["alta", "media", "baixa"]).notNull(),
});

// ─── RELATIONS ───────────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ one, many }) => ({
  profile: one(userProfiles, {
    fields: [users.id],
    references: [userProfiles.userId],
  }),
  inspections: many(inspections),
}));

export const userProfilesRelations = relations(userProfiles, ({ one }) => ({
  user: one(users, {
    fields: [userProfiles.userId],
    references: [users.id],
  }),
}));

export const unitsRelations = relations(units, ({ many }) => ({
  inspections: many(inspections),
}));

export const checklistsRelations = relations(checklists, ({ many }) => ({
  sections: many(sections),
  inspections: many(inspections),
}));

export const sectionsRelations = relations(sections, ({ one, many }) => ({
  checklist: one(checklists, {
    fields: [sections.checklistId],
    references: [checklists.id],
  }),
  items: many(items),
}));

export const itemsRelations = relations(items, ({ one, many }) => ({
  section: one(sections, {
    fields: [items.sectionId],
    references: [sections.id],
  }),
  answers: many(answers),
}));

export const inspectionsRelations = relations(inspections, ({ one, many }) => ({
  checklist: one(checklists, {
    fields: [inspections.checklistId],
    references: [checklists.id],
  }),
  user: one(users, {
    fields: [inspections.userId],
    references: [users.id],
  }),
  unit: one(units, {
    fields: [inspections.unitId],
    references: [units.id],
  }),
  answers: many(answers),
  recommendations: many(recommendations),
}));

export const answersRelations = relations(answers, ({ one }) => ({
  inspection: one(inspections, {
    fields: [answers.inspectionId],
    references: [inspections.id],
  }),
  item: one(items, {
    fields: [answers.itemId],
    references: [items.id],
  }),
}));

export const recommendationsRelations = relations(
  recommendations,
  ({ one }) => ({
    inspection: one(inspections, {
      fields: [recommendations.inspectionId],
      references: [inspections.id],
    }),
  })
);
