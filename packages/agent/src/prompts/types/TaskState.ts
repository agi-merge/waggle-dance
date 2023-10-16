import { type DraftExecutionNode, type Result } from "@acme/db";

import { type AgentPacket } from "../../..";
import { isTaskCriticism } from "../types";
import { mapPacketTypeToStatus } from "../utils/mapPacketToStatus";
import { type TaskStatus } from "./TaskStatus";

// Wrapper of Result that adds some useful methods
export class TaskState implements EnhancedResponse {
  id: string;
  packets: AgentPacket[];
  value: AgentPacket;
  updatedAt: Date;
  nodeId: string;

  constructor(result: EnhancedResponse) {
    this.id = result.id;
    this.packets = result.packets;
    this.value = result.value;
    this.updatedAt = result.updatedAt;
    this.nodeId = result.nodeId;
  }

  get status(): TaskStatus {
    // Compute the status from the value packet
    return mapPacketTypeToStatus(this.value.type);
  }

  node(nodes: DraftExecutionNode[]): DraftExecutionNode | undefined {
    return nodes.find((n) => n.id === this.nodeId || n.id === this.displayId());
  }

  displayId(): string {
    const executionSplit = this.nodeId.split(".")[1];
    if (!executionSplit) {
      return this.explainTaskId(this.id);
    } else {
      return this.explainTaskId(executionSplit);
    }
  }
  private explainTaskId(id: string): string {
    const nodeSplit = id.split("-");
    if (nodeSplit.length === 2) {
      const isCriticism: boolean = isTaskCriticism(nodeSplit[1]!);
      const explained = isCriticism
        ? `Tier ${nodeSplit[0]} ⚖️ Review`
        : `Tier ${nodeSplit[0]} 🎯 Task ${Number(nodeSplit[1]) + 1}`;
      return explained;
    } else {
      return id;
    }
  }
}

type EnhancedResponse = { packets: AgentPacket[]; value: AgentPacket } & Omit<
  Result,
  "goalId" | "executionId" | "value" | "packets" | "packetVersion" | "createdAt"
>;
