import { type NextRequest } from "next/server";
import { BaseCallbackHandler } from "langchain/callbacks";
import { type Document } from "langchain/document";
import { type Serialized } from "langchain/load/serializable";
import { type AgentAction, type AgentFinish } from "langchain/schema";
import { parse, stringify } from "yaml";

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
      goalPrompt,
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
            // handleChatModelStart(
            //   llm: Serialized,
            //   messages: BaseMessage[][],
            //   runId: string,
            //   parentRunId?: string,
            //   extraParams?: Record<string, unknown>,
            //   tags?: string[],
            //   metadata?: Record<string, unknown>,
            // ): void | Promise<void> {
            // const packet: AgentPacket = {
            //   type: "handleChatModelStart",
            //   llm,
            //   messages,
            //   runId,
            //   parentRunId,
            //   extraParams,
            //   tags,
            //   metadata,
            // };
            // controller.enqueue(encoder.encode(stringify([packet])));
            // packets.push(packet);
            // },
            handleRetrieverStart(
              retriever: Serialized,
              query: string,
              runId: string,
              parentRunId?: string,
              tags?: string[],
              metadata?: Record<string, unknown>,
            ): void | Promise<void> {
              const packet: AgentPacket = {
                type: "handleRetrieverStart",
                retriever,
                query,
                runId,
                parentRunId,
                tags,
                metadata,
              };
              controller.enqueue(encoder.encode(stringify([packet])));
              packets.push(packet);
            },
            handleRetrieverEnd(
              documents: Document[],
              runId: string,
              parentRunId?: string,
              tags?: string[],
            ): void | Promise<void> {
              const packet: AgentPacket = {
                type: "handleRetrieverEnd",
                documents,
                runId,
                parentRunId,
                tags,
              };
              controller.enqueue(encoder.encode(stringify([packet])));
              packets.push(packet);
            },
            handleLLMStart(
              _llm: Serialized,
              _prompts: string[],
              runId: string,
              parentRunId: string,
            ): void | Promise<void> {
              const packet: AgentPacket = {
                type: "handleLLMStart",
                runId,
                parentRunId,
              };
              controller.enqueue(encoder.encode(stringify([packet])));
              packets.push(packet);
            },
            // handleLLMEnd(
            //   output: LLMResult,
            //   runId: string,
            //   parentRunId?: string,
            // ): Promise<void> | void {
            //   const packet: AgentPacket = {
            //     type: "handleLLMEnd",
            //     output,
            //     runId,
            //     parentRunId,
            //   };
            //   controller.enqueue(encoder.encode(stringify([packet])));
            //   packets.push(packet);
            // },
            handleLLMError(
              err: unknown,
              runId: string,
              parentRunId?: string | undefined,
            ): void | Promise<void> {
              const packet: AgentPacket = createErrorPacket(
                "handleLLMError",
                err,
                runId,
                parentRunId,
              );
              controller.enqueue(encoder.encode(stringify([packet])));
              packets.push(packet);
              console.error("handleLLMError", packet);
            },
            handleChainError(
              err: unknown,
              runId: string,
              parentRunId?: string | undefined,
            ): void | Promise<void> {
              const packet: AgentPacket = createErrorPacket(
                "handleChainError",
                err,
                runId,
                parentRunId,
              );
              controller.enqueue(encoder.encode(stringify([packet])));
              packets.push(packet);
              // can be 'Output parser not set'
              console.error("handleChainError", packet);
            },
            handleToolStart(
              tool: Serialized,
              input: string,
              runId: string,
              parentRunId?: string | undefined,
            ): void | Promise<void> {
              const packet: AgentPacket = {
                type: "handleToolStart",
                tool,
                input,
                runId,
                parentRunId,
              };
              controller.enqueue(encoder.encode(stringify([packet])));
              packets.push(packet);
            },
            handleToolError(
              err: unknown,
              runId: string,
              parentRunId?: string | undefined,
            ): void | Promise<void> {
              const packet: AgentPacket = createErrorPacket(
                "handleToolError",
                err,
                runId,
                parentRunId,
              );
              controller.enqueue(encoder.encode(stringify([packet])));
              packets.push(packet);
              console.error("handleToolError", packet);
            },
            handleToolEnd(
              output: string,
              runId: string,
              parentRunId?: string | undefined,
            ): void | Promise<void> {
              const packet: AgentPacket = {
                type: "handleToolEnd",
                output,
                runId,
                parentRunId,
              };
              controller.enqueue(encoder.encode(stringify([packet])));
              packets.push(packet);
            },
            handleAgentAction(
              action: AgentAction,
              runId: string,
              parentRunId?: string | undefined,
            ): void | Promise<void> {
              const packet: AgentPacket = {
                type: "handleAgentAction",
                action,
                runId,
                parentRunId,
              };
              controller.enqueue(encoder.encode(stringify([packet])));
              packets.push(packet);
            },
            handleRetrieverError(
              err: Error,
              runId: string,
              parentRunId?: string,
              _tags?: string[],
            ) {
              const packet: AgentPacket = createErrorPacket(
                "handleRetrieverError",
                err,
                runId,
                parentRunId,
              );
              controller.enqueue(encoder.encode(stringify([packet])));
              packets.push(packet);
            },
            handleAgentEnd(
              action: AgentFinish,
              runId: string,
              parentRunId?: string | undefined,
            ): void | Promise<void> {
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
              const output =
                action.returnValues && action.returnValues["output"];
              if (output === "Agent stopped due to max iterations.") {
                // not sure why this isn't an error…
                const packet: AgentPacket = {
                  type: "handleAgentError",
                  err: "Agent stopped due to max iterations.",
                  runId,
                  parentRunId,
                };
                controller.enqueue(encoder.encode(stringify([packet])));
                packets.push(packet);
              } else {
                const value = stringify(output);
                const packet: AgentPacket = {
                  type: "handleAgentEnd",
                  value,
                  runId,
                  parentRunId,
                };
                controller.enqueue(encoder.encode(stringify([packet])));
                packets.push(packet);
              }
            },
          }),
        ];
        const contentType = "application/yaml";

        const namespace =
          goalId || executionId ? `${goalId}_${executionId}` : task.id;
        console.debug("execution namespace", namespace);
        const exeResult = await callExecutionAgent({
          creationProps,
          goalPrompt,
          goalId: parsedGoalId,
          agentPromptingMethod,
          task: stringify(task),
          dag: stringify(dag),
          revieweeTaskResults,
          contentType,
          abortSignal: abortController.signal,
          namespace,
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

        try {
          controller.close();
        } catch {
          // intentionally left blank
        }

        function createErrorPacket(
          type:
            | "handleAgentError"
            | "handleChainError"
            | "handleLLMError"
            | "handleToolError"
            | "handleRetrieverError",
          error: unknown,
          runId: string,
          parentRunId?: string,
        ) {
          let err: unknown;
          if (error instanceof Error) {
            err = `${error.name}: ${error.message}\n${error.stack}`;
          } else if (typeof error === "string") {
            err = error;
          } else {
            err = parse(stringify(error, Object.getOwnPropertyNames(err)));
            if (!err) {
              err = stringify(error);
            }
          }
          const packet: AgentPacket = {
            type,
            err,
            runId,
            parentRunId,
          };
          return packet;
        }
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
        error: new Error(e),
      };
    } else {
      errorPacket = {
        type: "error",
        severity: "fatal",
        error: new Error(stringify(e)),
      };
    }
    executionResult = { packet: errorPacket, state: "ERROR" };
    console.error("execute error", e);

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
