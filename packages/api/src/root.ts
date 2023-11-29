import { authRouter } from "./router/auth";
import { executionRouter } from "./router/execution";
import { goalRouter } from "./router/goal";
import { graphRouter } from "./router/graph";
import { resultRouter } from "./router/result";
import { createTRPCRouter } from "./trpc";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  execution: executionRouter,
  goal: goalRouter,
  graph: graphRouter,
  result: resultRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
