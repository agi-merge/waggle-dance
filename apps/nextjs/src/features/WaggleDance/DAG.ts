// DAG.ts
export interface Context {
  [key: string]: string;
}
export interface Cond {
  predicate: string;
  context: Context;
}

export class CondClass {
  predicate: string;
  context: Context;

  constructor(predicate: string, context: Context) {
    this.predicate = predicate;
    this.context = context;
  }
}

export interface DAGNode {
  id: string;
  name: string;
  act: string;
  context: Context;
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

  constructor(id: string, name: string, act: string, context: Context) {
    this.id = id;
    this.name = name;
    this.act = act;
    this.context = context;
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
  // readonly init?: Cond;
  // readonly goal?: Cond;

  constructor(nodes?: DAGNode[], edges?: DAGEdge[]/*, init?: Cond, goal?: Cond*/) {
    this.nodes = nodes;
    this.edges = edges;
    // this.init = init;
    // this.goal = goal;
  }
}
export default class DAG {
  readonly nodes: DAGNode[];
  readonly edges: DAGEdge[];
  // readonly init: Cond;
  // readonly goal: Cond;

  constructor(nodes: DAGNode[], edges: DAGEdge[]/*, init: Cond, goal: Cond*/) {
    this.nodes = nodes;
    this.edges = edges;
    // this.init = init;
    // this.goal = goal;
  }
}
