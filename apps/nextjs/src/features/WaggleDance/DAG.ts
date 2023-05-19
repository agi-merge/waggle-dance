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
  act: string;
  params: Params;
}
export interface DAGEdge {
  sId: string;
  tId: string;
}
export class DAGNodeClass implements DAGNode {
  id: string;
  name: string;
  act: string;
  params: Params;

  constructor(id: string, name: string, act: string, params: Params) {
    this.id = id;
    this.name = name;
    this.act = act;
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
