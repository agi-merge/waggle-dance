import { z } from "zod";

import {
  ExecutionState,
  type ExecutionEdge,
  type ExecutionGraph,
  type ExecutionNode,
  type PrismaPromise,
} from "@acme/db";

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
    .mutation(async ({ ctx, input }) => {
      const { executionId, graph } = input;

      const existingNodes = await ctx.prisma.executionNode.findMany({
        where: { graph: { executionId } },
      });

      const operations: PrismaPromise<ExecutionNode>[] = graph.nodes
        .map((node) => {
          // Check against the fetched list of existing nodes
          const existingNode = existingNodes.find((n) => n.id === node.id);
          if (!existingNode) {
            return ctx.prisma.executionNode.create({
              data: {
                id: node.id,
                name: node.name,
                context: node.context,
                graph: { connect: { executionId: executionId } },
              },
            });
          } else {
            return null;
          }
        })
        .filter(Boolean) as PrismaPromise<ExecutionNode>[];

      const upsert = ctx.prisma.executionGraph.upsert({
        where: { executionId: executionId },
        create: {
          executionId: executionId,
          nodes: { createMany: { data: graph.nodes } }, // create empty nodes
          edges: { createMany: { data: graph.edges } }, // create edges
        },
        update: {},
      });
      const result: Array<PrismaPromise<ExecutionGraph | ExecutionNode>> = [
        upsert,
        ...operations,
      ];

      return await ctx.prisma.$transaction(result);
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
