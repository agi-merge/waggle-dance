// conversions.ts

import type DAG from "../DAG";
import {
  type GraphData,
  type LinkObject,
  type NodeObject,
} from "../components/ForceGraph";

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
  const nodes = dag.nodes.map((node) => {
    console.log("node.id", node.name);
    return {
      id: node.id,
      name: node.name,
      action: node.action,
      params: node.params,
    };
  });

  // Create a lookup object for finding NodeObject by id
  const nodeLookup: { [id: string]: NodeObject } = nodes.reduce(
    (lookup: { [id: string]: NodeObject }, node) => {
      if (node.id !== undefined) {
        lookup[node.id] = node;
      }
      return lookup;
    },
    {},
  );

  const links: LinkObject[] = dag.edges.map((edge) => ({
    source: nodeLookup[edge.sourceId],
    target: nodeLookup[edge.targetId],
  }));

  return { nodes, links };
}
