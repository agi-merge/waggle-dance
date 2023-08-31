import { TRPCError } from "@trpc/server";
import { stringify } from "superjson";
import { z } from "zod";

import { getBaseUrl } from "../baseUrl";
import {
  createTRPCRouter,
  optionalProtectedProcedure,
  protectedProcedure,
  publicProcedure,
} from "../trpc";

export const goalRouter = createTRPCRouter({
  // Query all goals
  // all: publicProcedure.query(({ ctx }) => {
  //   return ctx.prisma.goal.findMany({ orderBy: { id: "desc" } });
  // }),

  // Query a single goal by id
  byId: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(({ ctx, input }) => {
      const userId = ctx.session?.user.id;
      return ctx.prisma.goal.findUnique({
        where: { id: input.id, userId },
        include: {
          executions: {
            take: 5,
            orderBy: { updatedAt: "desc" }, // doesnt work as expected?
            include: {
              graph: {
                include: {
                  nodes: true,
                  edges: true,
                },
              },
            },
          },
          results: {
            take: 40,
            orderBy: { updatedAt: "desc" },
          },
        },
      });
    }),

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
          take: 5,
          orderBy: { updatedAt: "desc" }, // doesnt work as expected?
          include: {
            graph: {
              include: {
                nodes: true,
                edges: true,
              },
            },
          },
        },
        results: {
          take: 40,
          orderBy: { updatedAt: "desc" },
        },
      },
      take: 6,
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
            orderBy: { updatedAt: "desc" },
            include: {
              graph: {
                include: {
                  nodes: true,
                  edges: true,
                },
              },
            },
          },
          results: {
            orderBy: { updatedAt: "desc" },
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
      z
        .array(
          z.object({
            type: z.enum(["enhancement", "error", "warning"]),
            message: z.string().nonempty(),
            refinedGoal: z.string().optional().nullable(),
          }),
        )
        .nonempty(),
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
