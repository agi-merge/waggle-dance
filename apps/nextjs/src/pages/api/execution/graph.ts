// api/agent/result.ts

import { type NextApiRequest, type NextApiResponse } from "next";

import { appRouter } from "@acme/api";
import { getServerSession, type Session } from "@acme/auth";
import { ExecutionState, prisma, type Execution } from "@acme/db";

export const config = {
  runtime: "nodejs",
};

export type UpdateGraphParams = {
  goalId: string;
  executionId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  graph: { nodes: any[]; edges: any[] } | null;
  session?: Session | null;
};

// data proxy for edge
export default async function updateGraphProxy(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  try {
    const session = await getServerSession({ req, res });

    const { json: params } = req.body as { json: UpdateGraphParams };
    params["session"] = session;

    const result = await updateGraph(params);
    res.status(200).json(result);
  } catch (error) {
    console.error("updateGraph error", error);
    res.status(500).json({ error: (error as { message: string }).message });
  }
}

async function updateGraph({
  executionId,
  graph,
  session,
}: UpdateGraphParams): Promise<
  | Execution
  | [
      {
        id: string;
        executionId: string;
        createdAt: Date;
        updatedAt: Date;
      },
      {
        id: string;
        goalId: string;
        userId: string;
        state: ExecutionState;
        createdAt: Date;
        updatedAt: Date;
      },
    ]
> {
  if (session?.user.id) {
    const caller = appRouter.createCaller({ session, prisma });
    if (graph == null) {
      const updated = await caller.execution.updateState({
        state: ExecutionState.ERROR,
        executionId,
      });
      console.warn("updated exe state to error", updated);
      return updated;
    } else {
      const updated = await caller.execution.updateGraph({
        executionId,
        graph,
      });
      console.debug("updated exe graph", updated);
      return updated;
    }
  } else {
    throw new Error("no user id");
  }
}
