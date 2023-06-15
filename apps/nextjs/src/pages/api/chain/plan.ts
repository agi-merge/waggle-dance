// api/chain/plan.ts

import { createPlanningAgent } from "@acme/chain";
import { type StrategyRequestBody } from "./types";
import { type NextRequest } from "next/server";
import { rootPlanId } from "~/features/WaggleDance/WaggleDanceMachine";

export const config = {
  api: {
    bodyParser: false,
  },
  runtime: "edge",
};

const handler = async (req: NextRequest) => {
  const nodeId = rootPlanId; // maybe goal.slice(0, 5)

  // const abortController = new AbortController();

  try {
    const {
      creationProps,
      goalId,
    } = await req.json() as StrategyRequestBody;

    // req.signal.onabort = () => {
    //   console.warn("abort plan request");
    //   abortController.abort();
    // };

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        const inlineCallback = {
          handleLLMNewToken(token: string) {
            controller.enqueue(encoder.encode(token));
          },
        };

        const callbacks = [inlineCallback];
        creationProps.callbacks = callbacks;
        console.log("about to planChain");

        const _planResult = await createPlanningAgent(creationProps, goalId, req.signal);
        controller.close();
      },

      cancel() {
        console.warn("cancel plan request");
        // const all = { message: "request canceled", status: 500 };
        // console.error(all);
        // const errorPacket = { type: "error", nodeId, severity: "fatal", message: JSON.stringify(all) };
        // return new Response(JSON.stringify(errorPacket), {
        //   headers: {
        //     "Content-Type": "application/json",
        //   },
        //   status: 500,
        // })
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
    console.error(all);
    const errorPacket = { type: "error", nodeId, severity: "fatal", message: JSON.stringify(all) };
    return new Response(JSON.stringify(errorPacket), {
      headers: {
        "Content-Type": "application/json",
      },
      status,
    })
  }
};

export default handler;