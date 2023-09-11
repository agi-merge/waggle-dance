// api/agent/plan.ts

import { type NextRequest } from "next/server";
import { stringify as jsonStringify } from "superjson";
import { parse, stringify } from "yaml";

import { getBaseUrl } from "@acme/api/utils";

import { type PlanRequestBody } from "~/features/WaggleDance/types/types";
import {
  callPlanningAgent,
  type AgentPacket,
} from "../../../../../../packages/agent";
import { type UpdateGraphParams } from "../execution/graph";

export const config = {
  api: {
    bodyParser: false,
  },
  runtime: "edge",
};

export default async function PlanStream(req: NextRequest) {
  console.debug("plan request");
  const abortController = new AbortController();
  let planResult: string | Error | undefined;
  let goalId: string | undefined;
  let executionId: string | undefined;
  let resolveStreamEnded: () => void;
  let rejectStreamEnded: ((error: Error) => void) | undefined = undefined;
  const streamEndedPromise = new Promise<void>((resolve, reject) => {
    resolveStreamEnded = resolve;
    rejectStreamEnded = reject;
  });
  try {
    const {
      creationProps,
      goal,
      goalId: parsedGoalId,
      executionId: parsedExecutionId,
    } = (await req.json()) as PlanRequestBody;
    goalId = parsedGoalId;
    executionId = parsedExecutionId;

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const inlineCallback = {
          handleLLMNewToken(token: string) {
            const packet: AgentPacket = { type: "token", token };
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
            const packet: AgentPacket = {
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
            const packet: AgentPacket = {
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

        planResult = await callPlanningAgent(
          creationProps,
          goal,
          goalId!,
          abortController.signal,
          `${goalId}_${executionId}`,
        );

        if (planResult instanceof Error) {
          rejectStreamEnded!(planResult);
        } else {
          resolveStreamEnded();
        }

        console.debug("plan result", planResult);
        controller.close();
      },

      cancel(reason) {
        abortController.abort();
        console.warn("cancel plan request", reason);
        rejectStreamEnded!(new Error("Stream cancelled"));
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
    let errorPacket: AgentPacket;
    if (e instanceof Error) {
      errorPacket = {
        type: "error",
        severity: "fatal",
        error: e,
      };
    } else if (e as AgentPacket) {
      errorPacket = e as AgentPacket;
    } else if (typeof e === "string") {
      errorPacket = {
        type: "error",
        severity: "fatal",
        error: new Error(stringify(e)),
      };
    } else {
      errorPacket = {
        type: "error",
        severity: "fatal",
        error: new Error(stringify(e)),
      };
    }
    console.error("plan error", e);

    let status = 500;
    if (e as { status: number }) {
      status = (e as { status: number }).status;
    }

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

      if (goalId && executionId && typeof planResult === "string") {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const graph = (planResult && parse(planResult)) || null;
        await updateExecution(
          {
            goalId,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            graph,
            executionId,
          },
          req,
        );
      } else {
        console.error(
          "could not save execution, it must be manually cleaned up",
        );
      }
    })();
  }
}

export async function updateExecution(
  params: UpdateGraphParams,
  req: NextRequest,
): Promise<void> {
  const response = await fetch(`${getBaseUrl()}/api/execution/graph`, {
    method: "POST",
    headers: {
      Cookie: req.headers.get("cookie") || "", // pass cookie so session logic still works
      "Content-Type": "application/json",
    },
    body: jsonStringify(params),
  });

  if (!response.ok) {
    throw new Error(`Could not save execution: ${response.statusText}`);
  }
}
