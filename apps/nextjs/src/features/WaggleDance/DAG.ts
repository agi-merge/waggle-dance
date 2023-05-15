export type Params = { [key: string]: string };
export type InitCond = { predicate: string; params: Params };
export type GoalCond = { predicate: string; params: Params };
export type Node = { id: string; type: string; params: Params };
export type Edge = { source: string; target: string };

export interface DAGJson {
  nodes: Node[];
  edges: Edge[];
  init: InitCond[];
  goal: GoalCond[];
}

export default class DAG {
  private nodes: Node[];
  private edges: Edge[];
  private init: InitCond[];
  private goal: GoalCond[];

  constructor(dagJson: DAGJson) {
    this.nodes = dagJson.nodes;
    this.edges = dagJson.edges;
    this.init = dagJson.init;
    this.goal = dagJson.goal;
  }

  getNodes(): Node[] {
    return this.nodes;
  }

  getEdges(): Edge[] {
    return this.edges;
  }

  getInitConditions(): InitCond[] {
    return this.init;
  }

  getGoalConditions(): GoalCond[] {
    return this.goal;
  }

  // Additional methods for handling the DAG can be implemented here.
}
