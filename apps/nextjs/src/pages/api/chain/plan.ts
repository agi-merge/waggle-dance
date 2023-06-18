// api/chain/plan.ts

import { type ChainValues, createPlanningAgent } from "@acme/chain";
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
            const packet = { type: "handleLLMNewToken", token }
            controller.enqueue(encoder.encode(stringify([packet])));
          },

          handleChainError(err: Error, runId: string, parentRunId?: string) {
            console.error("handleChainError", { err, runId, parentRunId });
            controller.enqueue(encoder.encode(stringify([{ type: "handleChainError", err: err.message, runId, parentRunId }])));
          },

          handleChainEnd(outputs: ChainValues, runId: string, parentRunId?: string) {
            controller.enqueue(encoder.encode(stringify([{ type: "handleChainEnd", outputs, runId, parentRunId }])));
          },

          handleAgentAction(action: { log: string, tool: string, toolInput: string },
            runId: string,
            parentRunId?: string) {
            controller.enqueue(encoder.encode(stringify([{ type: "handleAgentAction", action, runId, parentRunId }])));
          }
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
    const errorPacket = { type: "error", nodeId, severity: "fatal", message: JSON.stringify(all) };
    return new Response(JSON.stringify(errorPacket), {
      headers: {
        "Content-Type": "application/json",
      },
      status,
    })
  }
};
