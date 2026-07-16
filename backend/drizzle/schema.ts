import {
  mysqlTable,
  int,
  varchar,
  text,
  boolean,
  timestamp,
  mysqlEnum,
  uniqueIndex,
} from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";

export const users = mysqlTable(
  "users",
  {
    id: int("id").autoincrement().primaryKey(),
    email: varchar("email", { length: 255 }).notNull(),
    passwordHash: varchar("password_hash", { length: 255 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    // admin: acesso total. inspetor_mpsc: cria/edita inspeções MPSC.
    // usuario_residencial: cria/edita inspeções residenciais.
    role: mysqlEnum("role", ["admin", "inspetor_mpsc", "usuario_residencial"])
      .notNull()
      .default("usuario_residencial"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    emailIdx: uniqueIndex("users_email_idx").on(table.email),
  })
);

export const checklists = mysqlTable("checklists", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  profileType: mysqlEnum("profile_type", ["residencial", "mpsc"]).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const sections = mysqlTable("sections", {
  id: int("id").autoincrement().primaryKey(),
  checklistId: int("checklist_id")
    .references(() => checklists.id)
    .notNull(),
  sectionOrder: int("section_order").notNull(),
  sectionName: varchar("section_name", { length: 255 }).notNull(),
  description: text("description"),
});

export const items = mysqlTable("items", {
  id: int("id").autoincrement().primaryKey(),
  sectionId: int("section_id")
    .references(() => sections.id)
    .notNull(),
  itemOrder: int("item_order").notNull(),
  itemText: text("item_text").notNull(),
  isSubheading: boolean("is_subheading").default(false),
});

export const inspections = mysqlTable("inspections", {
  id: int("id").autoincrement().primaryKey(),
  // uuid gerado no cliente offline; permite reconciliar duplicidade ao sincronizar
  clientUuid: varchar("client_uuid", { length: 36 }).notNull(),
  checklistId: int("checklist_id")
    .references(() => checklists.id)
    .notNull(),
  userId: int("user_id")
    .references(() => users.id)
    .notNull(),
  inspectorName: varchar("inspector_name", { length: 255 }).notNull(),
  inspectionDate: timestamp("inspection_date").defaultNow().notNull(),
  location: varchar("location", { length: 255 }),
  unitType: mysqlEnum("unit_type", [
    "Procuradoria",
    "Promotoria",
    "Sede Administrativa",
    "Anexo",
    "Residência",
    "Outro",
  ]),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  clientUuidIdx: uniqueIndex("inspections_client_uuid_idx").on(table.clientUuid),
}));

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

export const recommendations = mysqlTable("recommendations", {
  id: int("id").autoincrement().primaryKey(),
  inspectionId: int("inspection_id")
    .references(() => inspections.id)
    .notNull(),
  recommendationText: text("recommendation_text").notNull(),
  priority: mysqlEnum("priority", ["alta", "media", "baixa"]).notNull(),
});

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

export const recommendationsRelations = relations(recommendations, ({ one }) => ({
  inspection: one(inspections, {
    fields: [recommendations.inspectionId],
    references: [inspections.id],
  }),
}));
