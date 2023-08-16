import { z } from "zod";

import { ExecutionState } from "@acme/db";

import { createTRPCRouter, protectedProcedure } from "../trpc";

export const resultRouter = createTRPCRouter({
  create: protectedProcedure
    .input(
      z.object({
        goalId: z.string().nonempty(),
        executionId: z.string().cuid(),
        value: z.string().nonempty(),
        state: z.nativeEnum(ExecutionState),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { goalId, executionId, value, state } = input;

      // start transaction
      const [result] = await ctx.prisma.$transaction([
        ctx.prisma.result.create({
          data: {
            execution: {
              connect: {
                id: executionId,
              },
            },
            goal: { connect: { id: goalId } },
            value,
          },
        }),
        ctx.prisma.execution.update({
          where: { id: executionId },
          data: { state },
        }),
      ]);

      return result;
    }),
});
