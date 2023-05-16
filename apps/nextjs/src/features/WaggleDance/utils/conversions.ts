// conversions.ts

import type DAG from "../DAG";
import {
  type LinkObject,
  type NodeObject,
} from "../components/NoSSRForceGraph";
import { type GraphData } from "../types";

// export function planResultToDAG({ domain, problem }: PlanResult): DAG {
//   const nodes: DAGNode[] = [];
//   const edges: DAGEdgeClass[] = [];
//   const init: InitCondClass[] = problem.init.map(
//     (initStr) => new InitCondClass(initStr, {}),
//   );
//   const goal: GoalCondClass[] = [new GoalCondClass(problem.goal, {})];

//   // Generate nodes from domain actions
//   domain.actions.forEach((action) => {
//     action.parameters.forEach((parameter, index) => {
//       nodes.push(new DAGNodeClass(parameter.name, action.name, {}));
//       if (index > 0 && action.parameters[index - 1]) {
//         edges.push(
//           new DAGEdgeClass(
//             action.parameters[index - 1]?.name ?? "error",
//             parameter.name,
//           ),
//         );
//       }
//     });
//   });

//   return new DAG(nodes, edges, init, goal);
// }

export function dagToGraphData(dag: DAG): GraphData {
  const nodes: NodeObject[] = dag.nodes.map((node) => ({
    id: node.id,
  }));

  const links: LinkObject[] = dag.edges.map((edge) => ({
    source: edge.source,
    target: edge.target,
  }));

  return { nodes, links };
}
