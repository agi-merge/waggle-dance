import {
  PrismaClient,
  type Execution,
  type ExecutionEdge,
  type ExecutionGraph,
  type ExecutionNode,
  type Goal,
  type Result,
} from "@prisma/client";

export * from "@prisma/client";
export * from "./skills";

// TODO: find better way to share this with skillset trpc router

const globalForPrisma = globalThis as { prisma?: PrismaClient };
export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export type GoalPlusExe = Goal & {
  executions: ExecutionPlusGraph[];
};

export type ExecutionPlusGraph = Execution & {
  graph?: ExecutionGraphPlusNodesAndEdges | null;
  results?: Result[] | null;
};

export type ExecutionGraphPlusNodesAndEdges = ExecutionGraph &
  ExecutionGraphNodesAndEdges;

export type ExecutionGraphNodesAndEdges = {
  nodes: ExecutionNode[];
  edges: ExecutionEdge[];
};

export type DraftExecutionGraph = Omit<
  ExecutionGraphPlusNodesAndEdges,
  "id" | "updatedAt" | "createdAt"
> & { nodes: DraftExecutionNode[]; edges: DraftExecutionEdge[] };

export type DraftExecutionNode = Omit<ExecutionNode, "graphId">;
export type DraftExecutionEdge = Omit<ExecutionEdge, "graphId" | "id">;

// advantages:
// getting the edges inline with the nodes because it allows for optimistic execution of tasks
// as well as reducing the total token count
// tradeoffs:
// less straightforward than other plan DAG formats
export type PlanWireFormat = {
  [key: string]: [({ parents: number[] } | DraftExecutionNode)[]];
};

export type OldPlanWireFormat = {
  nodes: DraftExecutionNode[];
  edges: DraftExecutionEdge[];
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
 * The function also handles the special case of the criticism node (id 'c'), which depends on all other nodes in the same level.
 *
 * @param newFormat - The plan in the new format.
 * @returns - The plan in the old format.
 */
export function transformWireFormat(
  newFormat: PlanWireFormat,
): OldPlanWireFormat {
  const oldFormat: OldPlanWireFormat = { nodes: [], edges: [] };
  const allNodes: { [key: string]: DraftExecutionNode } = {};
  const criticismSuffix = "c";

  for (const level in newFormat) {
    const nodes = newFormat[level];
    const currentLevelNodes: DraftExecutionNode[] = [];
    for (const item of nodes ?? []) {
      if ("parents" in item && (item.parents as number[])) {
        const parentIds = item.parents as number[];
        for (const parentId of parentIds) {
          const parentNode = allNodes[`${parentId}-${criticismSuffix}`];
          if (parentNode) {
            const newNodeId = `${level}-${parentNode.id}`;
            oldFormat.edges.push({
              sId: `${parentId}-${parentNode.id}`,
              tId: newNodeId,
            });
          }
        }
      } else {
        const node = item as unknown as DraftExecutionNode;
        const newNodeId = `${level}-${node.id}`;
        oldFormat.nodes.push({
          id: newNodeId,
          name: node.name,
          context: node.context,
        });
        currentLevelNodes.push(node);
        allNodes[newNodeId] = node;
      }
    }

    const criticismNode = currentLevelNodes.find(
      (node) => node.id === criticismSuffix,
    );
    if (criticismNode) {
      currentLevelNodes.forEach((node) => {
        if (node.id !== criticismSuffix) {
          oldFormat.edges.push({
            sId: `${level}-${node.id}`,
            tId: `${level}-${criticismNode.id}`,
          });
        }
      });
    }
  }

  return oldFormat;
}
