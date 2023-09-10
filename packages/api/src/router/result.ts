import { type Prisma } from "@prisma/client";
import { z } from "zod";

import {
  AgentPacketFinishedTypes,
  type AgentPacketFinishedType,
  type AgentPacketType,
  type BaseAgentPacket,
} from "@acme/agent";
import { ExecutionState, type ExecutionNode } from "@acme/db";

import { createTRPCRouter, protectedProcedure } from "../trpc";

export const findValuePacket = (packets: BaseAgentPacket[]) => {
  const agentPacketFinishedTypesSet = new Set(AgentPacketFinishedTypes);
  const isAgentPacketFinishedType = (type: AgentPacketType) => {
    return agentPacketFinishedTypesSet.has(type as AgentPacketFinishedType);
  };

  const packet = packets.findLast((packet) => {
    try {
      isAgentPacketFinishedType(packet.type);
      return true;
    } catch (err) {
      return false;
    }
  }) ?? {
    type: "error",
    severity: "fatal",
    message: `No exe result packet found in ${packets.length} packets`,
  }; // Use Nullish Coalescing to provide a default value

  return packet;
};

export type TRPCExecutionNode = Omit<ExecutionNode, "realId"> | ExecutionNode;

export const resultRouter = createTRPCRouter({
  create: protectedProcedure
    .input(
      z.object({
        goalId: z.string().nonempty(),
        executionId: z.string().cuid(),
        node: z.custom<TRPCExecutionNode>(),
        packets: z.array(z.any()),
        state: z.nativeEnum(ExecutionState),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { goalId, executionId, node, packets, state } = input;

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
            value: findValuePacket(packets as BaseAgentPacket[]),
            packets: packets as Prisma.InputJsonValue[],
            packetVersion: 1,
            node: {
              connectOrCreate: {
                create: node,
                where: { realId: node.realId }, // TSC issue here, realId may not be avail
              },
            },
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
