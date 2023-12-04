import type { AgentPacketType } from "../../..";
import { TaskStatus } from "../types/TaskStatus";

export const mapPacketTypeToStatus = (
  packetType: AgentPacketType | undefined,
): TaskStatus => {
  switch (packetType) {
    case "done":
    case "handleAgentEnd":
      return TaskStatus.done;

    case "error":
    case "handleLLMError":
    case "handleChainError":
    case "handleAgentError":
      return TaskStatus.error;

    case "working":
    case "t":
    case "handleToolError":
    case "handleLLMStart":
    case "handleChainStart":
    case "handleToolStart":
    case "handleAgentAction":
    case "handleRetrieverError":
    case "handleText":
    case "handleToolEnd":
    case "starting":
    case "handleLLMEnd":
    case "handleRetrieverStart":
    case "handleChainEnd":
    case "handleRetrieverEnd":
    case "handleChatModelEnd":
    case "handleChatModelStart":
    case "contextAndTools":
    case "refine":
    case "rewrite":
    case "review":
    case "artifact":
      return TaskStatus.working;

    case "idle":
    case undefined:
      return TaskStatus.idle;
  }
};
