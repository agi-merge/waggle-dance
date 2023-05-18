// import { type ServerResponse } from "http";
// import { BaseCallbackHandler } from "langchain/callbacks";
// import { type AgentAction } from "langchain/dist/schema";

// import { type ChainPacket } from "./types";

// export default class StreamingCallbackHandler extends BaseCallbackHandler {
//   name = "streaming_handler";
//   res?: ServerResponse;

//   constructor(res?: ServerResponse) {
//     super();
//     this.res = res;
//   }

//   handleLLMNewToken(token: string) {
//     console.log("token", { token });
//   }

//   handleLLMStart(llm: { name: string }, _prompts: string[]) {
//     console.debug("handleLLMStart", { llm });
//     const packet: ChainPacket = {
//       type: "info",
//       value: JSON.stringify({ llm }),
//     };
//     this.res?.write(JSON.stringify(packet) + "\n");
//   }

//   handleChainStart(chain: { name: string }) {
//     console.debug("handleChainStart", { chain });
//     this.res?.write("handleChainStart");
//     const packet: ChainPacket = {
//       type: "info",
//       value: JSON.stringify({ chain }),
//     };
//     this.res?.write(JSON.stringify(packet) + "\n");
//   }

//   handleAgentAction(action: AgentAction) {
//     console.debug("handleAgentAction", action);
//     const packet: ChainPacket = {
//       type: "info",
//       value: JSON.stringify({ action }),
//     };
//     this.res?.write(JSON.stringify(packet) + "\n");
//   }

//   handleToolStart(tool: { name: string }) {
//     console.debug("handleToolStart", { tool });
//     const packet: ChainPacket = {
//       type: "info",
//       value: JSON.stringify({ tool }),
//     };
//     this.res?.write(JSON.stringify(packet) + "\n");
//   }
// }
