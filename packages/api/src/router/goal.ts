import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
  createTRPCRouter,
  optionalProtectedProcedure,
  protectedProcedure,
} from "../trpc";

export const goalRouter = createTRPCRouter({
  // Query all goals
  // all: publicProcedure.query(({ ctx }) => {
  //   return ctx.prisma.goal.findMany({ orderBy: { id: "desc" } });
  // }),

  // Query a single goal by id
  byId: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(({ ctx, input }) => {
      const userId = ctx.session?.user.id;
      return ctx.prisma.goal.findUnique({
        where: { id: input.id, userId },
        include: {
          executions: {
            take: 10,
            orderBy: { updatedAt: "desc" }, // doesnt work as expected?
          },
          results: {
            take: 100,
            orderBy: { updatedAt: "desc" },
          },
        },
      });
    }),

  topByUser: optionalProtectedProcedure.query(({ ctx }) => {
    const userId = ctx.session.user?.id;
    if (!userId) {
      return [];
    }
    return ctx.prisma.goal.findMany({
      where: { userId },
      orderBy: { updatedAt: "asc" },
      include: {
        executions: {
          take: 10,
          orderBy: { updatedAt: "desc" }, // doesnt work as expected?
        },
        results: {
          take: 100,
          orderBy: { updatedAt: "desc" },
        },
      },
      take: 10,
    });
  }),

  // Create a new goal
  create: optionalProtectedProcedure
    .input(
      z.object({
        prompt: z.string().nonempty(),
      }),
    )
    .mutation(({ ctx, input }) => {
      const { prompt } = input;
      const userId = ctx.session.user?.id;

      if (!userId) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      return ctx.prisma.goal.create({
        data: {
          prompt,
          userId,
        },
        include: {
          executions: {
            orderBy: { updatedAt: "desc" },
          },
          results: {
            orderBy: { updatedAt: "desc" },
          },
        },
      });
    }),

  // Delete an existing goal
  delete: optionalProtectedProcedure
    .input(z.string().nonempty())
    .mutation(({ ctx, input }) => {
      const userId = ctx.session.user?.id;

      if (!userId) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      return ctx.prisma.goal.delete({ where: { id: input, userId } });
    }),
});
