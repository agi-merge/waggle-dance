import { type Prisma } from "@prisma/client";
import { z } from "zod";

import { findFinishPacket, type AgentPacket } from "@acme/agent";
import { ExecutionState, type ExecutionNode } from "@acme/db";

import { createTRPCRouter, protectedProcedure } from "../trpc";

export type TRPCExecutionNode = Omit<ExecutionNode, "graphId"> | ExecutionNode;

export const resultRouter = createTRPCRouter({
  create: protectedProcedure
    .input(
      z.object({
        goalId: z.string().nonempty(),
        executionId: z.string().cuid(),
        node: z.custom<TRPCExecutionNode>(),
        packets: z.array(z.custom<AgentPacket>()),
        state: z.nativeEnum(ExecutionState),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { goalId, executionId, node, packets, state } = input;

      const nodeOperation = ctx.prisma.executionNode.upsert({
        where: { id: node.id },
        create: {
          id: node.id,
          name: node.name,
          context: node.context,
          graph: { connect: { executionId: executionId } },
        },
        update: {
          name: node.name,
          context: node.context,
          graph: { connect: { executionId: executionId } },
        },
      });

      const [result, _execution, _graph] = await ctx.prisma.$transaction([
        ctx.prisma.result.create({
          data: {
            execution: { connect: { id: executionId } },
            goal: { connect: { id: goalId } },
            value: findFinishPacket(packets) as Prisma.InputJsonValue,
            packets: packets as Prisma.InputJsonValue[],
            packetVersion: 1,
            node: {
              connect: { id: node.id },
            },
          },
        }),
        ctx.prisma.execution.update({
          where: { id: executionId },
          data: { state },
        }),
        ctx.prisma.executionGraph.upsert({
          where: { executionId: executionId },
          create: {
            executionId: executionId,
            nodes: {
              connect: [{ id: node.id }],
            }, // connect to existing nodes
            edges: { create: [] }, // create empty edges
          },
          update: {},
        }),
        nodeOperation,
      ]);

      return result;
    }),
});
