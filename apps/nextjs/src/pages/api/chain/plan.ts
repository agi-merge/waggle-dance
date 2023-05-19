// api/chain/plan.ts

import { type ChainPacket, planChain } from "@acme/chain";
import { type StrategyRequestBody } from "./types";
import { type IncomingMessage, type ServerResponse } from "http";
import { type AgentAction } from "langchain/schema";
import { stringify } from "yaml"
export const config = {
  api: {
    bodyParser: false,
  },
  runtime: "nodejs",
};

const handler = async (req: IncomingMessage, res: ServerResponse) => {
  const nodeId = "👑"; // maybe goal.slice(0, 5)
  const writePacket = (packet: ChainPacket) => {
    res.write(`${stringify(packet)}\n`);
  };
  try {
    const bodyChunks = [];
    for await (const chunk of req) {
      bodyChunks.push(chunk);
    };
    const reqBody = Buffer.concat(bodyChunks).toString();
    console.log("body", reqBody);
    const {
      creationProps,
      goal,
    } = JSON.parse(reqBody) as StrategyRequestBody;
    const inlineCallback = {
      handleLLMNewToken(token: string) {
        // console.debug("handleLLMNewToken", token);
        res.write(token);
        // writePacket({ type: "handleLLMNewToken", nodeId, token })
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
    console.log("about to planChain");
    res.writeHead(200, {
      "Content-Type": "application/octet-stream",
      "Transfer-Encoding": "chunked",
    });
    const planResult = await planChain(creationProps, goal);
    // console.debug("planChain", planResult);
    // writePacket({ type: "return", nodeId, value: planResult })
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
    writePacket({ type: "error", nodeId, severity: "fatal", message: JSON.stringify(all) });
    res.end();
  } finally {
    res.end();
  }
};

export default handler;