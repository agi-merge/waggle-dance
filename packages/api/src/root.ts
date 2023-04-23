import { authRouter as auth } from "./router/auth";
import { goalRouter as goal } from "./router/goal";
import { createTRPCRouter } from "./trpc";

export const appRouter = createTRPCRouter({
  auth,
  goal,
});

// export type definition of API
export type AppRouter = typeof appRouter;
