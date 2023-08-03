import { authRouter as auth } from "./router/auth";
import { executionRouter as execution } from "./router/execution";
import { goalRouter as goal } from "./router/goal";
import { resultRouter as result } from "./router/result";
import { createTRPCRouter } from "./trpc";

export const appRouter = createTRPCRouter({
  auth,
  goal,
  execution,
  result,
});

// export type definition of API
export type AppRouter = typeof appRouter;
