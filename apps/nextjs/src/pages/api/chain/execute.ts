import { type IncomingMessage, type ServerResponse } from "http";
import { type AgentAction } from "langchain/dist/schema";

import { executeChain, type ChainPacket } from "@acme/chain";

import { type ExecuteRequestBody } from "./types";

export const config = {
  api: {
    bodyParser: false,
  },
  runtime: "nodejs",
};

const handler = async (req: IncomingMessage, res: ServerResponse) => {
  try {
    res.writeHead(200, {
      "Content-Type": "application/octet-stream",
      "Transfer-Encoding": "chunked",
    });

    const bodyChunks = [];
    for await (const chunk of req) {
      bodyChunks.push(chunk);
    }
    const body = Buffer.concat(bodyChunks).toString();
    const {
      creationProps,
      goal,
      tasks,
      completedTasks: _completedTasks,
    } = JSON.parse(body) as ExecuteRequestBody;

    const idk = (packet: ChainPacket) => {
      res.write(JSON.stringify(packet) + "\n");
    };
    const inlineCallback = {
      handleLLMStart: (llm: { name: string }, _prompts: string[]) => {
        console.debug("handleLLMStart", { llm });
        const packet: ChainPacket = {
          type: "system",
          value: JSON.stringify({ name: llm.name }),
        };
        idk(packet);
      },
      handleChainStart: (chain: { name: string }) => {
        console.debug("handleChainStart", { chain });
        const packet: ChainPacket = {
          type: "system",
          value: JSON.stringify({ name: chain.name }),
        };
        idk(packet);
      },
      handleAgentAction: (action: AgentAction) => {
        console.debug("handleAgentAction", action);
        const packet: ChainPacket = {
          type: "system",
          value: JSON.stringify({ action }),
        };
        idk(packet);
      },
      handleToolStart: (tool: { name: string }) => {
        console.debug("handleToolStart", { tool });
        const packet: ChainPacket = {
          type: "system",
          value: JSON.stringify({ name: tool.name }),
        };
        idk(packet);
      },
    };

    const callbacks = [inlineCallback];
    creationProps.callbacks = callbacks;
    console.log("about to execute plan");
    const executionPromises = tasks.map(async (task) => {
      return await executeChain({
        creationProps,
        goal,
        task: task.id,
      });
    });
    const executionResults = Promise.all(executionPromises);

    console.debug("executePlan results", executionResults);

    res.write(executionPromises);
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

    res.writeHead(status, { "Content-Type": "application/json" });
    res.write(JSON.stringify(all));
    res.end();
  }
};

export default handler;
