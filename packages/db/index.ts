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

export function transformWireFormat(
  newFormat: PlanWireFormat,
): OldPlanWireFormat {
  const oldFormat: OldPlanWireFormat = { nodes: [], edges: [] };
  const previousLevelNodes: DraftExecutionNode[] = [];

  for (const level in newFormat) {
    const nodes = newFormat[level];
    for (const item of nodes ?? []) {
      if ("parents" in item && (item.parents as number[])) {
        const parentIds = item.parents as number[];
        for (const parentId of parentIds) {
          for (const parentNode of previousLevelNodes) {
            if (parentNode.id === parentId.toString()) {
              const newNodeId = `${level}-${parentNode.id}`;
              oldFormat.edges.push({
                sId: `${level}-${parentId}`,
                tId: newNodeId,
              });
            }
          }
        }
      } else {
        const node = item as unknown as DraftExecutionNode; // ok due to logic above
        const newNodeId = `${level}-${node.id}`;
        oldFormat.nodes.push({
          id: newNodeId,
          name: node.name,
          context: node.context,
        });
        previousLevelNodes.push(node);
      }
    }
  }

  return oldFormat;
}
