import { z } from "zod";

import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";

export const goalRouter = createTRPCRouter({
  // Query all goals
  // all: publicProcedure.query(({ ctx }) => {
  //   return ctx.prisma.goal.findMany({ orderBy: { id: "desc" } });
  // }),

  // Query a single goal by id
  // byId: publicProcedure
  //   .input(z.object({ id: z.string() }))
  //   .query(({ ctx, input }) => {
  //     const userId = ctx.session?.user.id;
  //     return ctx.prisma.goal.findFirst({ where: { id: input.id, userId: userId } });
  //   }),

  // Get top by user - TODO: could expand this to do some proper pagination in the future
  topByUser: protectedProcedure.query(({ ctx }) => {
    const userId = ctx.session.user.id;
    return ctx.prisma.goal.findMany({
      where: { userId },
      orderBy: { updatedAt: 'asc' },
      take: 10,
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

      // TODO: Additional validation/biz logic can go here if needed

      return ctx.prisma.goal.create({
        data: {
          prompt,
          userId,
        }
      });
    }),

  // Delete an existing goal
  delete: protectedProcedure.input(z.string()).mutation(({ ctx, input }) => {
    const userId = ctx.session.user.id;
    return ctx.prisma.goal.delete({ where: { id: input } });
  }),
});
