// chain/execute.ts

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
  const writePacket = (packet: ChainPacket) => {
    res.write(JSON.stringify(packet) + "\n");
  };
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
      dags,
    } = JSON.parse(body) as ExecuteRequestBody;

    const inlineCallback = {
      handleLLMStart: (llm: { name: string }, _prompts: string[]) => {
        console.debug("handleLLMStart", { llm });
        const packet: ChainPacket = {
          type: "info",
          value: JSON.stringify({ name: llm.name }),
        };
        writePacket(packet);
      },
      handleChainStart: (chain: { name: string }) => {
        console.debug("handleChainStart", { chain });
        const packet: ChainPacket = {
          type: "info",
          value: JSON.stringify({ name: chain.name }),
        };
        writePacket(packet);
      },
      handleAgentAction: (action: AgentAction) => {
        console.debug("handleAgentAction", action);
        const packet: ChainPacket = {
          type: "info",
          value: JSON.stringify({ action }),
        };
        writePacket(packet);
      },
      handleToolStart: (tool: { name: string }) => {
        console.debug("handleToolStart", { tool });
        const packet: ChainPacket = {
          type: "info",
          value: JSON.stringify({ name: tool.name }),
        };
        writePacket(packet);
      },
    };

    const callbacks = [inlineCallback];
    creationProps.callbacks = callbacks;
    console.log("about to execute tasks");
    const executionPromises = tasks.map((task, idx) => {
      const dag = dags[idx];
      return executeChain({
        creationProps,
        goal,
        task,
        dag,
      });
    });
    const executionResults = await Promise.allSettled(executionPromises);

    console.debug("executePlan results", executionResults);
    res.write(JSON.stringify({ results: executionResults }));
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
    writePacket({ type: "error", value: JSON.stringify(all) });
    res.end();
  }
};

export default handler;
