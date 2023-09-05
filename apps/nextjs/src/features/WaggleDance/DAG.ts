import { v4 } from "uuid";

import { type ExecutionEdge, type ExecutionNode } from "@acme/db";

// DAG.ts

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

// export type DAG = ExecutionGraphPlusNodesAndEdges;

// export default DAG;
