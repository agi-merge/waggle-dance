// parseWorker.ts
import { parse } from "yaml";

import { type ChainPacket } from "../../../../../../packages/agent";
import DAG, { DAGEdgeClass } from "../DAG";
import { initialNodes, rootPlanId } from "../initialNodes";

interface MyWorkerGlobalScope {
  onmessage: (event: MessageEvent) => void;
  postMessage: (message: unknown) => void;
}

declare const self: MyWorkerGlobalScope;
console.debug("parseWorker.ts");
let dag: DAG | null | undefined;
let tokens = "";

self.onmessage = function (
  event: MessageEvent<{ buffer: string; goal: string }>,
) {
  const { buffer, goal } = event.data;
  try {
    const newPackets = parse(buffer) as Partial<ChainPacket>[];
    newPackets.forEach((packet) => {
      if (packet.type === "token" && packet.token) {
        tokens += packet.token;
      }
    });
    const yaml = parse(tokens) as Partial<DAG>;
    if (yaml && yaml.nodes && yaml.nodes.length > 0) {
      const optDag = yaml;
      const validNodes = optDag.nodes?.filter(
        (n) =>
          n.name.length > 0 && n.act.length > 0 && n.id.length > 0 && n.context,
      );
      const validEdges = optDag.edges?.filter(
        (n) => n.sId.length > 0 && n.tId.length > 0,
      );
      if (validNodes?.length) {
        const hookupEdges = findNodesWithNoIncomingEdges(optDag).map(
          (node) => new DAGEdgeClass(rootPlanId, node.id),
        );
        const partialDAG = new DAG(
          [...initialNodes(goal), ...validNodes],
          [...(validEdges ?? []), ...hookupEdges],
        );
        dag = partialDAG;
      }
    } else {
      dag = null;
    }
  } catch (error) {
    self.postMessage({ dag, error: "partial parse" });
    // normal, we're streaming and receive partial data
  }
  if (dag) {
    self.postMessage({ dag });
  } else {
    self.postMessage({ dag, error: "no dag" });
  }
};

function findNodesWithNoIncomingEdges(dag: Partial<DAG>) {
  const nodesWithIncomingEdges = new Set<string>();
  for (const edge of dag.edges ?? []) {
    nodesWithIncomingEdges.add(edge.tId);
  }

  const nodesWithNoIncomingEdges = [];

  for (const node of dag.nodes ?? []) {
    if (!nodesWithIncomingEdges.has(node.id)) {
      nodesWithNoIncomingEdges.push(node);
    }
  }
  return nodesWithNoIncomingEdges;
}
