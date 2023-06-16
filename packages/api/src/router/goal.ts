import { z } from "zod";

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
        include: { executions: true }
      });
    }),

  // Get top by user - TODO: could expand this to do some proper pagination in the future
  topByUser: protectedProcedure.query(({ ctx }) => {
    const userId = ctx.session.user.id;
    return ctx.prisma.goal.findMany({
      where: { userId },
      include: { executions: true },
      orderBy: { updatedAt: 'asc' },
      take: 10,
    });
  }),

  createExecution: protectedProcedure
    .input(z.object({ goalId: z.string().nonempty() }))
    .mutation(({ ctx, input }) => {
      const { goalId } = input;
      const userId = ctx.session.user.id;
      return ctx.prisma.execution.create({
        data: {
          userId,
          goalId,
        }
      });
    }),

  createResult: protectedProcedure
    .input(z.object({ goalId: z.string().nonempty(), value: z.string().nonempty(), graph: z.any() }))
    .mutation(({ ctx, input }) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const { goalId, value, graph } = input;
      return ctx.prisma.result.create({
        data: {
          execution: {
            connectOrCreate: {
              where: { id: goalId },
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
              create: { goalId, userId: ctx.session.user.id, graph },
            }
          },
          goal: { connect: { id: goalId } },
          value
        }
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
        include: { executions: true },
      });
    }),

  // Delete an existing goal
  delete: protectedProcedure.input(z.string().nonempty()).mutation(({ ctx, input }) => {
    // TODO: ensure the user owns this goal
    return ctx.prisma.goal.delete({ where: { id: input } });
  }),
});
