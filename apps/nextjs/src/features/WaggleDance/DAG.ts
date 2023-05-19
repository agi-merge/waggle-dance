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
  name: string;
  action: string;
  params: Params;
}
export interface DAGEdge {
  sourceId: string;
  targetId: string;
}
export class DAGNodeClass implements DAGNode {
  id: string;
  name: string;
  action: string;
  params: Params;

  constructor(id: string, name: string, action: string, params: Params) {
    this.id = id;
    this.name = name;
    this.action = action;
    this.params = params;
  }
}

export class DAGEdgeClass implements DAGEdge {
  sourceId: string;
  targetId: string;

  constructor(sourceId: string, targetId: string) {
    this.sourceId = sourceId;
    this.targetId = targetId;
  }
}

export class OptionalDAG {
  readonly nodes?: DAGNode[];
  readonly edges?: DAGEdge[];
  readonly init?: Cond;
  readonly goal?: Cond;

  constructor(nodes?: DAGNode[], edges?: DAGEdge[], init?: Cond, goal?: Cond) {
    this.nodes = nodes;
    this.edges = edges;
    this.init = init;
    this.goal = goal;
  }
}
export default class DAG {
  readonly nodes: DAGNode[];
  readonly edges: DAGEdge[];
  readonly init: Cond;
  readonly goal: Cond;

  constructor(nodes: DAGNode[], edges: DAGEdge[], init: Cond, goal: Cond) {
    this.nodes = nodes;
    this.edges = edges;
    this.init = init;
    this.goal = goal;
  }
}
