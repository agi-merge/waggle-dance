// api/agent/execute/run.ts

import { BaseCallbackHandler } from "langchain/callbacks";
import { type Serialized } from "langchain/load/serializable";
import { type AgentAction, type AgentFinish } from "langchain/schema";
import { type NextApiRequest, type NextApiResponse } from "next";
import { stringify } from "yaml";

import { appRouter } from "@acme/api";
import { getServerSession, type Session } from "@acme/auth";
import { prisma, type ExecutionState } from "@acme/db";

import type DAG from "~/features/WaggleDance/DAG";
import {
  createExecutionAgent,
  finalId,
  type ChainPacket,
} from "../../../../../../../packages/agent";
import { type ExecuteRequestBody } from "../types";

export const config = {
  api: {
    bodyParser: false,
  },
  runtime: "nodejs",
};

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
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

    const session = await getServerSession({
      req: req as unknown as NextApiRequest,
      res,
    });

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
      result: String(result),
      abortSignal: abortController.signal,
      namespace: session?.user.id,
    });

    if (exeResult instanceof Error) {
      const errorPacket: ChainPacket = {
        type: "error",
        severity: "fatal",
        message: JSON.stringify(
          exeResult,
          Object.getOwnPropertyNames(exeResult),
        ),
      };
      void createResult(goalId, String(exeResult), dag, "ERROR", session);
      res.end(stringify([errorPacket]));
    } else {
      const lastNode = dag.nodes[dag.nodes.length - 1];
      const isLastNode = lastNode?.id == finalId;
      void createResult(
        goalId,
        exeResult,
        dag,
        isLastNode ? "DONE" : "EXECUTING",
        session,
      );
      const donePacket: ChainPacket = { type: "done", value: exeResult };
      res.end(stringify([donePacket]));
    }
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

async function createResult(
  goalId: string,
  exeResult: string,
  dag: DAG,
  state: ExecutionState | undefined,
  session?: Session | null,
) {
  if (session?.user.id) {
    const caller = appRouter.createCaller({ session, prisma });
    const createResultOptions = {
      goalId,
      value: exeResult,
      graph: dag,
      state,
    };
    2;
    const createResult = await caller.result.create(createResultOptions);
    console.log("createResult", createResult);
  } else {
    console.warn(
      `no userId ${
        session !== null
          ? "but session is not null. did you forget to pass cookies?"
          : ""
      }`,
    );
  }
}

export default handler;
