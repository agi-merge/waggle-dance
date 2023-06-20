// api/chain/plan.ts

import { type ChainValues, createPlanningAgent, type ChainPacket } from "@acme/chain";
import { type StrategyRequestBody } from "./types";
import { type NextRequest } from "next/server";
import { rootPlanId } from "~/features/WaggleDance/WaggleDanceMachine";
import { stringify } from "yaml";

export const config = {
  api: {
    bodyParser: false,
  },
  runtime: "edge",
};

export default async function PlanStream(req: NextRequest) {
  console.log("plan request")
  const nodeId = rootPlanId; // maybe goal.slice(0, 5)
  try {
    const {
      creationProps,
      goal,
      goalId,
    } = await req.json() as StrategyRequestBody;

    req.signal.onabort = () => {
      console.error("aborted plan request");
    };

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        const inlineCallback = {
          handleLLMNewToken(token: string) {
            const packet: ChainPacket = { type: "token", token }
            controller.enqueue(encoder.encode(stringify([packet])));
          },

          handleChainError(err: Error, runId: string, parentRunId?: string) {
            console.error("handleChainError", { err, runId, parentRunId });
            const packet: ChainPacket = { type: "handleChainError", err: err.message, runId, parentRunId }
            controller.enqueue(encoder.encode(stringify([packet])));
          },

          handleLLMError(err: any, runId: string, parentRunId?: string | undefined): void | Promise<void> {
            const packet: ChainPacket = { type: "handleLLMError", err: err.message, runId, parentRunId }
            controller.enqueue(encoder.encode(stringify([packet])));
          },
        };

        const callbacks = [inlineCallback];
        creationProps.callbacks = callbacks;
        console.log("about to planChain");

        const planResultPromise = createPlanningAgent(creationProps, goal, goalId, req.signal);
        const createExecutionPromise = fetch(`${process.env.NEXTAUTH_URL}/api/chain/createGoalExecution`, {
          method: "POST",
          body: JSON.stringify({ goalId: goalId }),
          headers: {
            "Content-Type": "application/json",
            "Cookie": req.headers.get("cookie") || '',
          },
        });
        const results = await Promise.allSettled([planResultPromise, createExecutionPromise]);
        const [_planResult, _saveExecutionResult] = results;
        controller.close();
      },

      cancel() {
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
    const errorPacket: ChainPacket = { type: "error", severity: "fatal", message: JSON.stringify(all) };
    return new Response(stringify(errorPacket), {
      headers: {
        "Content-Type": "application/yaml",
      },
      status,
    })
  }
};
