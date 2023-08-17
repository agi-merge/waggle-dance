import { type NextRequest } from "next/server";
import { BaseCallbackHandler } from "langchain/callbacks";
import { type Serialized } from "langchain/load/serializable";
import { type AgentAction, type AgentFinish } from "langchain/schema";
import { stringify } from "yaml";

import {
  createExecutionAgent,
  finalId,
  type ChainPacket,
} from "../../../../../../packages/agent";
import { type ExecuteRequestBody } from "./types";

export const config = {
  api: {
    bodyParser: false,
  },
  runtime: "edge",
};
export default async function ExecuteStream(req: NextRequest) {
  console.log("execute request");
  let executionResult: { packetString: string; state: string } | undefined;
  let goalId: string | undefined;
  let executionId: string | undefined;
  let resolveStreamEnded: () => void;
  let rejectStreamEnded: (reason?: string) => void;
  const streamEndedPromise = new Promise<void>((resolve, reject) => {
    resolveStreamEnded = resolve;
    rejectStreamEnded = reject;
  });
  const abortController = new AbortController();
  try {
    const {
      creationProps,
      goal,
      goalId: parsedGoalId,
      executionId: parsedExecutionId,
      task,
      agentPromptingMethod,
      dag,
      taskResults,
    } = (await req.json()) as ExecuteRequestBody;

    goalId = parsedGoalId;
    executionId = parsedExecutionId;

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        creationProps.callbacks = [
          BaseCallbackHandler.fromMethods({
            handleLLMStart(): void | Promise<void> {
              const packet: ChainPacket = { type: "handleLLMStart" };
              controller.enqueue(encoder.encode(stringify([packet])));
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
              const packet: ChainPacket = {
                type: "handleChainError",
                err: errorMessage,
              };
              controller.enqueue(encoder.encode(stringify([packet])));
              console.error("handleChainError", packet);
            },
            handleToolStart(
              tool: Serialized,
              input: string,
              _runId: string,
              _parentRunId?: string | undefined,
            ): void | Promise<void> {
              const packet: ChainPacket = {
                type: "handleToolStart",
                tool,
                input,
              };
              controller.enqueue(encoder.encode(stringify([packet])));
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
              const packet: ChainPacket = {
                type: "handleToolError",
                err: errorMessage,
              };
              controller.enqueue(encoder.encode(stringify([packet])));
              console.error("handleToolError", packet);
            },
            handleToolEnd(
              output: string,
              _runId: string,
              _parentRunId?: string | undefined,
            ): void | Promise<void> {
              const packet: ChainPacket = { type: "handleToolEnd", output };
              controller.enqueue(encoder.encode(stringify([packet])));
            },
            handleAgentAction(
              action: AgentAction,
              _runId: string,
              _parentRunId?: string | undefined,
            ): void | Promise<void> {
              const packet: ChainPacket = { type: "handleAgentAction", action };
              controller.enqueue(encoder.encode(stringify([packet])));
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
              const packet: ChainPacket = {
                type: "handleRetrieverError",
                err: errorMessage,
              };
              controller.enqueue(encoder.encode(stringify([packet])));
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
                const packet: ChainPacket = {
                  type: "handleAgentError",
                  err: "Agent stopped due to max iterations.",
                };
                controller.enqueue(encoder.encode(stringify([packet])));
              } else {
                const value = stringify(output);
                const packet: ChainPacket = { type: "handleAgentEnd", value };
                controller.enqueue(encoder.encode(stringify([packet])));
              }
            },
          }),
        ];

        const exeResult = await createExecutionAgent({
          creationProps,
          goal,
          goalId: parsedGoalId,
          agentPromptingMethod,
          task: stringify(task),
          dag: stringify(dag),
          result: String(taskResults[task.id]),
          abortSignal: abortController.signal,
          namespace: `${goalId}_${executionId}`,
        });

        let state: string;
        let packetString: string;
        if (exeResult instanceof Error) {
          state = "ERROR";
          packetString = stringify({
            type: "error",
            severity: "fatal",
            message: exeResult.message,
          });
        } else {
          state =
            dag.nodes[dag.nodes.length - 1]?.id == finalId
              ? "DONE"
              : "EXECUTING";
          packetString = stringify({ type: "done", value: exeResult });
        }
        const packet = encoder.encode(packetString);
        executionResult = { packetString, state };
        controller.enqueue(encoder.encode(stringify([packet])));
        controller.close();
        resolveStreamEnded();
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
    console.error("execute error", all);
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
  } finally {
    // wrap this because otherwise streaming is broken due to finally being run, and awaiting, before the return stream.
    void (async () => {
      await streamEndedPromise;

      if (!executionResult) {
        // TODO: save a new error for this case?
        return console.error("no execution result");
      }
      const { packetString: exeResult, state } = executionResult;
      const createResultParams = {
        goalId,
        executionId,
        exeResult,
        state,
      };
      const response = await fetch(`${process.env.NEXTAUTH_URL}/api/result`, {
        method: "POST",
        headers: {
          Cookie: req.headers.get("cookie") || "", // pass cookie so session logic still works
          "Content-Type": "application/json",
        },
        body: JSON.stringify(createResultParams),
      });

      if (!response.ok) {
        throw new Error(`Could not save result: ${response.statusText}`);
      }
    })();
  }
}
