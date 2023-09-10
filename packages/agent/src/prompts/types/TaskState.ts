import { type Result } from "@acme/db";

import { type AgentPacket } from "../../..";
import { mapPacketTypeToStatus } from "../utils/mapPacketToStatus";
import { type DAGNode } from "./DAGNode";
import { type TaskStatus } from "./TaskStatus";

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

  node(nodes: DAGNode[]): DAGNode | undefined {
    return nodes.find((n) => n.id === this.nodeId);
  }
}

type EnhancedResponse = { packets: AgentPacket[]; value: AgentPacket } & Omit<
  Result,
  "goalId" | "executionId" | "value" | "packets" | "packetVersion" | "createdAt"
>;
