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
});
