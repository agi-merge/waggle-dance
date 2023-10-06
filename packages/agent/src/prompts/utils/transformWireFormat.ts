// advantages:
// getting the edges inline with the nodes because it allows for optimistic execution of tasks
// as well as reducing the total token count
// tradeoffs:

import {
  type DraftExecutionEdge,
  type DraftExecutionGraph,
  type DraftExecutionNode,
} from "@acme/db";

import { makeServerIdIfNeeded, rootPlanId, rootPlanNode } from "../../..";
import { criticismSuffix } from "../types";

type ParentsDescriptor = {
  parents: number[];
};

export type PlanWireFormat = {
  [key: string]: (ParentsDescriptor | DraftExecutionNode)[];
};

export type OldPlanWireFormat = {
  nodes: DraftExecutionNode[];
  edges: DraftExecutionEdge[];
};

/**
 * This is called in order to hook nodes from levels with no dependencies up to the plan node.
 * By doing so, we make the DAG
 *
 * This is an optimization. We could have the planning agent send the data
 */
function edgesToHookupToRootNode(
  graph: DraftExecutionGraph,
  rootPlanId: string,
  executionId?: string,
) {
  const targetEdgesMap: Record<string, DraftExecutionEdge> = graph.edges.reduce(
    (acc: Record<string, DraftExecutionEdge>, edge) => {
      edge.sId = makeServerIdIfNeeded(edge.sId, executionId);
      edge.tId = makeServerIdIfNeeded(edge.tId, executionId);
      acc[edge.tId] = edge;
      return acc;
    },
    {} as Record<string, DraftExecutionEdge>,
  );

  return graph.edges.filter(
    (node) => node.id !== rootPlanId && node.id && !targetEdgesMap[node.id],
  );
}

export const hookRootUpToServerGraph = (
  graph: DraftExecutionGraph,
  rootPlanId: string,
  goalPrompt: string,
  executionId?: string,
) => {
  let root = graph.nodes.find((node) => node.id.endsWith(rootPlanId)); // brittle; depends on formulation of server ids
  if (!!root) {
    return graph;
  }
  // add packets representing the graph state to the root node
  root = rootPlanNode(goalPrompt);
  const hookupEdges = edgesToHookupToRootNode(graph, rootPlanId, executionId);
  const graphWithRoot = {
    ...graph,
    nodes: [root, ...graph.nodes],
    edges: [...graph.edges, ...hookupEdges],
    executionId: executionId ?? graph.executionId,
  };
  return graphWithRoot;
};

/**
 * Transforms a partial streaming plan from the new format to the old format.
 *
 * The new format is a dictionary where each key is a level number and the value is an array of nodes and parents.
 * Each node is an object with an id, name, and context. The parents are represented as an array of level numbers.
 *
 * The old format is an object with two properties: nodes and edges.
 * Nodes is an array of all nodes, each represented as an object with an id, name, and context.
 * Edges is an array of all edges, each represented as an object with a sId (source node id) and tId (target node id).
 *
 * The function also handles the special case of the criticism node (id 'c'), which all other nodes in the same level have edges targeting.
 *
 * @param newFormat - The plan in the new format.
 * @returns - The plan in the old format.
 */
export function transformWireFormat(
  newFormat: PlanWireFormat,
  goalPrompt: string,
  executionId: string,
): OldPlanWireFormat {
  const oldFormat: OldPlanWireFormat = {
    nodes: [rootPlanNode(goalPrompt)],
    edges: [],
  };
  const allNodes: { [key: string]: DraftExecutionNode } = {};

  // Populate allNodes with initial nodes
  oldFormat.nodes.forEach((node) => {
    allNodes[node.id] = node;
  });

  for (const level in newFormat) {
    const nodesAndParents = newFormat[level];
    if (nodesAndParents) {
      const currentLevelNodes: DraftExecutionNode[] = [];

      // Separate nodes and parents
      const nodes = nodesAndParents.filter(
        (item) =>
          "id" in item &&
          item.id.length > 0 &&
          item.name.length > 0 &&
          item.context.length > 0,
      ) as unknown as DraftExecutionNode[];
      const parentsDescriptor = (nodesAndParents.find(
        (item) => "parents" in item,
      ) ?? { parents: [] }) as ParentsDescriptor;

      for (const node of nodes) {
        const newNodeId = `${level}-${node.id}`;
        oldFormat.nodes.push({
          id: newNodeId,
          name: node.name,
          context: node.context,
        });
        currentLevelNodes.push(node);
        allNodes[newNodeId] = node;

        // If the node is not a criticism node and it has no parents, create an edge from the root
        if (
          node.id !== criticismSuffix &&
          parentsDescriptor.parents.length === 0
        ) {
          oldFormat.edges.push({
            sId: rootPlanId,
            tId: newNodeId,
          });
        }

        // If the node has parents, create an edge from each parent's criticism node to the current node
        if (parentsDescriptor.parents.length > 0) {
          for (const parentLevel of parentsDescriptor.parents) {
            oldFormat.edges.push({
              sId: `${parentLevel}-${criticismSuffix}`,
              tId: newNodeId,
            });
          }
        }

        // If the node is not a criticism node, create an edge from the node to the criticism node of the same level
        if (node.id !== criticismSuffix) {
          oldFormat.edges.push({
            sId: newNodeId,
            tId: `${level}-${criticismSuffix}`,
          });
        }
      }
    }
  }

  const nodes: DraftExecutionNode[] = oldFormat.nodes.map((n) => ({
    id: n.id,
    name: n.name,
    context: n.context,
    graphId: n.graphId || null,
  }));
  const edges: DraftExecutionEdge[] = oldFormat.edges
    .filter((e) => e.sId.length >= 3 && e.tId.length >= 3)
    .map((e) => ({
      id: e.id || null,
      sId: e.sId,
      tId: e.tId,
      graphId: e.graphId || null,
    }));

  const mappedOldFormat: DraftExecutionGraph = {
    executionId,
    nodes,
    edges,
  };

  return mappedOldFormat;
}

// Jest test case
// describe("transformWireFormat", () => {
//   it("handles multiple concurrent levels correctly", () => {
//     const newFormat = {
//       "1": [
//         {
//           id: "0",
//           name: "📚 Research AgentGPT",
//           context:
//             "Gather information about AgentGPT, its features, capabilities, and limitations",
//         },
//         {
//           id: "c",
//           name: "🔍 Review the research findings",
//           context:
//             "Review the gathered information about the projects and identify key similarities and differences",
//         },
//       ],
//       "2": [
//         {
//           id: "0",
//           name: "📚 Research AutoGPT",
//           context:
//             "Gather information about AutoGPT, its features, capabilities, and limitations",
//         },
//         {
//           id: "c",
//           name: "🔍 Review the research findings",
//           context:
//             "Review the gathered information about the projects and identify key similarities and differences",
//         },
//       ],
//       "3": [
//         {
//           parents: [1, 2],
//         },
//         {
//           id: "0",
//           name: "📝 Create report outline",
//           context:
//             "Create an outline for the report, including sections for each project and their comparisons",
//         },
//         {
//           id: "c",
//           name: "🔍 Review the sections",
//           context:
//             "Review the sections for accuracy, clarity, and completeness",
//         },
//       ],
//     };

//     const expectedOldFormat = {
//       nodes: [
//         {
//           id: "1-0",
//           name: "📚 Research AgentGPT",
//           context:
//             "Gather information about AgentGPT, its features, capabilities, and limitations",
//         },
//         {
//           id: "1-c",
//           name: "🔍 Review the research findings",
//           context:
//             "Review the gathered information about the projects and identify key similarities and differences",
//         },
//         {
//           id: "2-0",
//           name: "📚 Research AutoGPT",
//           context:
//             "Gather information about AutoGPT, its features, capabilities, and limitations",
//         },
//         {
//           id: "2-c",
//           name: "🔍 Review the research findings",
//           context:
//             "Review the gathered information about the projects and identify key similarities and differences",
//         },
//         {
//           id: "3-0",
//           name: "📝 Create report outline",
//           context:
//             "Create an outline for the report, including sections for each project and their comparisons",
//         },
//         {
//           id: "3-c",
//           name: "🔍 Review the sections",
//           context:
//             "Review the sections for accuracy, clarity, and completeness",
//         },
//       ],
//       edges: [
//         {
//           sId: "1-0",
//           tId: "1-c",
//         },
//         {
//           sId: "2-0",
//           tId: "2-c",
//         },
//         {
//           sId: "1-c",
//           tId: "3-0",
//         },
//         {
//           sId: "2-c",
//           tId: "3-0",
//         },
//         {
//           sId: "3-0",
//           tId: "3-c",
//         },
//       ],
//     };

//     expect(transformWireFormat(newFormat)).toEqual(expectedOldFormat);
//   });
// });
