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
      act: node.act,
      context: node.context,
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
    source: nodeLookup[edge.sId],
    target: nodeLookup[edge.tId],
    sId: nodeLookup[edge.sId]
  }));

  return { nodes, links };
}
