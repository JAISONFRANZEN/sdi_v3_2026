import { initTRPC, TRPCError } from "@trpc/server";
import { z } from "zod";
import { eq, and, desc, sql } from "drizzle-orm";
import type { Context } from "./context";
import { getDb } from "./db";
import {
  checklists,
  sections,
  items,
  inspections,
  answers,
  recommendations,
  users,
  units,
  userProfiles,
} from "../drizzle/schema";
import {
  hashPassword,
  verifyPassword,
  signToken,
  canWriteProfile,
} from "./auth";
import { riskScoreEngine } from "./riskEngine";

const t = initTRPC.context<Context>().create();

const publicProcedure = t.procedure;

const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
  return next({ ctx });
});

// ─── INPUT SCHEMAS ───────────────────────────────────────────────────────────

const answerInputSchema = z.object({
  itemId: z.number(),
  status: z.enum(["Sim", "Não", "Parcialmente", "N/A"]),
  observations: z.string().optional(),
});

const unitTypeEnum = z.enum([
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
]);

const unitStatusEnum = z.enum(["ativa", "inativa", "em_comissionamento"]);

const inspectionSyncSchema = z.object({
  clientUuid: z.string().uuid(),
  checklistId: z.number(),
  inspectorName: z.string().min(1),
  location: z.string().optional(),
  unitId: z.number().optional(),
  unitType: unitTypeEnum.optional(),
  localThreatLevel: z.number().min(1).max(2).optional(),
  notes: z.string().optional(),
  answers: z.array(answerInputSchema),
});

// ─── ROUTER ──────────────────────────────────────────────────────────────────

export const appRouter = t.router({
  // ─── AUTH ────────────────────────────────────────────────────────────────────

  auth: t.router({
    register: publicProcedure
      .input(
        z.object({
          email: z.string().email(),
          password: z.string().min(8),
          name: z.string().min(1),
          role: z
            .enum(["admin", "inspetor_mpsc", "usuario_residencial"])
            .default("usuario_residencial"),
        })
      )
      .mutation(async ({ input }) => {
        const db = getDb();
        const existing = await db.query.users.findFirst({
          where: eq(users.email, input.email),
        });
        if (existing) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "E-mail já cadastrado",
          });
        }
        const passwordHash = hashPassword(input.password);
        const [result] = await db.insert(users).values({
          email: input.email,
          passwordHash,
          name: input.name,
          role: input.role,
        });
        const token = signToken({
          userId: result.insertId,
          email: input.email,
          role: input.role,
        });
        return { token, name: input.name, role: input.role };
      }),

    login: publicProcedure
      .input(z.object({ email: z.string().email(), password: z.string() }))
      .mutation(async ({ input }) => {
        const db = getDb();
        const user = await db.query.users.findFirst({
          where: eq(users.email, input.email),
        });
        if (!user || !verifyPassword(input.password, user.passwordHash)) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Credenciais inválidas",
          });
        }
        const token = signToken({
          userId: user.id,
          email: user.email,
          role: user.role,
        });

        // Buscar perfil expandido
        const profile = await db.query.userProfiles.findFirst({
          where: eq(userProfiles.userId, user.id),
        });

        return {
          token,
          name: user.name,
          role: user.role,
          profile: profile ?? null,
        };
      }),

    me: protectedProcedure.query(async ({ ctx }) => {
      const db = getDb();
      const user = await db.query.users.findFirst({
        where: eq(users.id, ctx.user.userId),
      });
      if (!user) throw new TRPCError({ code: "NOT_FOUND" });

      const profile = await db.query.userProfiles.findFirst({
        where: eq(userProfiles.userId, user.id),
      });

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        profile: profile ?? null,
      };
    }),
  }),

  // ─── PROFILE (perfil expandido) ─────────────────────────────────────────────

  profile: t.router({
    get: protectedProcedure.query(async ({ ctx }) => {
      const db = getDb();
      const profile = await db.query.userProfiles.findFirst({
        where: eq(userProfiles.userId, ctx.user.userId),
      });
      return profile ?? null;
    }),

    upsert: protectedProcedure
      .input(
        z.object({
          matricula: z.string().optional(),
          cargo: z.string().optional(),
          lotacao: z.string().optional(),
          comarca: z.string().optional(),
          telefone: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const db = getDb();
        const existing = await db.query.userProfiles.findFirst({
          where: eq(userProfiles.userId, ctx.user.userId),
        });

        if (existing) {
          await db
            .update(userProfiles)
            .set({ ...input, updatedAt: new Date() })
            .where(eq(userProfiles.userId, ctx.user.userId));
        } else {
          await db.insert(userProfiles).values({
            userId: ctx.user.userId,
            ...input,
          });
        }

        return { success: true };
      }),
  }),

  // ─── UNITS (CRUD de unidades) ───────────────────────────────────────────────

  units: t.router({
    list: protectedProcedure
      .input(
        z
          .object({
            status: unitStatusEnum.optional(),
            type: unitTypeEnum.optional(),
            comarca: z.string().optional(),
            isIsolated: z.boolean().optional(),
          })
          .optional()
      )
      .query(async ({ input }) => {
        const db = getDb();
        let query = db.select().from(units);

        // Filtros dinâmicos
        const conditions = [];
        if (input?.status) conditions.push(eq(units.status, input.status));
        if (input?.type) conditions.push(eq(units.type, input.type));
        if (input?.comarca) conditions.push(eq(units.comarca, input.comarca));
        if (input?.isIsolated !== undefined)
          conditions.push(eq(units.isIsolated, input.isIsolated));

        if (conditions.length > 0) {
          return db
            .select()
            .from(units)
            .where(and(...conditions))
            .orderBy(units.name);
        }

        return db.select().from(units).orderBy(units.name);
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const db = getDb();
        const unit = await db.query.units.findFirst({
          where: eq(units.id, input.id),
        });
        if (!unit) throw new TRPCError({ code: "NOT_FOUND" });

        // Buscar histórico de inspeções desta unidade
        const unitInspections = await db
          .select()
          .from(inspections)
          .where(eq(inspections.unitId, input.id))
          .orderBy(desc(inspections.inspectionDate));

        return { ...unit, inspections: unitInspections };
      }),

    create: protectedProcedure
      .input(
        z.object({
          name: z.string().min(1),
          code: z.string().optional(),
          type: unitTypeEnum,
          status: unitStatusEnum.default("ativa"),
          comarca: z.string().optional(),
          endereco: z.string().optional(),
          latitude: z.number().optional(),
          longitude: z.number().optional(),
          isIsolated: z.boolean().default(false),
          distanceFromSede: z.number().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const db = getDb();
        const [result] = await db.insert(units).values({
          name: input.name,
          code: input.code,
          type: input.type,
          status: input.status,
          comarca: input.comarca,
          endereco: input.endereco,
          latitude: input.latitude?.toFixed(7),
          longitude: input.longitude?.toFixed(7),
          isIsolated: input.isIsolated,
          distanceFromSede: input.distanceFromSede?.toFixed(2),
        });
        return { id: result.insertId };
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().min(1).optional(),
          code: z.string().optional(),
          type: unitTypeEnum.optional(),
          status: unitStatusEnum.optional(),
          comarca: z.string().optional(),
          endereco: z.string().optional(),
          latitude: z.number().optional(),
          longitude: z.number().optional(),
          isIsolated: z.boolean().optional(),
          distanceFromSede: z.number().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const db = getDb();
        const { id, ...data } = input;
        const updateData: Record<string, unknown> = {};

        if (data.name !== undefined) updateData.name = data.name;
        if (data.code !== undefined) updateData.code = data.code;
        if (data.type !== undefined) updateData.type = data.type;
        if (data.status !== undefined) updateData.status = data.status;
        if (data.comarca !== undefined) updateData.comarca = data.comarca;
        if (data.endereco !== undefined) updateData.endereco = data.endereco;
        if (data.latitude !== undefined)
          updateData.latitude = data.latitude.toFixed(7);
        if (data.longitude !== undefined)
          updateData.longitude = data.longitude.toFixed(7);
        if (data.isIsolated !== undefined)
          updateData.isIsolated = data.isIsolated;
        if (data.distanceFromSede !== undefined)
          updateData.distanceFromSede = data.distanceFromSede.toFixed(2);

        await db.update(units).set(updateData).where(eq(units.id, id));
        return { success: true };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = getDb();
        await db.delete(units).where(eq(units.id, input.id));
        return { success: true };
      }),
  }),

  // ─── CHECKLISTS ─────────────────────────────────────────────────────────────

  checklists: t.router({
    list: publicProcedure.query(async () => {
      const db = getDb();
      return db.query.checklists.findMany();
    }),

    getFull: publicProcedure
      .input(z.object({ checklistId: z.number() }))
      .query(async ({ input }) => {
        const db = getDb();
        const checklist = await db.query.checklists.findFirst({
          where: eq(checklists.id, input.checklistId),
        });
        if (!checklist) throw new TRPCError({ code: "NOT_FOUND" });

        const sectionRows = await db.query.sections.findMany({
          where: eq(sections.checklistId, input.checklistId),
          orderBy: (s, { asc }) => [asc(s.sectionOrder)],
        });

        const sectionsWithItems = await Promise.all(
          sectionRows.map(async (section) => {
            const itemRows = await db.query.items.findMany({
              where: eq(items.sectionId, section.id),
              orderBy: (i, { asc }) => [asc(i.itemOrder)],
            });
            return { ...section, items: itemRows };
          })
        );

        return { ...checklist, sections: sectionsWithItems };
      }),
  }),

  // ─── INSPECTIONS (com versionamento e pré-preenchimento) ────────────────────

  inspections: t.router({
    list: protectedProcedure
      .input(
        z
          .object({
            checklistId: z.number().optional(),
            unitId: z.number().optional(),
          })
          .optional()
      )
      .query(async ({ input }) => {
        const db = getDb();
        const conditions = [];
        if (input?.checklistId)
          conditions.push(eq(inspections.checklistId, input.checklistId));
        if (input?.unitId)
          conditions.push(eq(inspections.unitId, input.unitId));

        if (conditions.length > 0) {
          return db
            .select()
            .from(inspections)
            .where(and(...conditions))
            .orderBy(desc(inspections.inspectionDate));
        }
        return db
          .select()
          .from(inspections)
          .orderBy(desc(inspections.inspectionDate));
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const db = getDb();
        const inspection = await db.query.inspections.findFirst({
          where: eq(inspections.id, input.id),
        });
        if (!inspection) throw new TRPCError({ code: "NOT_FOUND" });

        const answerRows = await db.query.answers.findMany({
          where: eq(answers.inspectionId, input.id),
        });
        const recommendationRows = await db.query.recommendations.findMany({
          where: eq(recommendations.inspectionId, input.id),
        });
        const score = await riskScoreEngine.calculateScore(input.id);
        const sectionBreakdown =
          await riskScoreEngine.calculateSectionBreakdown(input.id);

        return {
          ...inspection,
          answers: answerRows,
          recommendations: recommendationRows,
          score,
          sectionBreakdown,
        };
      }),

    // Buscar última inspeção de uma unidade para pré-preenchimento
    getLastByUnit: protectedProcedure
      .input(
        z.object({
          unitId: z.number(),
          checklistId: z.number(),
        })
      )
      .query(async ({ input }) => {
        const db = getDb();
        const lastInspection = await db
          .select()
          .from(inspections)
          .where(
            and(
              eq(inspections.unitId, input.unitId),
              eq(inspections.checklistId, input.checklistId)
            )
          )
          .orderBy(desc(inspections.version))
          .limit(1);

        if (lastInspection.length === 0) return null;

        const inspection = lastInspection[0];
        const answerRows = await db.query.answers.findMany({
          where: eq(answers.inspectionId, inspection.id),
        });

        return {
          ...inspection,
          answers: answerRows,
        };
      }),

    // Sincronizar inspeção (com versionamento automático)
    sync: protectedProcedure
      .input(inspectionSyncSchema)
      .mutation(async ({ ctx, input }) => {
        const db = getDb();
        const checklist = await db.query.checklists.findFirst({
          where: eq(checklists.id, input.checklistId),
        });
        if (!checklist)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Checklist inválido",
          });

        if (!canWriteProfile(ctx.user.role, checklist.profileType)) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        // Verificar se já existe (idempotência por clientUuid)
        const existing = await db.query.inspections.findFirst({
          where: eq(inspections.clientUuid, input.clientUuid),
        });

        // Calcular versão: buscar última versão da mesma unidade
        let version = 1;
        let previousInspectionId: number | undefined;

        if (input.unitId && !existing) {
          const lastVersion = await db
            .select({ version: inspections.version, id: inspections.id })
            .from(inspections)
            .where(
              and(
                eq(inspections.unitId, input.unitId),
                eq(inspections.checklistId, input.checklistId)
              )
            )
            .orderBy(desc(inspections.version))
            .limit(1);

          if (lastVersion.length > 0) {
            version = lastVersion[0].version + 1;
            previousInspectionId = lastVersion[0].id;
          }
        }

        let inspectionId: number;
        if (existing) {
          inspectionId = existing.id;
          await db
            .update(inspections)
            .set({
              inspectorName: input.inspectorName,
              location: input.location,
              unitId: input.unitId,
              unitType: input.unitType,
              localThreatLevel:
                input.localThreatLevel != null
                  ? input.localThreatLevel.toFixed(2)
                  : undefined,
              notes: input.notes,
            })
            .where(eq(inspections.id, inspectionId));
          await db
            .delete(answers)
            .where(eq(answers.inspectionId, inspectionId));
          await db
            .delete(recommendations)
            .where(eq(recommendations.inspectionId, inspectionId));
        } else {
          const [result] = await db.insert(inspections).values({
            clientUuid: input.clientUuid,
            checklistId: input.checklistId,
            userId: ctx.user.userId,
            unitId: input.unitId,
            inspectorName: input.inspectorName,
            location: input.location,
            unitType: input.unitType,
            localThreatLevel:
              input.localThreatLevel != null
                ? input.localThreatLevel.toFixed(2)
                : undefined,
            version,
            previousInspectionId,
            notes: input.notes,
          });
          inspectionId = result.insertId;
        }

        // Inserir respostas
        for (const answer of input.answers) {
          await db.insert(answers).values({
            inspectionId,
            itemId: answer.itemId,
            status: answer.status,
            observations: answer.observations,
          });
        }

        // Gerar recomendações
        const generated = await riskScoreEngine.generateRecommendations(
          input.answers
        );
        for (const rec of generated) {
          await db.insert(recommendations).values({
            inspectionId,
            recommendationText: rec.recommendationText,
            priority: rec.priority,
          });
        }

        const score = await riskScoreEngine.calculateScore(inspectionId);

        return { inspectionId, clientUuid: input.clientUuid, version, score };
      }),
  }),

  // ─── ANALYTICS ──────────────────────────────────────────────────────────────

  analytics: t.router({
    summary: protectedProcedure
      .input(
        z.object({
          checklistId: z.number(),
          unitId: z.number().optional(),
        })
      )
      .query(async ({ input }) => {
        const db = getDb();

        const conditions = [eq(inspections.checklistId, input.checklistId)];
        if (input.unitId) conditions.push(eq(inspections.unitId, input.unitId));

        const inspectionRows = await db
          .select()
          .from(inspections)
          .where(and(...conditions))
          .orderBy(desc(inspections.inspectionDate));

        const scored = await Promise.all(
          inspectionRows.map(async (i) => {
            const score = await riskScoreEngine.calculateScore(i.id);
            return {
              inspectionId: i.id,
              location: i.location,
              unitType: i.unitType,
              unitId: i.unitId,
              version: i.version,
              inspectionDate: i.inspectionDate,
              isi: score.isi,
              isiAjustado: score.isiAjustado,
              classification: score.classification,
            };
          })
        );

        const averageISI =
          scored.length === 0
            ? 0
            : Math.round(
                (scored.reduce((acc, s) => acc + s.isi, 0) / scored.length) *
                  100
              ) / 100;

        const criticalUnits = scored.filter((s) => s.isi < 50).length;

        return {
          checklistId: input.checklistId,
          totalInspections: inspectionRows.length,
          averageISI,
          criticalUnits,
          inspections: scored,
        };
      }),

    // Evolução temporal de uma unidade
    unitEvolution: protectedProcedure
      .input(
        z.object({
          unitId: z.number(),
          checklistId: z.number(),
        })
      )
      .query(async ({ input }) => {
        const db = getDb();
        const inspectionRows = await db
          .select()
          .from(inspections)
          .where(
            and(
              eq(inspections.unitId, input.unitId),
              eq(inspections.checklistId, input.checklistId)
            )
          )
          .orderBy(inspections.version);

        const evolution = await Promise.all(
          inspectionRows.map(async (i) => {
            const score = await riskScoreEngine.calculateScore(i.id);
            return {
              version: i.version,
              date: i.inspectionDate,
              isi: score.isi,
              isiAjustado: score.isiAjustado,
              classification: score.classification,
            };
          })
        );

        return evolution;
      }),
  }),
});

export type AppRouter = typeof appRouter;
