import { type Prisma } from "@prisma/client";
import { z } from "zod";

import {
  findFinishPacket,
  makeServerIdIfNeeded,
  type AgentPacket,
} from "@acme/agent";
import { ExecutionState, type DraftExecutionNode } from "@acme/db";

import { createTRPCRouter, protectedProcedure } from "../trpc";
import withLock from "./lock";

export const resultRouter = createTRPCRouter({
  byGoalId: protectedProcedure
    .input(z.string().cuid().min(1))
    .query(async ({ ctx, input }) => {
      return await ctx.prisma.result.findMany({
        where: { goalId: input },
        orderBy: { createdAt: "desc" },
      });
    }),

  byGoalAndArtifactId: protectedProcedure
    .input(
      z.object({
        taskId: z.string().cuid().min(1),
        artifactId: z.string().min(1),
      }),
    )
    .query(async ({ ctx, input }) => {
      return await ctx.prisma.result.findFirst({
        where: { goalId: input.taskId, id: input.artifactId },
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
      });
    }),

  updateArtifactUrl: protectedProcedure
    .input(
      z.object({
        taskId: z.string().cuid().min(1),
        artifactId: z.string().min(1),
        artifactUrl: z.string().url(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { taskId, artifactId, artifactUrl } = input;

      return await ctx.prisma.$transaction(async (prisma) => {
        // Fetch the existing result
        const result = await prisma.result.findUnique({
          where: { id: artifactId },
        });

        if (!result) {
          throw new Error("Result not found");
        }

        // Append the new URL to the existing array
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const updatedArtifactUrls = [...result.artifactUrls, artifactUrl];

        // Update the result with the new array
        const updatedResult = await prisma.result.update({
          where: { id: artifactId, goalId: taskId },
          data: { artifactUrls: updatedArtifactUrls },
        });

        return updatedResult;
      });
    }),
});
