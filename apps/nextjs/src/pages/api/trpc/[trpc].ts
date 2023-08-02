import { createNextApiHandler } from "@trpc/server/adapters/next";

import { appRouter, createTRPCContext } from "@acme/api";

// create the API handler, but don't return it yet
const nextApiHandler = createNextApiHandler({
  router: appRouter,
  createContext: createTRPCContext,
});

export default nextApiHandler;
