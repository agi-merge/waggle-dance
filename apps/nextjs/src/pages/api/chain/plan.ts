import { type NextRequest } from "next/server";

import { planChain } from "@acme/chain";

import { type StrategyRequestBody } from "./types";

export const config = {
  runtime: "edge",
};

const handler = async (req: NextRequest) => {
  const { creationProps, goal } = (await req.json()) as StrategyRequestBody;
  const newTasks = await planChain(creationProps, goal);
  return new Response(JSON.stringify(newTasks), {
    status: 200,
    headers: {
      "content-type": "application/json",
    },
  });
};

export default handler;
