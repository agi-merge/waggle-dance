import { z } from "zod";

import { ExecutionState } from "@acme/db";

import { createTRPCRouter, protectedProcedure } from "../trpc";

export const dagShape = z.object({
  nodes: z.array(z.any()),
  edges: z.array(z.any()),
});

export const executionRouter = createTRPCRouter({
  create: protectedProcedure
    .input(z.object({ goalId: z.string().nonempty() }))
    .mutation(({ ctx, input }) => {
      const { goalId } = input;
      const userId = ctx.session.user.id;

      // create execution
      return ctx.prisma.execution.create({
        data: {
          goalId,
          userId,
        },
        include: {
          goal: {
            include: {
              executions: {
                take: 10,
                orderBy: {
                  updatedAt: "desc",
                },
              },
              results: {
                take: 100,
                orderBy: {
                  updatedAt: "desc",
                },
              },
            },
          },
        },
      });
    }),

  updateGraph: protectedProcedure
    .input(
      z.object({
        executionId: z.string().nonempty(),
        graph: dagShape,
      }),
    )
    .mutation(({ ctx, input }) => {
      const { executionId, graph } = input;
      const userId = ctx.session.user.id;

      return ctx.prisma.execution.update({
        where: { id: executionId, userId },
        data: { graph: JSON.stringify(graph), state: "EXECUTING" },
      });
    }),

  updateState: protectedProcedure
    .input(
      z.object({
        executionId: z.string().nonempty(),
        state: z.nativeEnum(ExecutionState),
      }),
    )
    .mutation(({ ctx, input }) => {
      const { executionId, state } = input;
      const userId = ctx.session.user.id;

      return ctx.prisma.execution.update({
        where: { id: executionId, userId },
        data: { state },
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
