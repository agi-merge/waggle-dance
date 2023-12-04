// conversions.ts

import type { GraphData, LinkObject, NodeObject } from "react-force-graph-2d";

import type { TaskState } from "@acme/agent";
import type { DraftExecutionGraph } from "@acme/db";

export function dagToGraphData(
  dag: DraftExecutionGraph | null | undefined,
  taskStatesMap: Record<string, TaskState>,
): GraphData {
  if (!dag) {
    return { nodes: [], links: [] };
  }

  const nodes = dag.nodes.map((node) => {
    const taskState = taskStatesMap[node.id];
    return {
      id: node.id,
      name: node.name,
      context: node.context,
      status: taskState?.status,
    };
  });

  // Create a lookup object for finding NodeObject by id
  const nodeLookup: Record<string, NodeObject> = nodes.reduce(
    (lookup: Record<string, NodeObject>, node) => {
      if (node.id !== undefined) {
        lookup[node.id] = node;
      }
      return lookup;
    },
    {},
  );

  const links: LinkObject[] = dag.edges
    .map((edge) => ({
      source: nodeLookup[edge.sId],
      target: nodeLookup[edge.tId],
      sId: nodeLookup[edge.sId],
    }))
    .filter((link) => !!link.source && !!link.target);

  return { nodes, links };
}
