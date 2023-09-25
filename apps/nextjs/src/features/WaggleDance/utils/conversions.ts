// conversions.ts

import {
  type GraphData,
  type LinkObject,
  type NodeObject,
} from "react-force-graph-2d";

import { type TaskState } from "@acme/agent";
import { type DraftExecutionGraph } from "@acme/db";

export function dagToGraphData(
  dag: DraftExecutionGraph | null | undefined,
  taskStates: TaskState[],
): GraphData {
  if (!dag) {
    return { nodes: [], links: [] };
  }
  const nodes = dag.nodes.map((node) => {
    return {
      id: node.id,
      name: node.name,
      context: node.context,
      status: taskStates.find((taskState) => taskState.id === node.id)?.status, // FIXME: nested O(n)
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

  const links: LinkObject[] = dag.edges
    .map((edge) => ({
      source: nodeLookup[edge.sId],
      target: nodeLookup[edge.tId],
      sId: nodeLookup[edge.sId],
    }))
    .filter((link) => !!link.source && !!link.target);

  return { nodes, links };
}
