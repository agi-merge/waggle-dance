import { type NextRequest } from "next/server";
import { BaseCallbackHandler } from "langchain/callbacks";
import { type Serialized } from "langchain/load/serializable";
import { type AgentAction, type AgentFinish } from "langchain/schema";
import { stringify } from "yaml";

import { getBaseUrl } from "@acme/api/utils";
import { type DraftExecutionNode, type ExecutionState } from "@acme/db";

import { type ExecuteRequestBody } from "~/features/WaggleDance/types/types";
import {
  callExecutionAgent,
  type AgentPacket,
} from "../../../../../../packages/agent";
import { type CreateResultParams } from "../result";

export const config = {
  api: {
    bodyParser: false,
  },
  runtime: "edge",
};

export default async function ExecuteStream(req: NextRequest) {
  console.log("execute request");
  let executionResult:
    | { packet: AgentPacket; state: ExecutionState }
    | undefined;
  let goalId: string | undefined;
  let executionId: string | undefined;
  let resolveStreamEnded: () => void;
  let rejectStreamEnded: (reason?: string) => void;
  const streamEndedPromise = new Promise<void>((resolve, reject) => {
    resolveStreamEnded = resolve;
    rejectStreamEnded = reject;
  });
  const abortController = new AbortController();
  let node: DraftExecutionNode | undefined;
  const packets: AgentPacket[] = [];
  try {
    const {
      creationProps,
      goal,
      goalId: parsedGoalId,
      executionId: parsedExecutionId,
      task,
      agentPromptingMethod,
      dag,
      revieweeTaskResults,
    } = (await req.json()) as ExecuteRequestBody;
    node = task;
    goalId = parsedGoalId;
    executionId = parsedExecutionId;

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        creationProps.callbacks = [
          BaseCallbackHandler.fromMethods({
            handleLLMStart(): void | Promise<void> {
              const packet: AgentPacket = { type: "handleLLMStart" };
              controller.enqueue(encoder.encode(stringify([packet])));
              packets.push(packet);
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
              packets.push(packet);
              console.error("handleLLMError", packet);
            },
            handleChainError(
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
                type: "handleChainError",
                err: errorMessage,
              };
              controller.enqueue(encoder.encode(stringify([packet])));
              packets.push(packet);
              console.error("handleChainError", packet);
            },
            handleToolStart(
              tool: Serialized,
              input: string,
              _runId: string,
              _parentRunId?: string | undefined,
            ): void | Promise<void> {
              const packet: AgentPacket = {
                type: "handleToolStart",
                tool,
                input,
              };
              controller.enqueue(encoder.encode(stringify([packet])));
              packets.push(packet);
            },
            handleToolError(
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
                type: "handleToolError",
                err: errorMessage,
              };
              controller.enqueue(encoder.encode(stringify([packet])));
              packets.push(packet);
              console.error("handleToolError", packet);
            },
            handleToolEnd(
              output: string,
              _runId: string,
              _parentRunId?: string | undefined,
            ): void | Promise<void> {
              const packet: AgentPacket = { type: "handleToolEnd", output };
              controller.enqueue(encoder.encode(stringify([packet])));
              packets.push(packet);
            },
            handleAgentAction(
              action: AgentAction,
              _runId: string,
              _parentRunId?: string | undefined,
            ): void | Promise<void> {
              const packet: AgentPacket = { type: "handleAgentAction", action };
              controller.enqueue(encoder.encode(stringify([packet])));
              packets.push(packet);
            },
            handleRetrieverError(
              err: Error,
              _runId: string,
              _parentRunId?: string,
              _tags?: string[],
            ) {
              let errorMessage = "";
              if (err instanceof Error) {
                errorMessage = err.message;
              } else {
                errorMessage = stringify(err);
              }
              const packet: AgentPacket = {
                type: "handleRetrieverError",
                err: errorMessage,
              };
              controller.enqueue(encoder.encode(stringify([packet])));
              packets.push(packet);
            },
            handleAgentEnd(
              action: AgentFinish,
              _runId: string,
              _parentRunId?: string | undefined,
            ): void | Promise<void> {
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
              const output =
                action.returnValues && action.returnValues["output"];
              if (output === "Agent stopped due to max iterations.") {
                // not sure why this isn't an error…
                const packet: AgentPacket = {
                  type: "handleAgentError",
                  err: "Agent stopped due to max iterations.",
                };
                controller.enqueue(encoder.encode(stringify([packet])));
                packets.push(packet);
              } else {
                const value = stringify(output);
                const packet: AgentPacket = { type: "handleAgentEnd", value };
                controller.enqueue(encoder.encode(stringify([packet])));
                packets.push(packet);
              }
            },
          }),
        ];
        const contentType = "application/yaml";

        const exeResult = await callExecutionAgent({
          creationProps,
          goal,
          goalId: parsedGoalId,
          agentPromptingMethod,
          task: stringify(task),
          dag: stringify(dag),
          revieweeTaskResults,
          contentType,
          abortSignal: abortController.signal,
          namespace:
            goalId || executionId ? `${goalId}_${executionId}` : undefined,
          geo: req.geo,
        });

        let state: string;
        let packet: AgentPacket;
        if (exeResult instanceof Error) {
          state = "ERROR";
          packet = {
            type: "error",
            severity: "fatal",
            error: exeResult,
          };
        } else {
          state =
            dag.nodes[dag.nodes.length - 1]?.id == task.id
              ? "DONE"
              : "EXECUTING";
          packet = { type: "done", value: exeResult };
        }
        executionResult = { packet, state: state as ExecutionState };
        controller.enqueue(encoder.encode(stringify([packet])));
        resolveStreamEnded();
        controller.close();
      },

      cancel() {
        abortController.abort();
        console.warn("cancel execute request");
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
    executionResult = { packet: errorPacket, state: "ERROR" };
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

      if (!executionResult) {
        // TODO: save a new error for this case?
        return console.error("no execution result");
      }
      const { packet, state } = executionResult;
      let response:
        | Response
        | { ok: boolean; status: number; statusText: string };
      if (goalId && executionId && state && node) {
        const createResultParams: CreateResultParams = {
          goalId,
          node,
          executionId,
          packet,
          packets,
          state,
        };
        response = await fetch(`${getBaseUrl()}/api/result`, {
          method: "POST",
          headers: {
            Cookie: req.headers.get("cookie") || "", // pass cookie so session logic still works
            "Content-Type": "application/json",
          },
          body: JSON.stringify(createResultParams),
        });
      } else {
        response = {
          ok: false,
          status: 500,
          statusText: "!(goalId && executionId && state)",
        };
      }

      if (!response.ok && response.status !== 401) {
        const error = new Error(
          `Could not save result: ${response.statusText}`,
        );
        const errorPacket: AgentPacket = {
          type: "error",
          severity: "fatal",
          error,
        };
        return new Response(stringify([errorPacket]), {
          headers: {
            "Content-Type": "application/yaml",
          },
          status: 500,
        });
      }
    })();
  }
}
