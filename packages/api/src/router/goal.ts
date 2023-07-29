import { v4 as uuidv4 } from "uuid";
import { z } from "zod";

import { ExecutionState } from "@acme/db";

import { createTRPCRouter, protectedProcedure } from "../trpc";

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
      return ctx.prisma.goal.findFirst({
        where: { id: input.id, userId },
        include: { executions: true, results: true },
      });
    }),

  // Get top by user - TODO: could expand this to do some proper pagination in the future
  topByUser: protectedProcedure.query(({ ctx }) => {
    const userId = ctx.session.user.id;
    return ctx.prisma.goal.findMany({
      where: { userId },
      include: { executions: true, results: true },
      orderBy: { updatedAt: "asc" },
      take: 10,
    });
  }),

  createExecution: protectedProcedure
    .input(z.object({ goalId: z.string().nonempty() }))
    .mutation(({ ctx, input }) => {
      const { goalId } = input;
      const userId = ctx.session.user.id;

      const uniqueToken = uuidv4();

      // Upsert execution
      return ctx.prisma.execution.upsert({
        where: { goalId_userId_uniqueToken: { goalId, userId, uniqueToken } },
        update: {},
        create: {
          goalId,
          userId,
          uniqueToken,
        },
      });
    }),

  createResult: protectedProcedure
    .input(
      z.object({
        goalId: z.string().nonempty(),
        value: z.string().nonempty(),
        graph: z.any(),
        state: z.nativeEnum(ExecutionState).optional(),
      }),
    )
    .mutation(({ ctx, input }) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const { goalId, value, graph, state } = input;
      const uniqueToken = uuidv4();
      return ctx.prisma.result.create({
        data: {
          execution: {
            connectOrCreate: {
              // Result can be created without an execution, because of the optimistic first task execution
              where: { id: goalId },

              create: {
                goalId,
                userId: ctx.session.user.id,
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                graph,
                state,
                uniqueToken,
              },
            },
          },
          goal: { connect: { id: goalId } },
          value,
        },
      });
    }),

  // Create a new goal
  create: protectedProcedure
    .input(
      z.object({
        prompt: z.string().nonempty(),
      }),
    )
    .mutation(({ ctx, input }) => {
      const { prompt } = input;
      const userId = ctx.session.user.id;

      return ctx.prisma.goal.create({
        data: {
          prompt,
          userId,
        },
        include: {
          executions: {
            orderBy: { updatedAt: "desc" },
          },
          results: {
            orderBy: { updatedAt: "desc" },
          },
        },
      });
    }),

  // Delete an existing goal
  delete: protectedProcedure
    .input(z.string().nonempty())
    .mutation(({ ctx, input }) => {
      // TODO: ensure the user owns this goal
      return ctx.prisma.goal.delete({ where: { id: input } });
    }),
});
