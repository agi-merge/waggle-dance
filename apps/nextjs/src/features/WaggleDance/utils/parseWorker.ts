// parseWorker.ts
import { v4 } from "uuid";
import { parse } from "yaml";

import {
  type DraftExecutionGraph,
  type DraftExecutionNode,
  type ExecutionNode,
} from "@acme/db";

import {
  AgentPacketFinishedTypes,
  findNodesWithNoIncomingEdges,
  makeServerIdIfNeeded,
  rootPlanId,
  type AgentPacket,
  type AgentPacketFinishedType,
  type OldPlanWireFormat,
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
    const yaml = transform(
      parse(tokens) as PlanWireFormat,
    ) as Partial<DraftExecutionGraph>;
    if (yaml && yaml.nodes && yaml.nodes.length > 0) {
      const optDag = yaml;
      const validNodes = optDag.nodes?.filter(
        (n) => n.name.length > 0 && n.id.length > 0 && n.context,
      );
      validNodes?.forEach(
        (n) => (n.id = makeServerIdIfNeeded(n.id, executionId)),
      );
      const validEdges = optDag.edges?.filter(
        (n) => n.sId.length > 0 && n.tId.length > 0,
      );
      validEdges?.forEach((e) => {
        e.sId = makeServerIdIfNeeded(e.sId, executionId);
        e.tId = makeServerIdIfNeeded(e.tId, executionId);
      });
      if (validNodes?.length) {
        const hookupEdges = findNodesWithNoIncomingEdges(optDag).map((node) => {
          return {
            sId: rootPlanId,
            tId: node.id,
            graphId: node.graphId || "",
            id: v4(),
          };
        });
        const partialDAG: DraftExecutionGraph = {
          executionId,
          nodes: [...initialNodes, ...validNodes],
          edges: [...(validEdges ?? []), ...hookupEdges],
        };
        dag = partialDAG;
      }
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
function transform(newFormat: PlanWireFormat): OldPlanWireFormat {
  const oldFormat: OldPlanWireFormat = { nodes: [], edges: [] };
  const previousLevelNodes: DraftExecutionNode[] = [];

  for (const level in newFormat) {
    const nodes = newFormat[level];
    for (const item of nodes ?? []) {
      if ("parents" in item && (item.parents as number[])) {
        const parentIds = item.parents as number[];
        for (const parentId of parentIds) {
          for (const parentNode of previousLevelNodes) {
            if (parentNode.id === parentId.toString()) {
              const newNodeId = `${level}-${parentNode.id}`;
              oldFormat.edges.push({
                sId: `${level}-${parentId}`,
                tId: newNodeId,
              });
            }
          }
        }
      } else {
        const node = item as unknown as DraftExecutionNode; // ok due to logic above
        const newNodeId = `${level}-${node.id}`;
        oldFormat.nodes.push({
          id: newNodeId,
          name: node.name,
          context: node.context,
        });
        previousLevelNodes.push(node);
      }
    }
  }

  return oldFormat;
}
