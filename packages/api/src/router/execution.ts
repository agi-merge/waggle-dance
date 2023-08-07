import { v4 as uuidv4 } from "uuid";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "../trpc";

export const executionRouter = createTRPCRouter({
  create: protectedProcedure
    .input(z.object({ goalId: z.string().nonempty() }))
    .mutation(({ ctx, input }) => {
      const { goalId } = input;
      const userId = ctx.session.user.id;

      const uniqueToken = uuidv4();

      // create execution
      return ctx.prisma.execution.create({
        data: {
          goalId,
          userId,
          uniqueToken,
        },
      });
    }),

  byId: protectedProcedure
    .input(z.object({ id: z.string().nonempty() }))
    .query(({ ctx, input }) => {
      const { id } = input;
      const userId = ctx.session.user.id;

      return ctx.prisma.execution.findUnique({
        where: {
          id,
          userId,
        },
      });
    }),
});
