import { type ServerResponse } from "http";
import { BaseCallbackHandler } from "langchain/callbacks";
import { type AgentAction } from "langchain/dist/schema";

import { type ChainPacket } from "./types";

export default class StreamingCallbackHandler extends BaseCallbackHandler {
  name = "streaming_handler";
  writePacket: (packet: ChainPacket) => void;

  constructor(writePacket: (packet: ChainPacket) => void) {
    super();
    this.writePacket = writePacket;
    this.handleLLMStart = this.handleLLMStart.bind(this);
    this.handleChainStart = this.handleChainStart.bind(this);
    this.handleAgentAction = this.handleAgentAction.bind(this);
    this.handleToolStart = this.handleToolStart.bind(this);
  }

  handleLLMNewToken(token: string) {
    // console.log("token", { token });
  }

  handleLLMStart(llm: { name: string }, _prompts: string[]) {
    console.debug("handleLLMStart", { llm });
    const packet: ChainPacket = {
      type: "system",
      value: JSON.stringify({ name: llm.name }),
    };
    this.writePacket(packet);
  }

  handleChainStart(chain: { name: string }) {
    console.debug("handleChainStart", { chain });
    const packet: ChainPacket = {
      type: "system",
      value: JSON.stringify({ name: chain.name }),
    };
    this.writePacket(packet);
  }

  handleAgentAction(action: AgentAction) {
    console.debug("handleAgentAction", action);
    const packet: ChainPacket = {
      type: "system",
      value: JSON.stringify({ action }),
    };
    this.writePacket(packet);
  }

  handleToolStart(tool: { name: string }) {
    console.debug("handleToolStart", { tool });
    const packet: ChainPacket = {
      type: "system",
      value: JSON.stringify({ name: tool.name }),
    };
    this.writePacket(packet);
  }
}
