 
 
 

import { IncomingMessage, ServerResponse } from "http";
import { NextApiRequest, NextApiResponse } from "next";
import { type NextRequest, NextResponse } from "next/server";
import axios from "axios";

import { planChain } from "@acme/chain";

import { type StrategyRequestBody } from "./types";

export const config = {
  runtime: "edge",
};

const handler = async (req: NextRequest) => {
  // try {
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
