import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "../trpc";

export const goalRouter = createTRPCRouter({
  all: publicProcedure.query(({ ctx }) => {
    return ctx.prisma.goal.findMany({ orderBy: { id: "desc" } });
  }),
  byId: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(({ ctx, input }) => {
      return ctx.prisma.goal.findFirst({ where: { id: input.id } });
    }),
  create: publicProcedure
    .input(
      z.object({
        id: z.string().min(1),
        prompt: z.string().min(1),
        userId: z.string().min(1),
      }),
    )
    .mutation(({ ctx, input }) => {
      return ctx.prisma.goal.create({ data: input });
    }),
  delete: publicProcedure.input(z.string()).mutation(({ ctx, input }) => {
    return ctx.prisma.goal.delete({ where: { id: input } });
  }),
});
