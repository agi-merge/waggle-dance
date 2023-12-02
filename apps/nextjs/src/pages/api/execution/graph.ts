// api/agent/result.ts

import type { NextApiRequest, NextApiResponse } from "next";

import type { OldPlanWireFormat } from "@acme/agent";
import { appRouter } from "@acme/api";
import type { Session } from "@acme/auth";
import { auth } from "@acme/auth";
import type { Execution, ExecutionGraph } from "@acme/db";
import { ExecutionState, prisma } from "@acme/db";

export const config = {
  runtime: "nodejs",
};

export interface UpdateGraphParams {
  goalId: string;
  executionId: string;
  graph: OldPlanWireFormat | null;
  goalPrompt: string;
  session?: Session | null;
  origin?: string | undefined;
}

// data proxy for edge
export default async function updateGraphProxy(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  try {
    const session = await auth(req, res);

    const { json: params } = req.body as { json: UpdateGraphParams };
    params.session = session;
    params.origin = req.headers.origin;

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
  goalPrompt,
  session,
  origin,
}: UpdateGraphParams): Promise<ExecutionGraph | Execution> {
  const caller = appRouter.createCaller({
    session: session ?? null,
    db: prisma,
    origin,
  });
  if (graph == null) {
    const updated = await caller.execution.updateState({
      state: ExecutionState.ERROR,
      executionId,
    });
    console.warn("updated exe state to error", updated);
    return updated;
  } else {
    if (graph.nodes.length < 1) {
      throw new Error("no nodes planned");
    }
    const updated = await caller.execution.updateGraph({
      executionId,
      graph,
      goalPrompt,
    });
    console.debug("updated exe graph", updated);
    return updated;
  }
}
