import type {DraftExecutionNode, Result} from "@acme/db";

import { rootPlanId  } from "../../..";
import type {AgentPacket} from "../../..";
import { mapPacketTypeToStatus } from "../utils/mapPacketToStatus";
import type {TaskStatus} from "./TaskStatus";

// Wrapper of Result that adds some useful methods
export class TaskState implements AugmentedResponse {
  id: string;
  packets: AgentPacket[];
  value: AgentPacket;
  updatedAt: Date;
  nodeId: string | null;
  artifactUrls: string[];

  constructor(result: AugmentedResponse) {
    this.id = result.id;
    this.packets = result.packets;
    this.value = result.value;
    this.updatedAt = result.updatedAt;
    this.nodeId = result.nodeId;
    this.artifactUrls = result.artifactUrls;
  }

  // Getters

  get status(): TaskStatus {
    // Compute the status from the value packet
    return mapPacketTypeToStatus(this.value.type);
  }

  get tier(): string | null {
    return extractTier(this.nodeId);
  }

  get taskNumber(): number | null {
    return extractTaskNumber(this.nodeId);
  }

  get displayId(): string {
    return getDisplayId(this.id, this.nodeId);
  }

  // Public helpers

  findNode(nodes: DraftExecutionNode[]): DraftExecutionNode | undefined {
    return nodes.find((n) => n.id === this.nodeId || n.id === this.displayId);
  }
}

type AugmentedResponse = { packets: AgentPacket[]; value: AgentPacket } & Omit<
  Result,
  "goalId" | "executionId" | "value" | "packets" | "packetVersion" | "createdAt"
>;

export function extractTier(fromId: string | null): string | null {
  if (!fromId) return null;
  const tierAndOptionalServerId = fromId.split("-")[0];
  const tierAndOptionalServerIdSplit = tierAndOptionalServerId?.split(".");
  const tier =
    tierAndOptionalServerIdSplit?.[tierAndOptionalServerIdSplit.length - 1];

  return tier || null;
}

export function extractTaskNumber(nodeId: string | null): number | null {
  if (!nodeId) return null;
  const parts = nodeId.split("-");
  if (parts.length < 2) return null;
  const lastPart = parts[parts.length - 1];
  if (!lastPart) return null;
  const taskNumber = parseInt(lastPart, 10);
  return isNaN(taskNumber) ? null : taskNumber;
}

export function getDisplayId(id: string, nodeId: string | null): string {
  if (id === rootPlanId) {
    return rootPlanId;
  }
  const executionSplit = nodeId?.split(".")[1];
  if (!executionSplit) {
    return id;
  } else {
    return executionSplit;
  }
}
