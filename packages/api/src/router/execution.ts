import { getFetch } from "@trpc/client";
import { z } from "zod";

import {
  hookRootUpToServerGraph,
  makeServerIdIfNeeded,
  type ModelCreationProps,
} from "@acme/agent";
import {
  ExecutionState,
  type DraftExecutionEdge,
  type DraftExecutionNode,
} from "@acme/db";

import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";
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
                take: 1,
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

  createForAgentProtocol: protectedProcedure
    .input(z.object({ prompt: z.string().nonempty() }))
    .mutation(async ({ ctx, input }) => {
      const { prompt } = input;
      const userId = ctx.session.user.id;

      // create a new goal
      const goal = await ctx.prisma.goal.create({
        data: {
          prompt,
          userId,
        },
      });

      // create a new execution and attach it to the newly created goal
      const execution = await ctx.prisma.execution.create({
        data: {
          goalId: goal.id,
          userId,
        },
        include: {
          goal: {
            include: {
              executions: {
                take: 0,
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
                    take: 0,
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

      return execution;
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
    .input(z.object({ id: z.string() }))
    .query(({ ctx, input }) => {
      const { id } = input;
      const userId = ctx.session.user.id;

      return ctx.prisma.execution.findUnique({
        where: {
          id,
          userId,
        },
        include: {
          graph: {
            include: {
              nodes: true,
              edges: true,
            },
          },
          results: {
            take: 40,
            orderBy: {
              updatedAt: "desc",
            },
          },
        },
      });
    }),

  createPlan: publicProcedure
    .input(
      z.object({
        goalPrompt: z.string().min(1),
        goalId: z.string().min(1),
        executionId: z.string().min(1),
        creationProps: z.custom<ModelCreationProps>(),
      }),
    )
    .mutation(({ ctx, input: _input }) => {
      // const { goalPrompt, goalId, executionId, creationProps } = input;
      // const userId = ctx.session?.user.id;

      return getFetch()(`${ctx.origin}/api/agent/plan`, {});
    }),
});
