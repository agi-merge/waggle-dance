// /api/execute.js

import { type NextRequest } from "next/server";

import { type ExecuteRequestBody } from "../types";

async function fetchExecute(
  request: ExecuteRequestBody,
  abortSignal: AbortSignal,
) {
  const data = { ...request };
  const response = await fetch(`${process.env.NEXTAUTH_URL}/api/execute/run`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
    signal: abortSignal,
  });

  console.log("response", response);

  return response;
}

async function execute(req: NextRequest) {
  const abortController = new AbortController();
  const body = (await req.json()) as ExecuteRequestBody;
  const runResponse = await fetchExecute(body, abortController.signal);

  return new Response(runResponse.body, {
    status: runResponse.status,
    statusText: runResponse.statusText,
    headers: runResponse.headers,
  });
}

export default execute;
