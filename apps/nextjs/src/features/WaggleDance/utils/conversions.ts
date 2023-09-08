// conversions.ts

import { type TaskState } from "@acme/agent";

import {
  type GraphData,
  type LinkObject,
  type NodeObject,
} from "../components/ForceGraph";
import type DAG from "../types/DAG";

export function dagToGraphData(dag: DAG, taskStates: TaskState[]): GraphData {
  const nodes = dag.nodes.map((node) => {
    return {
      id: node.id,
      name: node.name,
      act: node.act,
      context: node.context,
      params: node.params,
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

  const links: LinkObject[] = dag.edges.map((edge) => ({
    source: nodeLookup[edge.sId],
    target: nodeLookup[edge.tId],
    sId: nodeLookup[edge.sId],
  }));

  return { nodes, links };
}
