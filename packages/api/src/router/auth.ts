import { z } from "zod";

import { isNamespaceMatch } from "@acme/agent";

import { createTRPCRouter, publicProcedure } from "../trpc";

export const authRouter = createTRPCRouter({
  getSession: publicProcedure.query(({ ctx }) => {
    return ctx.session;
  }),
  getInsecureSessionForNamespace: publicProcedure
    .input(
      z.object({
        userId: z.string().cuid(),
        namespace: z.string(),
        goalId: z.string(),
        executionId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { userId, goalId, executionId, namespace } = input;
      // FIXME: this is bad auth`
      const isMatch = isNamespaceMatch({ goalId, executionId }, namespace);

      if (!isMatch) {
        return null;
      }

      const session = await ctx.prisma.session.findFirst({
        where: { userId },
      });
      //clohiv6ix0000yy7tmt3vl3km
      return session;
    }),
});
