import DAG, {
  DAGEdgeClass,
  DAGNodeClass,
  GoalCondClass,
  InitCondClass,
  type DAGNode,
} from "../DAG";
import {
  type LinkObject,
  type NodeObject,
} from "../components/NoSSRForceGraph";
import { type GraphData, type PDDLDomain, type PDDLProblem } from "../types";

export function planAndDomainToDAG(
  domain: PDDLDomain,
  problem: PDDLProblem,
): DAG {
  debugger;
  const nodes: DAGNode[] = problem.objects.map(
    (obj) => new DAGNodeClass(obj.name, obj.type, {}),
  );
  const edges: DAGEdgeClass[] = []; // We will need to extract edges from the domain actions
  const init: InitCondClass[] = problem.init.map(
    (initStr) => new InitCondClass(initStr, {}),
  );
  const goal: GoalCondClass[] = [new GoalCondClass(problem.goal, {})];

  // Extract edges from domain actions
  domain.actions.forEach((action) => {
    action.parameters.forEach((parameter, index) => {
      if (index > 0 && action.parameters[index - 1]) {
        edges.push(
          new DAGEdgeClass(
            parameter.name,
            action.parameters[index - 1]?.name ?? "",
            action.name,
          ),
        );
      }
    });
  });

  return new DAG(nodes, edges, init, goal);
}

export function dagToGraphData(dag: DAG): GraphData {
  const nodes: NodeObject[] = dag.nodes.map((node) => ({
    id: node.id,
    type: node.type,
  }));

  const links: LinkObject[] = dag.edges.map((edge) => ({
    source: edge.source,
    target: edge.target,
    action: (edge as DAGEdgeClass).action,
  }));

  return { nodes, links };
}
