import { type Prisma } from "@prisma/client";
import { z } from "zod";

import { ExecutionState } from "@acme/db";

import { createTRPCRouter, protectedProcedure } from "../trpc";

export type BaseAgentPacket = { type: AgentPacketType };
export type AgentPacketType =
  | "handleLLMStart"
  | "token"
  | "handleLLMEnd"
  | "handleLLMError"
  | "handleChainEnd"
  | "handleChainError"
  | "handleChainStart"
  | "handleToolEnd"
  | "handleToolError"
  | "handleToolStart"
  | "handleAgentAction"
  | "handleAgentEnd"
  | "handleText"
  | "handleRetrieverError"
  | "handleAgentError"
  | "done"
  | "error"
  | "requestHumanInput"
  | "starting"
  | "working"
  | "idle";
// TODO: group these by origination for different logic, or maybe different typings

export const findValuePacket = (packets: BaseAgentPacket[]) => {
  const packet = packets.findLast(
    (packet) =>
      packet.type === "handleAgentEnd" ||
      packet.type === "done" ||
      packet.type === "error" ||
      packet.type === "handleChainError" ||
      packet.type === "handleToolError" ||
      packet.type === "handleLLMError" ||
      packet.type === "handleRetrieverError" ||
      packet.type === "handleAgentError",
  ) ?? {
    type: "error",
    severity: "fatal",
    message: `No exe result packet found in ${packets.length} packets`,
  }; // Use Nullish Coalescing to provide a default value

  return packet;
};
export const resultRouter = createTRPCRouter({
  create: protectedProcedure
    .input(
      z.object({
        goalId: z.string().nonempty(),
        executionId: z.string().cuid(),
        nodeId: z.string().cuid(),
        packets: z.array(z.any()),
        state: z.nativeEnum(ExecutionState),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { goalId, executionId, nodeId, packets, state } = input;

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
            node: { connect: { realId: nodeId } },
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
