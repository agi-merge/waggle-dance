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
  console.log("plan request");
  try {
    const { creationProps, goal, goalId } =
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
            console.log("handleChainError", packet);
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
            console.log("handleLLMError", packet);
          },
        };

        const callbacks = [inlineCallback];
        creationProps.callbacks = callbacks;
        console.log("about to planChain");

        const planResultPromise = createPlanningAgent(
          creationProps,
          goal,
          goalId,
          abortController.signal,
        );
        const results = await Promise.allSettled([planResultPromise]);
        const [planResult] = results;
        console.debug("plan result", planResult.status);
        controller.close();
      },

      cancel() {
        abortController.abort();
        console.warn("cancel plan request");
      },
    });

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
      },
      status,
    });
  }
}
