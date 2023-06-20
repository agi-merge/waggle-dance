// api/chain/execute.ts

import { type ExecuteRequestBody } from "./types";
import { type ChainValues, createExecutionAgent, type ChainPacket } from "@acme/chain";
import { stringify } from "yaml";
import { type NextApiRequest, type NextApiResponse } from "next";
import { getServerSession } from "@acme/auth";
import { type IncomingMessage } from "http";
import { appRouter } from "@acme/api";
import { prisma } from "@acme/db";
import { type AgentAction, type AgentFinish, type LLMResult } from "langchain/schema";

export const config = {
  api: {
    bodyParser: false,
  },
  runtime: "nodejs",
};

const handler = async (req: IncomingMessage, res: NextApiResponse) => {
  const session = await getServerSession({
    req: req as unknown as NextApiRequest,
    res: res,
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
      dag,
      executionMethod,
      taskResults,
      reviewPrefix,
    } = JSON.parse(body) as ExecuteRequestBody;

    res.writeHead(200, {
      "Content-Type": "application/octet-stream",
      "Transfer-Encoding": "chunked",
    });

    const inlineCallback = {

      handleLLMStart(llm: { name: string; }, prompts: string[], runId: string, parentRunId?: string | undefined, extraParams?: Record<string, unknown> | undefined): void | Promise<void> {
        const packet: ChainPacket = { type: "handleLLMStart", llm, prompts, runId, parentRunId, extraParams }
        res.write(stringify([packet]));
      },

      handleLLMNewToken(token: string) {
        const packet: ChainPacket = { type: "token", token }
        res.write(stringify([packet]));
      },

      /**
       * Called if an LLM/ChatModel run encounters an error
       */
      handleLLMError(err: any, runId: string, parentRunId?: string | undefined): void | Promise<void> {
        const packet: ChainPacket = { type: "handleLLMError", err: err.message, runId, parentRunId }
        res.write(stringify([packet]));
      },

      handleLLMEnd(output: LLMResult, runId: string, parentRunId?: string | undefined): void | Promise<void> {
        const packet: ChainPacket = { type: "handleLLMEnd", output, runId, parentRunId }
        res.write(stringify([packet]));
      },
      /**
       * Called at the start of a Chat Model run, with the prompt(s)
       * and the run ID.
       */
      // handleChatModelStart?(llm: {
      //   name: string;
      // }, messages: BaseChatMessage[][], runId: string, parentRunId?: string | undefined, extraParams?: Record<string, unknown> | undefined): void | Promise<void>;
      /**
       * Called at the start of a Chain run, with the chain name and inputs
       * and the run ID.
       */
      handleChainStart(chain: {
        name: string;
      }, inputs: ChainValues, runId: string, parentRunId?: string | undefined): void | Promise<void> {
        const packet: ChainPacket = { type: "handleChainStart", chain, inputs, runId, parentRunId }
        res.write(stringify([packet]));
      },
      /**
       * Called if a Chain run encounters an error
       */
      handleChainError(err: any, runId: string, parentRunId?: string | undefined): void | Promise<void> {
        const packet: ChainPacket = { type: "handleChainError", err: err.message, runId, parentRunId }
        res.write(stringify([packet]));
      },
      /**
       * Called at the end of a Chain run, with the outputs and the run ID.
       */
      handleChainEnd(outputs: ChainValues, runId: string, parentRunId?: string) {
        const packet: ChainPacket = { type: "handleChainEnd", outputs, runId, parentRunId }
        res.write(stringify([packet]));
      },
      /**
       * Called at the start of a Tool run, with the tool name and input
       * and the run ID.
       */
      handleToolStart(tool: {
        name: string;
      }, input: string, runId: string, parentRunId?: string | undefined): void | Promise<void> {
        const packet: ChainPacket = { type: "handleToolStart", tool, input, runId, parentRunId }
        res.write(stringify([packet]));
      },
      /**
       * Called if a Tool run encounters an error
       */
      handleToolError(err: any, runId: string, parentRunId?: string | undefined): void | Promise<void> {
        const packet: ChainPacket = { type: "handleToolError", err: err.message, runId, parentRunId }
        res.write(stringify([packet]));
      },
      /**
       * Called at the end of a Tool run, with the tool output and the run ID.
       */
      handleToolEnd(output: string, runId: string, parentRunId?: string | undefined): void | Promise<void> {
        const packet: ChainPacket = { type: "handleToolEnd", output, runId, parentRunId }
        res.write(stringify([packet]));
      },
      handleText(text: string, runId: string, parentRunId?: string | undefined): void | Promise<void> {
        const packet: ChainPacket = { type: "handleText", text, runId, parentRunId }
        res.write(stringify([packet]));
      },
      /**
       * Called when an agent is about to execute an action,
       * with the action and the run ID.
       */
      handleAgentAction(action: AgentAction, runId: string, parentRunId?: string | undefined): void | Promise<void> {
        const packet: ChainPacket = { type: "handleAgentAction", action, runId, parentRunId }
        res.write(stringify([packet]));
      },
      /**
       * Called when an agent finishes execution, before it exits.
       * with the final output and the run ID.
       */
      handleAgentEnd(action: AgentFinish, runId: string, parentRunId?: string | undefined): void | Promise<void> {
        const packet: ChainPacket = { type: "handleAgentEnd", action, runId, parentRunId }
        res.write(stringify([packet]));
      }
    };

    const callbacks = [inlineCallback];
    creationProps.callbacks = callbacks;

    const idMinusCriticize = task.id.startsWith("criticize-") ? task.id.slice("criticize-".length) : null;
    const result = idMinusCriticize ? taskResults[idMinusCriticize] : null;
    const exeResult = await createExecutionAgent(
      creationProps,
      goal,
      goalId,
      stringify(task),
      stringify(dag),
      stringify(executionMethod),
      stringify(result),
      reviewPrefix,
      session?.user.id
    );

    if (session?.user.id) {
      try {
        const caller = appRouter.createCaller({ session, prisma });
        const createResultOptions = { goalId, value: exeResult, graph: dag };
        console.log("createResultOptions", createResultOptions);
        const _createResult = await caller.goal.createResult(createResultOptions);
        console.log("_createResult", _createResult);
      } catch (error) {
        // ignore
        console.error(error);
      }
    }
    res.end();
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
    const errorPacket = { type: "error", nodeId: "catch-all", severity: "fatal", message: JSON.stringify(all) };
    if (!res.headersSent) {
      res.writeHead(status, {
        "Content-Type": "application/json",
        "Transfer-Encoding": "chunked",
      });
    }
    res.end(JSON.stringify(errorPacket))
  }
};

export default handler;