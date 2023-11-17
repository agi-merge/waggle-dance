import { type Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { z } from "zod";

import {
  findFinishPacket,
  makeServerIdIfNeeded,
  type AgentPacket,
} from "@acme/agent";
import { type Session } from "@acme/auth";
import { ExecutionState, type DraftExecutionNode, type Result } from "@acme/db";

import { createTRPCRouter, protectedProcedure } from "../trpc";
import withLock from "./lock";

export type CreateResultParams = {
  goalId: string;
  node: DraftExecutionNode;
  executionId: string;
  packet: AgentPacket;
  packets: AgentPacket[];
  state: ExecutionState;
  session?: Session | null;
  origin?: string | undefined;
};

export const resultRouter = createTRPCRouter({
  byExecutionId: protectedProcedure
    .input(
      z.object({
        executionId: z.string().cuid().min(1),
        currentPage: z.number().min(1).default(1),
        pageSize: z.number().min(1).default(10),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { executionId, currentPage, pageSize } = input;
      return await ctx.prisma.result.findMany({
        where: { executionId },
        orderBy: { createdAt: "desc" },
        skip: (currentPage - 1) * pageSize,
        take: pageSize,
      });
    }),

  byExecutionIdAndArtifactId: protectedProcedure
    .input(
      z.object({
        executionId: z.string().cuid().min(1),
        artifactId: z.string().min(1),
      }),
    )
    .query(async ({ ctx, input }) => {
      return await ctx.prisma.result.findFirst({
        where: { executionId: input.executionId, id: input.artifactId },
        select: { artifactUrls: true },
      });
    }),

  create: protectedProcedure
    .input(
      z.object({
        goalId: z.string().min(1),
        executionId: z.string().cuid(),
        node: z.custom<DraftExecutionNode>(),
        packets: z.array(z.custom<AgentPacket>()),
        state: z.nativeEnum(ExecutionState),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await withLock(input.executionId, async () => {
        const { goalId, executionId, node, packets, state } = input;
        node.id = makeServerIdIfNeeded(node.id, executionId);
        const result = ctx.prisma.result.create({
          data: {
            execution: { connect: { id: executionId } },
            goal: { connect: { id: goalId } },
            value: findFinishPacket(packets) as Prisma.InputJsonValue,
            packets: packets as Prisma.InputJsonValue[],
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
      });
    }),

  upsertAppendArtifactUrl: protectedProcedure
    .input(
      z.object({
        resultId: z.string().cuid().min(1).optional(),
        nodeId: z.string().min(1),
        executionId: z.string().cuid().min(1),
        artifactUrl: z.string().url(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { executionId, resultId, artifactUrl, nodeId } = input;

      return await ctx.prisma.$transaction(async (prisma) => {
        // Fetch the existing result
        let result: Result | null;

        if (!resultId) {
          result = await prisma.result.findFirst({
            where: { executionId },
          });
        } else {
          result = await prisma.result.findUnique({ where: { id: resultId } });
        }

        // Append the new URL to the existing array

        // TODO: allow additional_input to better maintain waggledance features and bypass the extra queries (goal, node)
        // Update the result with the new array
        if (result) {
          const updatedArtifactUrls = [...result.artifactUrls, artifactUrl];
          const updatedResult = await prisma.result.update({
            where: { id: result.id, executionId },
            data: { artifactUrls: updatedArtifactUrls },
          });
          return updatedResult;
        } else {
          // look up the goal from the taskId
          const execution = await prisma.execution.findUnique({
            where: { id: executionId },
            include: { goal: true, graph: { include: { nodes: true } } },
          });

          const stubValue: AgentPacket = {
            type: "artifact",
            url: artifactUrl,
            nodeId,
            runId: v4(),
          };
          // create the result
          const result = await ctx.prisma.result.create({
            data: {
              execution: { connect: { id: executionId } },
              node: { connect: { id: nodeId } },
              goal: { connect: { id: execution?.goalId } },
              value: stubValue,
              packets: [stubValue],
              artifactUrls: [artifactUrl],
            },
          });
          return result;
        }
      });
    }),
});
