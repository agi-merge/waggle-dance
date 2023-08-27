// api/agent/result.ts

import { type NextRequest } from "next/server";
import { stringify } from "yaml";

import { type RefineRequestBody } from "~/features/WaggleDance/types";
import {
  callRefiningAgent,
  type ChainPacket,
} from "../../../../../../packages/agent";

export const config = {
  runtime: "edge",
};

export type CreateResultParams = {
  prompt: string;
};

// data proxy for edge
export default async function PlanStream(req: NextRequest) {
  const abortController = new AbortController();
  let refineResult: string | undefined;
  let resolveStreamEnded: () => void;
  let rejectStreamEnded: (reason?: string) => void;
  const streamEndedPromise = new Promise<void>((resolve, reject) => {
    resolveStreamEnded = resolve;
    rejectStreamEnded = reject;
  });
  try {
    const { creationProps, goal } = (await req.json()) as RefineRequestBody;
    // const session = await getServerSession({ req, res });

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

        refineResult = await callRefiningAgent({
          creationProps,
          goal,
          signal: abortController.signal,
        });

        console.debug("plan result", refineResult);
        controller.close();
        resolveStreamEnded();
      },

      cancel() {
        abortController.abort();
        console.warn("cancel plan request");
        rejectStreamEnded("Stream cancelled");
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
    refineResult = stringify(all);
    console.error("plan error", all);
    const errorPacket: ChainPacket = {
      type: "error",
      severity: "fatal",
      message: refineResult,
    };

    return new Response(stringify([errorPacket]), {
      headers: {
        "Content-Type": "application/yaml",
      },
      status,
    });
  } finally {
    // wrap this because otherwise streaming is broken due to finally being run, and awaiting, before the return stream.
    void (async () => {
      await streamEndedPromise;

      // if (goalId && executionId) {
      //   // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      //   const graph = (planResult && parse(planResult)) || null;
      //   await updateExecution(
      //     {
      //       goalId,
      //       // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      //       graph,
      //       executionId,
      //     },
      //     req,
      //   );
      // } else {
      //   console.error(
      //     "could not save execution, it must be manually cleaned up",
      //   );
      // }
    })();
  }
}
