/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { NextApiResponse } from "next";
import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

import { planChain } from "@acme/chain";

import { StrategyRequestBody } from "./types";

export const config = {
  runtime: "edge",
};

const handler = async (req: NextRequest, res: NextApiResponse) => {
  const isNode = config.runtime == "nodejs";
  try {
    const { creationProps, goal } = isNode
      ? (JSON.parse(JSON.stringify(req.body)) as StrategyRequestBody)
      : ((await req.json()) as StrategyRequestBody);
    const newTasks = await planChain(creationProps, goal);
    if (isNode) {
      res.status(200).json({ newTasks });
    } else {
      return NextResponse.json({ newTasks });
    }
  } catch (e) {
    let message;
    let status: number;
    let stack;
    if (e instanceof Error) {
      message = e.message;
      if (axios.isAxiosError(e)) {
        status = e.response?.status ?? 500;
      } else {
        status = 500;
      }
      stack = e.stack;
    } else {
      message = String(e);
      status = 500;
      stack = "";
    }

    const all = { stack, message, status };
    console.log(all);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    if (isNode) {
      res.status(status).json(all);
    } else {
      return NextResponse.json(all, { status: status });
    }
  }
};

export default handler;
