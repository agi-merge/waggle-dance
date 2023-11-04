import { TRPCError } from "@trpc/server";
import { stringify } from "superjson";
import { z } from "zod";

import { getBaseUrl } from "../baseUrl";
import {
  createTRPCRouter,
  optionalProtectedProcedure,
  publicProcedure,
} from "../trpc";

export const goalRouter = createTRPCRouter({
  topByUser: optionalProtectedProcedure.query(({ ctx }) => {
    const userId = ctx.session.user?.id;
    if (!userId) {
      return [];
    }
    return ctx.prisma.goal.findMany({
      where: { userId },
      orderBy: { updatedAt: "asc" },
      include: {
        executions: {
          take: 1,
          orderBy: { updatedAt: "desc" }, // doesnt work as expected?
          include: {
            graph: {
              include: {
                nodes: true,
                edges: true,
              },
            },
            results: {
              take: 40,
              orderBy: { updatedAt: "desc" },
            },
          },
        },
      },
      take: 1,
    });
  }),

  byId: optionalProtectedProcedure
    .input(z.string().min(1))
    .query(({ ctx, input: id }) => {
      const userId = ctx.session.user?.id;
      if (!userId) {
        return null;
      }
      return ctx.prisma.goal.findUnique({
        where: { id, userId },
        include: {
          executions: {
            take: 1,
            orderBy: { updatedAt: "desc" },
            include: {
              graph: {
                include: {
                  nodes: true,
                  edges: true,
                },
              },
              results: {
                take: 40,
                orderBy: { updatedAt: "desc" },
              },
            },
          },
        },
      });
    }),

  limitedGoalFromExecution: optionalProtectedProcedure
    .input(z.string().min(1))
    .query(({ ctx, input: executionId }) => {
      return ctx.prisma.goal.findFirst({
        where: { executions: { some: { id: executionId } } },
        select: { id: true, userId: true },
      });
    }),

  // Create a new goal
  create: optionalProtectedProcedure
    .input(
      z.object({
        prompt: z.string().nonempty(),
      }),
    )
    .mutation(({ ctx, input }) => {
      const { prompt } = input;
      const userId = ctx.session.user?.id;

      if (!userId) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      return ctx.prisma.goal.create({
        data: {
          prompt,
          userId,
        },
        include: {
          executions: {
            take: 1,
            orderBy: { updatedAt: "desc" },
            include: {
              graph: {
                include: {
                  nodes: true,
                  edges: true,
                },
              },
              results: {
                take: 40,
                orderBy: { updatedAt: "desc" },
              },
            },
          },
        },
      });
    }),

  // Delete an existing goal
  delete: optionalProtectedProcedure
    .input(z.string().nonempty())
    .mutation(({ ctx, input }) => {
      const userId = ctx.session.user?.id;

      if (!userId) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      return ctx.prisma.goal.delete({ where: { id: input, userId } });
    }),

  refine: publicProcedure
    .input(z.object({ goal: z.string().nonempty() }))
    .output(
      z.object({
        feedback: z
          .array(
            z.object({
              type: z.enum(["enhancement", "error", "warning"]),
              reason: z.string().nonempty(),
              refinedGoal: z.string().optional().nullable(),
            }),
          )
          .nonempty(),
        combinedRefinedGoal: z.string(),
      }),
    )
    .mutation(async ({ ctx: _ctx, input }) => {
      const response = await fetch(`${getBaseUrl()}/api/goal/refine`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: stringify(input),
      });
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const json = await response.json();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return json;
    }),
});
