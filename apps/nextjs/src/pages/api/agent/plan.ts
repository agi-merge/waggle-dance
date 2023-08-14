// api/agent/plan.ts

import { type NextRequest } from "next/server";
import { stringify } from "yaml";

import {
  createPlanningAgent,
  type ChainPacket,
} from "../../../../../../packages/agent";
import { type PlanRequestBody } from "./types";

export const config = {
  api: {
    bodyParser: false,
  },
  runtime: "edge",
};

export default async function PlanStream(req: NextRequest) {
  console.debug("plan request");
  try {
    const { creationProps, goal, goalId, executionId } =
      (await req.json()) as PlanRequestBody;

    const abortController = new AbortController();

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const inlineCallback = {
          handleLLMNewToken(token: string) {
            const packet: ChainPacket = { type: "token", token };
            controller.enqueue(encoder.encode(stringify([packet])));
          },

          handleChainError(
            err: unknown,
            _runId: string,
            _parentRunId?: string,
          ) {
            let errorMessage = "";
            if (err instanceof Error) {
              errorMessage = err.message;
            } else {
              errorMessage = stringify(err);
            }
            const packet: ChainPacket = {
              type: "handleChainError",
              err: errorMessage,
            };
            controller.enqueue(encoder.encode(stringify([packet])));
            console.debug("handleChainError", packet);
          },

          handleLLMError(
            err: unknown,
            _runId: string,
            _parentRunId?: string | undefined,
          ): void | Promise<void> {
            let errorMessage = "";
            if (err instanceof Error) {
              errorMessage = err.message;
            } else {
              errorMessage = stringify(err);
            }
            const packet: ChainPacket = {
              type: "handleLLMError",
              err: errorMessage,
            };
            controller.enqueue(encoder.encode(stringify([packet])));
            console.debug("handleLLMError", packet);
          },
        };

        const callbacks = [inlineCallback];
        creationProps.callbacks = callbacks;
        console.debug("about to planChain");

        const planResult = await createPlanningAgent(
          creationProps,
          goal,
          goalId,
          abortController.signal,
        );
        console.debug("plan result", planResult);

        const updateGraph = {
          goalId,
          graph: planResult,
          executionId,
        };
        const response = await fetch(
          `${process.env.NEXTAUTH_URL}/api/execution/graph`,
          {
            method: "POST",
            headers: {
              Cookie: req.headers.get("cookie") || "", // pass cookie so session logic still works
              "Content-Type": "application/json",
            },
            body: JSON.stringify(updateGraph),
            signal: abortController.signal,
          },
        );

        if (!response.ok) {
          throw new Error(`Could not save execution: ${response.statusText}`);
        }

        controller.close();
      },

      cancel() {
        abortController.abort();
        console.warn("cancel plan request");
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
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
      },
      status,
    });
  }
}
