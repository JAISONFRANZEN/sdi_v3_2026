import { initTRPC, TRPCError } from "@trpc/server";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
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
} from "../drizzle/schema";
import { hashPassword, verifyPassword, signToken, canWriteProfile } from "./auth";
import { riskScoreEngine } from "./riskEngine";

const t = initTRPC.context<Context>().create();

const publicProcedure = t.procedure;

const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

const answerInputSchema = z.object({
  itemId: z.number(),
  status: z.enum(["Sim", "Não", "Parcialmente", "N/A"]),
  observations: z.string().optional(),
});

const inspectionSyncSchema = z.object({
  clientUuid: z.string().uuid(),
  checklistId: z.number(),
  inspectorName: z.string().min(1),
  location: z.string().optional(),
  unitType: z
    .enum(["Procuradoria", "Promotoria", "Sede Administrativa", "Anexo", "Residência", "Outro"])
    .optional(),
  notes: z.string().optional(),
  answers: z.array(answerInputSchema),
});

export const appRouter = t.router({
  auth: t.router({
    register: publicProcedure
      .input(
        z.object({
          email: z.string().email(),
          password: z.string().min(8),
          name: z.string().min(1),
          role: z.enum(["admin", "inspetor_mpsc", "usuario_residencial"]).default("usuario_residencial"),
        })
      )
      .mutation(async ({ input }) => {
        const db = getDb();
        const existing = await db.query.users.findFirst({ where: eq(users.email, input.email) });
        if (existing) {
          throw new TRPCError({ code: "CONFLICT", message: "E-mail já cadastrado" });
        }
        const passwordHash = hashPassword(input.password);
        const [result] = await db.insert(users).values({
          email: input.email,
          passwordHash,
          name: input.name,
          role: input.role,
        });
        const token = signToken({ userId: result.insertId, email: input.email, role: input.role });
        return { token };
      }),

    login: publicProcedure
      .input(z.object({ email: z.string().email(), password: z.string() }))
      .mutation(async ({ input }) => {
        const db = getDb();
        const user = await db.query.users.findFirst({ where: eq(users.email, input.email) });
        if (!user || !verifyPassword(input.password, user.passwordHash)) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Credenciais inválidas" });
        }
        const token = signToken({ userId: user.id, email: user.email, role: user.role });
        return { token, name: user.name, role: user.role };
      }),
  }),

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

  inspections: t.router({
    list: protectedProcedure
      .input(z.object({ checklistId: z.number().optional() }).optional())
      .query(async ({ input }) => {
        const db = getDb();
        if (input?.checklistId) {
          return db.query.inspections.findMany({
            where: eq(inspections.checklistId, input.checklistId),
            orderBy: (i, { desc }) => [desc(i.inspectionDate)],
          });
        }
        return db.query.inspections.findMany({
          orderBy: (i, { desc }) => [desc(i.inspectionDate)],
        });
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
        const globalCompliance = await riskScoreEngine.calculateGlobalCompliance(input.id);
        const sectionBreakdown = await riskScoreEngine.calculateSectionBreakdown(input.id);

        return {
          ...inspection,
          answers: answerRows,
          recommendations: recommendationRows,
          globalCompliance,
          sectionBreakdown,
        };
      }),

    // Sincroniza uma inspeção criada offline: upsert por clientUuid (idempotente),
    // grava respostas e gera recomendações no servidor.
    sync: protectedProcedure.input(inspectionSyncSchema).mutation(async ({ ctx, input }) => {
      const db = getDb();
      const checklist = await db.query.checklists.findFirst({
        where: eq(checklists.id, input.checklistId),
      });
      if (!checklist) throw new TRPCError({ code: "NOT_FOUND", message: "Checklist inválido" });

      if (!canWriteProfile(ctx.user.role, checklist.profileType)) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const existing = await db.query.inspections.findFirst({
        where: eq(inspections.clientUuid, input.clientUuid),
      });

      let inspectionId: number;
      if (existing) {
        inspectionId = existing.id;
        await db
          .update(inspections)
          .set({
            inspectorName: input.inspectorName,
            location: input.location,
            unitType: input.unitType,
            notes: input.notes,
          })
          .where(eq(inspections.id, inspectionId));
        await db.delete(answers).where(eq(answers.inspectionId, inspectionId));
        await db.delete(recommendations).where(eq(recommendations.inspectionId, inspectionId));
      } else {
        const [result] = await db.insert(inspections).values({
          clientUuid: input.clientUuid,
          checklistId: input.checklistId,
          userId: ctx.user.userId,
          inspectorName: input.inspectorName,
          location: input.location,
          unitType: input.unitType,
          notes: input.notes,
        });
        inspectionId = result.insertId;
      }

      for (const answer of input.answers) {
        await db.insert(answers).values({
          inspectionId,
          itemId: answer.itemId,
          status: answer.status,
          observations: answer.observations,
        });
      }

      const generated = await riskScoreEngine.generateRecommendations(input.answers);
      for (const rec of generated) {
        await db.insert(recommendations).values({
          inspectionId,
          recommendationText: rec.recommendationText,
          priority: rec.priority,
        });
      }

      const globalCompliance = await riskScoreEngine.calculateGlobalCompliance(inspectionId);

      return { inspectionId, clientUuid: input.clientUuid, globalCompliance };
    }),
  }),

  analytics: t.router({
    summary: protectedProcedure
      .input(z.object({ checklistId: z.number() }))
      .query(async ({ input }) => {
        const db = getDb();
        const inspectionRows = await db.query.inspections.findMany({
          where: eq(inspections.checklistId, input.checklistId),
        });

        const scored = await Promise.all(
          inspectionRows.map(async (i) => ({
            inspectionId: i.id,
            location: i.location,
            unitType: i.unitType,
            inspectionDate: i.inspectionDate,
            compliance: await riskScoreEngine.calculateGlobalCompliance(i.id),
          }))
        );

        const averageCompliance =
          scored.length === 0
            ? 0
            : Math.round(
                (scored.reduce((acc, s) => acc + s.compliance, 0) / scored.length) * 100
              ) / 100;

        return {
          checklistId: input.checklistId,
          totalInspections: inspectionRows.length,
          averageCompliance,
          inspections: scored,
        };
      }),
  }),
});

export type AppRouter = typeof appRouter;
