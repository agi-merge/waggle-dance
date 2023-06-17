// api/chain/execute.ts

import { type ExecuteRequestBody } from "./types";
import { createExecutionAgent } from "@acme/chain";
import { stringify } from "yaml";
import { type NextApiRequest, type NextApiResponse } from "next";
import { getServerSession } from "@acme/auth";
import { type IncomingMessage } from "http";
import { appRouter } from "@acme/api";
import { prisma } from "@acme/db";

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
    const customBuffer = Buffer.alloc(0);

    const inlineCallback = {
      handleLLMNewToken(token: string) {
        customBuffer.write(token);
        res.write(token);
      },

      handleChainError(err: Error, runId: string, parentRunId?: string) {
        console.error("handleChainError", { err, runId, parentRunId });
      },
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
    const value = customBuffer.toString();
    if (session?.user.id) {
      try {
        const caller = appRouter.createCaller({ session, prisma });
        const createResultOptions = { goalId, value: value.length > 0 ? value : exeResult, graph: dag };
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
      res.writeHead(500, {
        "Content-Type": "application/json",
        "Transfer-Encoding": "chunked",
      });
    }
    res.end(JSON.stringify(errorPacket))
  }
};

export default handler;