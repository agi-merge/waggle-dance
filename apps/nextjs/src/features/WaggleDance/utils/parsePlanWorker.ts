// parsePlanWorker.ts
import { parse } from "yaml";

import {
  AgentPacketFinishedTypes,
  removeEnclosingMarkdown,
  transformWireFormat,
  type AgentPacket,
  type AgentPacketFinishedType,
  type PlanWireFormat,
} from "@acme/agent";
import { type DraftExecutionGraph } from "@acme/db";

interface MyWorkerGlobalScope {
  onmessage: (event: MessageEvent) => void;
  postMessage: (message: unknown) => void;
}

declare const self: MyWorkerGlobalScope;
console.debug("parsePlanWorker.ts");
let dag: DraftExecutionGraph | null | undefined;
let tokens = "";
let goal = "";
let executionId = "";
self.onmessage = function (
  event: MessageEvent<
    { buffer: string } | { goalPrompt: string; executionId: string }
  >,
) {
  if ("executionId" in event.data && "goalPrompt" in event.data) {
    goal = event.data.goalPrompt;
    executionId = event.data.executionId;
    return;
  }

  const { buffer } = event.data;
  try {
    const newPackets = parse(buffer) as AgentPacket[];
    newPackets.forEach((packet) => {
      if (packet.type === "t" && packet.t) {
        tokens += packet.t;
      } else if (
        AgentPacketFinishedTypes.includes(
          packet.type as AgentPacketFinishedType,
        )
      ) {
        self.postMessage({ finishPacket: packet });
      }
    });

    const yaml = transformWireFormat(
      parse(removeEnclosingMarkdown(tokens)) as PlanWireFormat,
      goal,
      executionId,
    );
    if (yaml && yaml.nodes && yaml.nodes.length > 0) {
      dag = {
        nodes: yaml.nodes,
        edges: yaml.edges,
        executionId,
      };
    } else {
      dag = null;
    }
  } catch (error) {
    // self.postMessage({ dag, error: "partial parse" });
    // normal, we're streaming and receive partial data
  }
  if (dag) {
    self.postMessage({ dag });
  } else {
    self.postMessage({ error: "no dag" });
  }
};
