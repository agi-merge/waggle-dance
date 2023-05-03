/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { IncomingMessage, ServerResponse } from "http";
import { NextApiRequest, NextApiResponse } from "next";
import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

import { planChain } from "@acme/chain";

import { StrategyRequestBody } from "./types";

export const config = {
  runtime: "edge",
};

const handler = async (req: NextRequest) => {
  // try {
  const { creationProps, goal } = (await req.json()) as StrategyRequestBody;
  console.log("creationProps", creationProps);
  console.log("goal", goal);
  const newTasks = await planChain(creationProps, goal);
  console.log("newTasks", newTasks);
  return new Response(JSON.stringify(newTasks), {
    status: 200,
    headers: {
      "content-type": "application/json",
    },
  });
};

export default handler;
