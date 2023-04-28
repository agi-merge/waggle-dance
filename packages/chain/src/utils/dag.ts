import { AgentExecutor } from "langchain/agents";

class DAG {
  nodes: DAGNode[];

  constructor() {
    this.nodes = [];
  }

  addNode(agent: AgentExecutor) {
    const node = new DAGNode(agent);
    this.nodes.push(node);
    return node;
  }

  connectNodes(parentNode: DAGNode, childNode: DAGNode) {
    parentNode.children.push(childNode);
    childNode.parents.push(parentNode);
  }
}

class DAGNode {
  agent: AgentExecutor;
  parents: DAGNode[];
  children: DAGNode[];

  constructor(agent: AgentExecutor) {
    this.agent = agent;
    this.parents = [];
    this.children = [];
  }
}
