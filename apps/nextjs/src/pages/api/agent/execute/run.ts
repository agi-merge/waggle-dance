// api/agent/execute/run.ts

import { type IncomingMessage } from "http";
import { type NextApiRequest, type NextApiResponse } from "next";
import { BaseCallbackHandler } from "langchain/callbacks";
import { type Serialized } from "langchain/load/serializable";
import { type AgentAction, type AgentFinish } from "langchain/schema";
import { stringify } from "yaml";

import { appRouter } from "@acme/api";
import { getServerSession } from "@acme/auth";
import { prisma } from "@acme/db";

import {
  createExecutionAgent,
  type ChainPacket,
} from "../../../../../../../packages/agent";
import { type ExecuteRequestBody } from "../types";

export const config = {
  api: {
    bodyParser: false,
  },
  runtime: "nodejs",
  regions: ["pdx-1"], // TODO: figure out a way to make this use process.env
};

const handler = async (req: IncomingMessage, res: NextApiResponse) => {
  const session = await getServerSession({
    req: req as unknown as NextApiRequest,
    res,
  });

  const bodyChunks = [];
  for await (const chunk of req) {
    bodyChunks.push(chunk);
  }
  const body = Buffer.concat(bodyChunks).toString();

  try {
    const {
      creationProps,
      goal,
      goalId,
      task,
      agentPromptingMethod,
      dag,
      taskResults,
    } = JSON.parse(body) as ExecuteRequestBody;

    res.writeHead(200, {
      "Content-Type": "application/octet-stream",
      "Transfer-Encoding": "chunked",
    });

    const inlineCallback = BaseCallbackHandler.fromMethods({
      handleLLMStart(): void | Promise<void> {
        const packet: ChainPacket = { type: "handleLLMStart" };
        res.write(stringify([packet]));
      },
      /**
       * Called if an LLM/ChatModel run encounters an error
       */
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
        res.write(stringify([packet]));
        console.error("handleLLMError", packet);
      },
      /**
       * Called if a Chain run encounters an error
       */
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
        res.write(stringify([packet]));
        console.error("handleChainError", packet);
      },
      /**
       * Called at the start of a Tool run, with the tool name and input
       * and the run ID.
       */
      handleToolStart(
        tool: Serialized,
        input: string,
        _runId: string,
        _parentRunId?: string | undefined,
      ): void | Promise<void> {
        const packet: ChainPacket = { type: "handleToolStart", tool, input };
        res.write(stringify([packet]));
      },
      /**
       * Called if a Tool run encounters an error
       */
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
        res.write(stringify([packet]));
        console.error("handleToolError", packet);
      },
      /**
       * Called at the end of a Tool run, with the tool output and the run ID.
       */
      handleToolEnd(
        output: string,
        _runId: string,
        _parentRunId?: string | undefined,
      ): void | Promise<void> {
        const packet: ChainPacket = { type: "handleToolEnd", output };
        res.write(stringify([packet]));
      },
      /**
       * Called when an agent is about to execute an action,
       * with the action and the run ID.
       */
      handleAgentAction(
        action: AgentAction,
        _runId: string,
        _parentRunId?: string | undefined,
      ): void | Promise<void> {
        const packet: ChainPacket = { type: "handleAgentAction", action };
        res.write(stringify([packet]));
      },
      /**
       * Called when an agent finishes execution, before it exits.
       * with the final output and the run ID.
       */
      handleAgentEnd(
        action: AgentFinish,
        _runId: string,
        _parentRunId?: string | undefined,
      ): void | Promise<void> {
        const value = stringify(
          action.returnValues && action.returnValues["output"],
        );
        const packet: ChainPacket = { type: "handleAgentEnd", value };
        res.write(stringify([packet]));
      },
    });

    const callbacks = [inlineCallback];
    creationProps.callbacks = callbacks;

    const idMinusCriticize = task.id.endsWith("-criticize")
      ? task.id.slice(0, task.id.length - "-criticize".length)
      : null;
    const result = idMinusCriticize ? taskResults[idMinusCriticize] : null;
    const abortController = new AbortController();
    req.once("close", () => {
      abortController.abort();
    });
    const exeResult = await createExecutionAgent({
      creationProps,
      goal,
      goalId,
      agentPromptingMethod,
      task: stringify(task),
      dag: stringify(dag),
      result: stringify(result),
      abortSignal: abortController.signal,
      namespace: session?.user.id,
    });

    if (exeResult instanceof Error) {
      const errorPacket: ChainPacket = {
        type: "error",
        severity: "fatal",
        message: String(exeResult),
      };
      res.end(stringify([errorPacket]));
      return;
    }

    if (session?.user.id) {
      try {
        const caller = appRouter.createCaller({ session, prisma });
        const createResultOptions = { goalId, value: exeResult, graph: dag };
        const _createResult = await caller.goal.createResult(
          createResultOptions,
        );
      } catch (error) {
        // ignore
        console.error(error);
      }
    }
    const donePacket: ChainPacket = { type: "done", value: exeResult };
    res.end(stringify([donePacket]));
  } catch (e) {
    let message;
    let status: number;
    let stack;
    if (e instanceof Error) {
      message = e.message;
      status = 500;
      stack = e.stack;
    } else {
      message = stringify(e);
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
    if (!res.headersSent) {
      res.writeHead(status, {
        "Content-Type": "application/yaml",
        "Transfer-Encoding": "chunked",
      });
    }
    res.end(stringify([errorPacket]));
  } finally {
    req.removeAllListeners();
  }
};

export default handler;
