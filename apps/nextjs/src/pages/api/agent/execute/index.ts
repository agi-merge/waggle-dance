// api/agent/execute/index.ts

// api/execute.ts
import { type NextRequest } from "next/server";

import { type ExecuteRequestBody } from "../types";

export const config = {
  runtime: "edge",
};

export default async function ExecuteStream(req: NextRequest) {
  const abortController = new AbortController();

  try {
    const body = (await req.json()) as ExecuteRequestBody;
    const stream = new ReadableStream({
      async start(controller) {
        const response = await fetch(
          `${process.env.NEXTAUTH_URL}/api/agent/execute/run`,
          {
            method: "POST",
            headers: {
              Cookie: req.headers.get("cookie") || "", // pass cookie so session logic still works
              "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
            signal: abortController.signal,
          },
        );

        if (!response.ok) {
          throw new Error(`Error: ${response.statusText}`);
        }

        const reader = response.body?.getReader();
        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done || abortController.signal.aborted) {
              break;
            }
            if (value) {
              controller.enqueue(value);
            }
          }
        }

        controller.close();
      },

      cancel() {
        console.warn("cancel execute request");
        if (!abortController.signal.aborted) {
          abortController.abort();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (e) {
    if (!abortController.signal.aborted) {
      abortController.abort();
    }
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

    console.error("execute error", { stack, message, status });
    return new Response(JSON.stringify([{ type: "error", message, status }]), {
      headers: {
        "Content-Type": "application/json",
      },
      status,
    });
  }
}
