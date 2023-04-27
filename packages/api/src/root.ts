import { authRouter } from "./router/auth";
import { chainRouter } from "./router/chain";
import { createTRPCRouter } from "./trpc";

export const appRouter = createTRPCRouter({
  // post: postRouter,
  auth: authRouter,
  chain: chainRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
