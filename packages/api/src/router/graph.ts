import { z } from "zod";

import type {DraftExecutionEdge, DraftExecutionNode} from "@acme/db";

import { createTRPCRouter, protectedProcedure } from "../trpc";

export const dagShape = z.object({
  nodes: z.array(z.custom<DraftExecutionNode>()),
  edges: z.array(z.custom<DraftExecutionEdge>()),
});

export const graphRouter = createTRPCRouter({
  topByUser: protectedProcedure
    .input(
      z.object({
        currentPage: z.number().min(1).default(1),
        pageSize: z.number().min(1).default(1),
      }),
    )
    .query(async ({ ctx }) => {
      return await ctx.db.execution.findFirst({
        where: { userId: ctx.session?.user.id },
        take: 1,
        orderBy: { updatedAt: "desc" }, // doesnt work as expected?
        include: {
          graph: {
            include: {
              nodes: true,
              edges: true,
            },
          },
          results: {
            take: 40,
            orderBy: { updatedAt: "desc" },
          },
        },
      });
    }),
  nodes: protectedProcedure
    .input(
      z
        .object({ graphId: z.string().cuid().min(1) })
        .or(z.object({ executionId: z.string().cuid().min(1) })),
    )
    .query(async ({ ctx, input }) => {
      if (input as { graphId: string }) {
        return await ctx.db.executionNode.findMany({
          where: { graphId: (input as { graphId: string }).graphId },
        });
      } else {
        const execution = await ctx.db.execution.findUnique({
          where: { id: (input as { executionId: string }).executionId },
          include: { graph: { include: { nodes: true } } },
        });
        return execution?.graph?.nodes ?? [];
      }
    }),
});
