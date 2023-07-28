// DAG.ts
export type Context = string;

export interface DAGNode {
  id: string;
  name: string;
  act: string;
  context: Context;
  params: string | null;
}
export interface DAGEdge {
  sId: string;
  tId: string;
}

export class DAGNodeClass implements DAGNode {
  id: string;
  name: string;
  act: string;
  context: Context;
  params: string | null;

  constructor(
    id: string,
    name: string,
    act: string,
    context: Context,
    params: string | null,
  ) {
    this.id = id;
    this.name = name;
    this.act = act;
    this.context = context;
    this.params = params;
  }
}

export class DAGEdgeClass implements DAGEdge {
  sId: string;
  tId: string;

  constructor(sId: string, tId: string) {
    this.sId = sId;
    this.tId = tId;
  }
}

export class OptionalDAG {
  readonly nodes?: DAGNode[];
  readonly edges?: DAGEdge[];

  constructor(
    nodes?: DAGNode[],
    edges?: DAGEdge[] /*, init?: Cond, goal?: Cond*/,
  ) {
    this.nodes = nodes;
    this.edges = edges;
  }
}
export default class DAG {
  readonly nodes: DAGNode[];
  readonly edges: DAGEdge[];

  constructor(nodes: DAGNode[], edges: DAGEdge[] /*, init: Cond, goal: Cond*/) {
    this.nodes = nodes;
    this.edges = edges;
  }
}
