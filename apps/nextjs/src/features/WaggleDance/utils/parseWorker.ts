// parseWorker.ts
import { parse } from "yaml";

import { type DraftExecutionGraph } from "@acme/db";

import {
  AgentPacketFinishedTypes,
  hookRootUpToServerGraph,
  makeServerIdIfNeeded,
  rootPlanId,
  transformWireFormat,
  type AgentPacket,
  type AgentPacketFinishedType,
  type PlanWireFormat,
} from "../../../../../../packages/agent";

interface MyWorkerGlobalScope {
  onmessage: (event: MessageEvent) => void;
  postMessage: (message: unknown) => void;
}

declare const self: MyWorkerGlobalScope;
console.debug("parseWorker.ts");
let dag: DraftExecutionGraph | null | undefined;
let tokens = "";
let goal = "";
let executionId = "";
self.onmessage = function (
  event: MessageEvent<
    { buffer: string } | { goal: string; executionId: string }
  >,
) {
  if ("executionId" in event.data && "goal" in event.data) {
    goal = event.data.goal;
    executionId = event.data.executionId;
    return;
  }

  const { buffer } = event.data;
  try {
    const newPackets = parse(buffer) as Partial<AgentPacket>[];
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
      parse(tokens) as PlanWireFormat,
      goal,
      executionId,
    ) as Partial<DraftExecutionGraph>;
    if (yaml && yaml.nodes && yaml.nodes.length > 0) {
      const optDag = yaml;
      const nodes = optDag.nodes ?? [];
      const edges = optDag.edges ?? [];
      const validNodes = nodes.filter(
        (n) => n.name.length > 0 && n.id.length > 0 && n.context.length > 0,
      );
      validNodes?.forEach(
        (n) => (n.id = makeServerIdIfNeeded(n.id, executionId)),
      );

      const validEdges = edges.filter(
        (n) => n.sId.length >= 3 && n.tId.length >= 3, // bit of a hack to check if id is of shape "1-0", may break for multi digit
      );

      const partialDAG = hookRootUpToServerGraph(
        { executionId, nodes: validNodes, edges: validEdges },
        rootPlanId,
        executionId,
        goal,
      );
      dag = partialDAG;
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
