// api/agent/plan.ts

import { type NextRequest } from "next/server";
import { stringify } from "yaml";

import { type ChainPacket } from "../../../../../../../packages/agent";
import { type ExecuteRequestBody } from "../types";

export const config = {
  api: {
    bodyParser: false,
  },
  runtime: "edge",
};

async function fetchExecute(
  request: ExecuteRequestBody,
  abortSignal: AbortSignal,
): Promise<Response> {
  const data = { ...request };
  const response = await fetch(
    `${process.env.NEXTAUTH_URL}/api/agent/execute/run`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
      signal: abortSignal,
    },
  );

  return response;
}

// A thin edge proxy that calls a full-fat serverless endpoint. On Vercel, nodejs functions cannot be streamed, only edge.
export default async function ExecuteStream(req: NextRequest) {
  console.log("plan request");
  try {
    const body = (await req.json()) as ExecuteRequestBody;

    req.signal.onabort = () => {
      console.error("aborted plan request");
    };

    const stream = (await fetchExecute(body, req.signal)).body;

    return new Response(stream, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (e) {
    let message;
    let status: number;
    let stack;
    if (e instanceof Error) {
      message = e.message;
      status = 500;
      stack = e.stack;
    } else {
      message = String(e);
      status = 500;
      stack = "";
    }

    const all = { stack, message, status };
    console.error("plan error", all);
    const errorPacket: ChainPacket = {
      type: "error",
      severity: "fatal",
      message: stringify(all),
    };
    return new Response(stringify([errorPacket]), {
      headers: {
        "Content-Type": "application/yaml",
        "Transfer-Encoding": "chunked",
      },
    });
  }
}
