import { NextResponse, type NextRequest } from "next/server";
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
  try {
    const {
      creationProps,
      goal,
      goalId,
      executionId,
      task,
      agentPromptingMethod,
      dag,
      taskResults,
    } = (await req.json()) as ExecuteRequestBody;

    const abortController = new AbortController();
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        creationProps.callbacks = [
          BaseCallbackHandler.fromMethods({
            handleLLMStart(): void | Promise<void> {
              const packet: ChainPacket = { type: "handleLLMStart" };
              controller.enqueue(encoder.encode(stringify([packet]) + "\n\n"));
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
              controller.enqueue(encoder.encode(stringify([packet]) + "\n\n"));
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
              controller.enqueue(encoder.encode(stringify([packet]) + "\n\n"));
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
              controller.enqueue(encoder.encode(stringify([packet]) + "\n\n"));
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
              controller.enqueue(encoder.encode(stringify([packet]) + "\n\n"));
              console.error("handleToolError", packet);
            },
            handleToolEnd(
              output: string,
              _runId: string,
              _parentRunId?: string | undefined,
            ): void | Promise<void> {
              const packet: ChainPacket = { type: "handleToolEnd", output };
              controller.enqueue(encoder.encode(stringify([packet]) + "\n\n"));
            },
            handleAgentAction(
              action: AgentAction,
              _runId: string,
              _parentRunId?: string | undefined,
            ): void | Promise<void> {
              const packet: ChainPacket = { type: "handleAgentAction", action };
              controller.enqueue(encoder.encode(stringify([packet]) + "\n\n"));
            },
            handleAgentEnd(
              action: AgentFinish,
              _runId: string,
              _parentRunId?: string | undefined,
            ): void | Promise<void> {
              const value = stringify(
                action.returnValues && action.returnValues["output"],
              );
              const packet: ChainPacket = { type: "handleAgentEnd", value };
              controller.enqueue(encoder.encode(stringify([packet]) + "\n\n"));
            },
          }),
        ];

        const exeResult = await createExecutionAgent({
          creationProps,
          goal,
          goalId,
          agentPromptingMethod,
          task: stringify(task),
          dag: stringify(dag),
          result: String(taskResults[task.id]),
          abortSignal: abortController.signal,
          namespace: executionId,
        });

        let state: string;
        let packet: Uint8Array;
        if (exeResult instanceof Error) {
          state = "ERROR";
          packet = encoder.encode(
            stringify({
              type: "error",
              severity: "fatal",
              message: exeResult.message,
            }) + "\n\n",
          );
        } else {
          (state =
            dag.nodes[dag.nodes.length - 1]?.id == finalId
              ? "DONE"
              : "EXECUTING"),
            (packet = encoder.encode(
              stringify({ type: "done", value: exeResult }) + "\n\n",
            ));
        }
        const createResultParams = {
          goalId,
          executionId,
          exeResult,
          dag,
          state,
        };
        const response = await fetch(`${process.env.NEXTAUTH_URL}/api/result`, {
          method: "POST",
          headers: {
            Cookie: req.headers.get("cookie") || "", // pass cookie so session logic still works
            "Content-Type": "application/json",
          },
          body: JSON.stringify(createResultParams),
          signal: abortController.signal,
        });

        if (!response.ok) {
          throw new Error(`Could not save result: ${response.statusText}`);
        }

        controller.enqueue(packet);
        controller.close();
      },

      cancel() {
        abortController.abort();
        console.warn("cancel execute request");
      },
    });

    return new NextResponse(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
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
    return new NextResponse(stringify([errorPacket]), {
      headers: {
        "Content-Type": "application/yaml",
      },
      status,
    });
  }
}
