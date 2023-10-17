import { z } from "zod";

import { hookRootUpToServerGraph, makeServerIdIfNeeded } from "@acme/agent";
import {
  ExecutionState,
  type DraftExecutionEdge,
  type DraftExecutionNode,
} from "@acme/db";

import { createTRPCRouter, protectedProcedure } from "../trpc";
import withLock from "./lock";

export const dagShape = z.object({
  nodes: z.array(z.custom<DraftExecutionNode>()),
  edges: z.array(z.custom<DraftExecutionEdge>()),
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
                take: 2,
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
                  results: {
                    take: 100,
                    orderBy: {
                      updatedAt: "desc",
                    },
                  },
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
        goalPrompt: z.string().nonempty(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await withLock(input.executionId, async () => {
        const { executionId, graph: unprocessedGraph, goalPrompt } = input;

        const graph = hookRootUpToServerGraph(
          { ...unprocessedGraph, executionId },
          executionId,
          goalPrompt,
        );
        // this is needed because we do not know if the graph already exists or not
        const connectOrCreateNodes = graph.nodes.map((node) => {
          const generatedId = makeServerIdIfNeeded(node.id, executionId);
          return {
            where: { id: generatedId },
            create: {
              id: generatedId,
              name: node.name,
              context: node.context,
              graph: node.graphId
                ? {
                    connect: { id: node.graphId },
                  }
                : undefined,
            },
          };
        });

        const createEdges = graph.edges.map((edge) => ({
          sId: makeServerIdIfNeeded(edge.sId, executionId),
          tId: makeServerIdIfNeeded(edge.tId, executionId),
        }));

        return ctx.prisma.executionGraph.upsert({
          where: { executionId },
          create: {
            executionId,
            nodes: {
              connectOrCreate: connectOrCreateNodes,
            },
            edges: { create: createEdges },
          },
          update: {
            nodes: {
              connectOrCreate: connectOrCreateNodes,
            },
            edges: { create: createEdges },
          },
        });
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
