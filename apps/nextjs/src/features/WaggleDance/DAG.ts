// DAG.ts
export interface Params {
  [key: string]: string;
}
export interface Cond {
  predicate: string;
  params: Params;
}

export class CondClass {
  predicate: string;
  params: Params;

  constructor(predicate: string, params: Params) {
    this.predicate = predicate;
    this.params = params;
  }
}

export interface DAGNode {
  id: string;
  action: string;
  params: Params;
}
export interface DAGEdge {
  source: string;
  target: string;
}
export class DAGNodeClass implements DAGNode {
  id: string;
  action: string;
  params: Params;

  constructor(id: string, action: string, params: Params) {
    this.id = id;
    this.action = action;
    this.params = params;
  }
}

export class DAGEdgeClass implements DAGEdge {
  source: string;
  target: string;

  constructor(source: string, target: string) {
    this.source = source;
    this.target = target;
  }
}
export default class DAG {
  readonly nodes: DAGNode[];
  readonly edges: DAGEdge[];
  readonly init: Cond[];
  readonly current: Cond[];
  readonly goal: Cond[];

  constructor(
    nodes: DAGNode[],
    edges: DAGEdge[],
    init: Cond[],
    current: Cond[],
    goal: Cond[],
  ) {
    this.nodes = nodes;
    this.edges = edges;
    this.init = init;
    this.current = current;
    this.goal = goal;
  }
}
