import { type NextRequest } from "next/server";

import { planChain } from "@acme/chain";

import { type StrategyRequestBody } from "./types";

export const config = {
  runtime: "edge",
};

const handler = async (req: NextRequest) => {
  const { creationProps, goal } = (await req.json()) as StrategyRequestBody;
  const planResult = await planChain(creationProps, goal);
  console.log("planResult", planResult);
  const json = JSON.stringify(planResult);
  console.log(json);
  return new Response(json, {
    status: 200,
    headers: {
      "content-type": "application/json",
    },
  });
};

export default handler;
