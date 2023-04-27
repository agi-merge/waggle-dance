import { type ServerResponse } from "http";
import { BaseCallbackHandler } from "langchain/callbacks";
import { type AgentAction } from "langchain/dist/schema";

import { type Message } from "@acme/api/src/router/agentTypes";

export default class StreamingCallbackHandler extends BaseCallbackHandler {
  name = "streaming_handler";
  res?: ServerResponse;

  constructor(res?: ServerResponse) {
    super();
    this.res = res;
  }

  handleLLMNewToken(token: string) {
    console.log("token", { token });
  }

  handleLLMStart(llm: { name: string }, _prompts: string[]) {
    console.debug("handleLLMStart", { llm });
    const message: Message = {
      type: "system",
      info: JSON.stringify({ llm }),
    };
    this.res?.write(JSON.stringify(message) + "\n");
  }

  handleChainStart(chain: { name: string }) {
    console.debug("handleChainStart", { chain });
    this.res.write("handleChainStart");
    const message: Message = {
      type: "system",
      info: JSON.stringify({ chain }),
    };
    this.res?.write(JSON.stringify(message) + "\n");
  }

  handleAgentAction(action: AgentAction) {
    console.debug("handleAgentAction", action);
    const message: Message = {
      type: "system",
      info: JSON.stringify({ action }),
    };
    this.res?.write(JSON.stringify(message) + "\n");
  }

  handleToolStart(tool: { name: string }) {
    console.debug("handleToolStart", { tool });
    const message: Message = {
      type: "system",
      info: JSON.stringify({ tool }),
    };
    this.res?.write(JSON.stringify(message) + "\n");
  }
}
