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
  "id" | "updatedAt" | "createdAt" | "nodes" | "edges"
> & { nodes: DraftExecutionNode[]; edges: DraftExecutionEdge[] };

export type DraftExecutionNode = Omit<ExecutionNode, "graphId"> & {
  graphId?: string | null;
};
export type DraftExecutionEdge = Omit<ExecutionEdge, "id" | "graphId"> & {
  id?: string | null;
  graphId?: string | null;
};
