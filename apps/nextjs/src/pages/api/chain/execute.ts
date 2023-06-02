// api/chain/execute.ts

import { type ExecuteRequestBody } from "./types";
import { createExecutionAgent } from "@acme/chain";
import { stringify } from "yaml"
import { type NextApiRequest, type NextApiResponse } from "next";
import { getServerSession } from "@acme/auth";
import { type IncomingMessage } from "http";

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
      task,
      dag,
      executionMethod,
      result,
      reviewPrefix,
    } = JSON.parse(body) as ExecuteRequestBody;
    // const encoder = new TextEncoder();

    // Replace the ReadableStream with res.writeHead/write/end
    res.writeHead(200, {
      "Content-Type": "application/octet-stream",
      "Transfer-Encoding": "chunked",
    });
    // const writePacket = (packet: ChainPacket) => {
    //   res.write(JSON.stringify(packet) + "\n");
    // };
    const inlineCallback = {
      handleLLMNewToken(token: string) {
        res.write(token);
      },

      // handleLLMStart: (llm: { name: string }, _prompts: string[]) => {
      //   console.debug("handleLLMStart", { llm });
      //   writePacket({ type: "handleLLMStart", nodeId, llm });
      // },
      // handleChainStart: (chain: { name: string }) => {
      //   console.debug("handleChainStart", { chain });
      //   writePacket({ type: "handleChainStart", nodeId, chain });
      // },
      // handleAgentAction: (action: AgentAction) => {
      //   console.debug("handleAgentAction", action);
      //   writePacket({ type: "handleAgentAction", nodeId, action });
      // },
      // handleToolStart: (tool: { name: string }) => {
      //   console.debug("handleToolStart", { tool });
      //   writePacket({ type: "handleToolStart", nodeId, tool });
      // },
    };

    const callbacks = [inlineCallback];
    creationProps.callbacks = callbacks;
    const exeResult = await createExecutionAgent(creationProps, goal, stringify(task), stringify(dag), executionMethod, result, reviewPrefix, session?.user.id)

    console.log("exeResult", exeResult);
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
    console.error(all);
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