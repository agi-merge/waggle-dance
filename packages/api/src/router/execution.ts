import { z } from "zod";

import { makeServerIdIfNeeded } from "@acme/agent";
import { ExecutionState, type ExecutionEdge } from "@acme/db";

import { createTRPCRouter, protectedProcedure } from "../trpc";
import { type TRPCExecutionNode } from "./result";

export const dagShape = z.object({
  nodes: z.array(z.custom<TRPCExecutionNode>()),
  edges: z.array(z.custom<Omit<ExecutionEdge, "id"> | ExecutionEdge>()),
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
                take: 5,
                orderBy: {
                  updatedAt: "desc",
                },
                include: {
                  graph: {
                    include: {
                      nodes: true,
                      edges: true,
                    },
                  },
                },
              },
              results: {
                take: 40,
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
        executionId: z.string().cuid(),
        graph: dagShape,
      }),
    )
    .mutation(({ ctx, input }) => {
      const { executionId, graph } = input;

      return ctx.prisma.executionGraph.upsert({
        where: { executionId },
        create: {
          executionId,
          nodes: {
            connectOrCreate: graph.nodes.map((node) => ({
              where: { id: makeServerIdIfNeeded(node.id, executionId) },
              create: node,
            })),
          },
          edges: { create: graph.edges },
        },
        update: {
          nodes: {
            connectOrCreate: graph.nodes.map((node) => ({
              where: { id: makeServerIdIfNeeded(node.id, executionId) },
              create: node,
            })),
          },
          edges: { create: graph.edges },
        },
      });
    }),

  updateState: protectedProcedure
    .input(
      z.object({
        executionId: z.string().cuid(),
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
    .input(z.object({ id: z.string().cuid() }))
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
