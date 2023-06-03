import { z } from "zod";

import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";

export const goalRouter = createTRPCRouter({
  all: publicProcedure.query(({ ctx }) => {
    return ctx.prisma.goal.findMany({ orderBy: { id: "desc" } });
  }),

  byId: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(({ ctx, input }) => {
      return ctx.prisma.goal.findFirst({ where: { id: input.id } });
    }),

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

  delete: protectedProcedure.input(z.string()).mutation(({ ctx, input }) => {
    return ctx.prisma.goal.delete({ where: { id: input } });
  }),
});
