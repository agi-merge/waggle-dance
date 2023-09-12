// features/WaggleDance/types/DAG.ts

import { v4 } from "uuid";

import { type ExecutionEdge, type ExecutionNode } from "@acme/db";

export type DAGNodeClass = ExecutionNode;

export type DAGEdgeClass = ExecutionEdge;

export class OptionalDAG {
  readonly nodes?: ExecutionNode[];
  readonly edges?: ExecutionEdge[];

  constructor(
    nodes?: ExecutionNode[],
    edges?: ExecutionEdge[] /*, init?: Cond, goal?: Cond*/,
  ) {
    this.nodes = nodes;
    this.edges = edges;
  }
}
export default class DAG {
  readonly nodes: ExecutionNode[];
  readonly edges: ExecutionEdge[];
  readonly id: string;

  constructor(
    nodes: ExecutionNode[],
    edges: ExecutionEdge[] /*, init: Cond, goal: Cond*/,
    id: string = v4(),
  ) {
    this.nodes = nodes;
    this.edges = edges;
    this.id = id;
  }
}

// export function mergeDAGs(
//   agentPacketsMap: Record<string, TaskState>,
//   localDAG: DAG,
//   serverDAG: DAG,
// ): DAG {
//   const mergedNodes = [...localDAG.nodes, ...serverDAG.nodes];
//   const mergedEdges = [...localDAG.edges, ...serverDAG.edges];

//   // Attach packets to nodes
//   for (const node of mergedNodes) {
//     const taskState = agentPacketsMap[node.id];
//     if (taskState) {
//       node.packets = taskState.packets;
//     }
//   }

//   return new DAG(mergedNodes, mergedEdges);
// }
