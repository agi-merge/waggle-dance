// parseWorker.ts
import { parse } from "yaml";

import {
  transformWireFormat,
  type DraftExecutionEdge,
  type DraftExecutionGraph,
  type ExecutionNode,
  type PlanWireFormat,
} from "@acme/db";

import {
  AgentPacketFinishedTypes,
  makeServerIdIfNeeded,
  rootPlanId,
  type AgentPacket,
  type AgentPacketFinishedType,
} from "../../../../../../packages/agent";

interface MyWorkerGlobalScope {
  onmessage: (event: MessageEvent) => void;
  postMessage: (message: unknown) => void;
}

declare const self: MyWorkerGlobalScope;
console.debug("parseWorker.ts");
let dag: DraftExecutionGraph | null | undefined;
let tokens = "";
let executionId = "";
let initialNodes: ExecutionNode[] = [];
self.onmessage = function (
  event: MessageEvent<
    { buffer: string } | { executionId: string; initialNodes: ExecutionNode[] }
  >,
) {
  if ("executionId" in event.data && "initialNodes" in event.data) {
    executionId = event.data.executionId;
    initialNodes = event.data.initialNodes;
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
        (n) => n.sId.length > 0 && n.tId.length > 0,
      );
      const targetEdgesMap: Record<string, DraftExecutionEdge> = edges.reduce(
        (acc: Record<string, DraftExecutionEdge>, edge) => {
          edge.sId = makeServerIdIfNeeded(edge.sId, executionId);
          edge.tId = makeServerIdIfNeeded(edge.tId, executionId);
          acc[edge.tId] = edge;
          return acc;
        },
        {} as Record<string, DraftExecutionEdge>,
      );

      const hookupEdges = edges.filter(
        (node) => node.id !== rootPlanId && !targetEdgesMap[node.id],
      );

      const partialDAG: DraftExecutionGraph = {
        executionId,
        nodes: [...initialNodes, ...validNodes],
        edges: [...hookupEdges, ...validEdges],
      };
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
