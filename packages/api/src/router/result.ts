import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "../trpc";

export const resultRouter = createTRPCRouter({
  create: protectedProcedure
    .input(
      z.object({
        goalId: z.string().nonempty(),
        executionId: z.string().cuid(),
        value: z.string().nonempty(),
      }),
    )
    .mutation(({ ctx, input }) => {
      const { goalId, executionId, value } = input;
      return ctx.prisma.result.create({
        data: {
          execution: {
            connect: {
              id: executionId,
            },
          },
          goal: { connect: { id: goalId } },
          value,
        },
      });
    }),
});
