import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";

export const authRouter = createTRPCRouter({
  getSession: publicProcedure.query(({ ctx }) => {
    return ctx.session;
  }),
  news: protectedProcedure.query(() => {
    // testing type validation of overridden next-auth Session in @acme/auth package
    return ["welcome to town, pardner."];
  }),
});
