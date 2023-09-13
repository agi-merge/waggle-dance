import { type Prisma } from "@prisma/client";
import { z } from "zod";

import {
  findFinishPacket,
  makeServerIdIfNeeded,
  type AgentPacket,
} from "@acme/agent";
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
      node.id = makeServerIdIfNeeded(node.id, executionId);
      const result = ctx.prisma.result.create({
        data: {
          execution: { connect: { id: executionId } },
          goal: { connect: { id: goalId } },
          value: findFinishPacket(packets) as Prisma.InputJsonValue,
          packets: packets as Prisma.InputJsonValue[],
          packetVersion: 1,
          node: {
            connectOrCreate: {
              where: { id: node.id },
              create: node,
            },
          },
        },
      });

      const updateExecution = ctx.prisma.execution.update({
        where: { id: executionId },
        data: { state },
      });

      return await ctx.prisma.$transaction([result, updateExecution]);
    }),
});
