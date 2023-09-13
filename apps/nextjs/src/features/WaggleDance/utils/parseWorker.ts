// parseWorker.ts
import { v4 } from "uuid";
import { parse } from "yaml";

import { type DraftExecutionGraph, type ExecutionNode } from "@acme/db";

import {
  AgentPacketFinishedTypes,
  findNodesWithNoIncomingEdges,
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
      if (packet.type === "token" && packet.token) {
        tokens += packet.token;
      } else if (
        AgentPacketFinishedTypes.includes(
          packet.type as AgentPacketFinishedType,
        )
      ) {
        self.postMessage({ finishPacket: packet });
      }
    });
    const yaml = parse(tokens) as Partial<DraftExecutionGraph>;
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
        // const partialDAG = new DAG(
        //   [
        //     ...initialNodes,
        //     ...validNodes.map((n) => ({
        //       ...n,
        //       id: makeServerIdIfNeeded(n.id, executionId),
        //     })),
        //   ],
        //   [...(validEdges ?? []), ...hookupEdges],
        // );
        // dag = partialDAG;
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
