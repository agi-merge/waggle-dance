import { type AgentPacketType } from "../../..";
import { TaskStatus } from "../types/TaskStatus";

export const mapPacketTypeToStatus = (
  packetType: AgentPacketType | undefined,
): TaskStatus => {
  switch (packetType) {
    case "done":
    case "handleAgentEnd":
    case "handleChainEnd":
    case "handleLLMEnd":
      return TaskStatus.done;
    case "error":
    case "handleLLMError":
    case "handleChainError":
    case "handleToolError":
    case "handleAgentError":
      return TaskStatus.error;
    case "working":
    case "token":
    case "handleLLMStart":
    case "handleChainStart":
    case "handleToolStart":
    case "handleAgentAction":
    case "handleRetrieverError":
    case "handleText":
    case "handleToolEnd":
    case "starting":
      return TaskStatus.working;
    case "requestHumanInput":
      return TaskStatus.wait;
    case "idle":
    case undefined:
      return TaskStatus.idle;
  }
};
