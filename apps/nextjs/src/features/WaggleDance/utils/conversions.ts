// conversions.ts

import type DAG from "../DAG";
import {
  type GraphData,
  type LinkObject,
  type NodeObject,
} from "../components/ForceGraph";

export function dagToGraphData(dag: DAG): GraphData {
  const nodes = dag.nodes.map((node) => {
    return {
      id: node.id,
      name: node.name,
      action: node.action,
      params: node.params,
    };
  });

  // Create a lookup object for finding NodeObject by id
  const nodeLookup: { [id: string]: NodeObject } = nodes.reduce(
    (lookup: { [id: string]: NodeObject }, node) => {
      if (node.id !== undefined) {
        lookup[node.id] = node;
      }
      return lookup;
    },
    {},
  );

  const links: LinkObject[] = dag.edges.map((edge) => ({
    source: nodeLookup[edge.sourceId],
    target: nodeLookup[edge.targetId],
  }));

  return { nodes, links };
}
