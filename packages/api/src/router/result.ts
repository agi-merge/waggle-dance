import { v4 as uuidv4 } from "uuid";
import { z } from "zod";

import { ExecutionState } from "@acme/db";

import { createTRPCRouter, protectedProcedure } from "../trpc";

export const resultRouter = createTRPCRouter({
  create: protectedProcedure
    .input(
      z.object({
        goalId: z.string().nonempty(),
        executionId: z.string().nonempty(),
        value: z.string().nonempty(),
        graph: z.any(),
        state: z.nativeEnum(ExecutionState).optional(),
      }),
    )
    .mutation(({ ctx, input }) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const { goalId, executionId, value, graph, state } = input;
      const uniqueToken = uuidv4();
      return ctx.prisma.result.create({
        data: {
          execution: {
            connectOrCreate: {
              // Result can be created without an execution, because of the optimistic first task execution
              where: { id: executionId },

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
});
