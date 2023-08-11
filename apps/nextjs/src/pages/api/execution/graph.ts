// api/agent/result.ts

import { type NextApiRequest, type NextApiResponse } from "next";

import { appRouter } from "@acme/api";
import { getServerSession, type Session } from "@acme/auth";
import { prisma, type Execution } from "@acme/db";

import type DAG from "~/features/WaggleDance/DAG";

export const config = {
  runtime: "nodejs",
};

export type UpdateGraphParams = {
  goalId: string;
  executionId: string;
  dag: DAG;
  session?: Session | null;
};

// data proxy for edge
export default async function updateGraphProxy(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  try {
    const session = await getServerSession({ req, res });

    const params = req.body as UpdateGraphParams;
    params["session"] = session;

    const result = await updateGraph(params);
    res.status(200).json(result);
  } catch (error) {
    console.error("createGoalExecution error", error);
    res.status(500).json({ error: (error as { message: string }).message });
  }
}

async function updateGraph({
  executionId,
  dag,
  session,
}: UpdateGraphParams): Promise<Execution> {
  if (session?.user.id) {
    const caller = appRouter.createCaller({ session, prisma });
    const updateGraphOptions = {
      executionId,
      graph: dag,
    };
    const updated = await caller.execution.updateGraph(updateGraphOptions);
    console.debug("updated exe graph", updated);
    return updated;
  } else {
    throw new Error("no user id");
  }
}
