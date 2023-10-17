import { type DraftExecutionNode, type Result } from "@acme/db";

import { type AgentPacket } from "../../..";
import { isTaskCriticism } from "../types";
import { mapPacketTypeToStatus } from "../utils/mapPacketToStatus";
import { type TaskStatus } from "./TaskStatus";

// Wrapper of Result that adds some useful methods
export class TaskState implements AugmentedResponse {
  id: string;
  packets: AgentPacket[];
  value: AgentPacket;
  updatedAt: Date;
  nodeId: string;

  constructor(result: AugmentedResponse) {
    this.id = result.id;
    this.packets = result.packets;
    this.value = result.value;
    this.updatedAt = result.updatedAt;
    this.nodeId = result.nodeId;
  }

  // Getters

  get status(): TaskStatus {
    // Compute the status from the value packet
    return mapPacketTypeToStatus(this.value.type);
  }

  get tier(): string | null {
    return this.extractTier(this.nodeId);
  }

  get taskNumber(): number | null {
    return this.extractTaskNumber(this.nodeId);
  }

  get displayId(): string {
    const executionSplit = this.nodeId.split(".")[1];
    if (!executionSplit) {
      return this.explainTaskId(this.id);
    } else {
      return this.explainTaskId(executionSplit);
    }
  }

  // Public helpers

  findNode(nodes: DraftExecutionNode[]): DraftExecutionNode | undefined {
    return nodes.find((n) => n.id === this.nodeId || n.id === this.displayId);
  }

  // private helpers

  private explainTaskId(id: string): string {
    const isCriticism: boolean = isTaskCriticism(id);
    const tier = this.extractTier(id);
    const explained = isCriticism
      ? `Tier ${tier} ⚖️ Review`
      : `Tier ${tier} 🎯 Task ${Number(this.nodeSplit[1]) + 1}`;
    return explained;
  }

  private get nodeSplit(): string[] {
    return this.nodeId.split(".");
  }

  private extractTier(fromId: string) {
    const tier = fromId.split("-")[0];
    return tier || null;
  }

  private extractTaskNumber(nodeId: string): number | null {
    const parts = nodeId.split("-");
    if (parts.length < 2) return null;
    const lastPart = parts[parts.length - 1];
    if (!lastPart) return null;
    const taskNumber = parseInt(lastPart, 10);
    return isNaN(taskNumber) ? null : taskNumber;
  }
}

type AugmentedResponse = { packets: AgentPacket[]; value: AgentPacket } & Omit<
  Result,
  "goalId" | "executionId" | "value" | "packets" | "packetVersion" | "createdAt"
>;
