// api/agent/result.ts

import { type NextApiRequest, type NextApiResponse } from "next";

import { appRouter } from "@acme/api";
import { getServerSession, type Session } from "@acme/auth";
import { prisma, type ExecutionState, type Result } from "@acme/db";

import type DAG from "~/features/WaggleDance/DAG";

export const config = {
  runtime: "nodejs",
  regions: [process.env.DATA_PROXY_REGION || "pdx-1"],
};

export type CreateResultParams = {
  goalId: string;
  executionId: string;
  exeResult: string;
  dag: DAG;
  state: ExecutionState | undefined;
  session?: Session | null;
};

// data proxy for edge
export default async function createResultProxy(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  try {
    const session = await getServerSession({ req, res });

    const params = req.body as CreateResultParams;
    params["session"] = session;

    const result = await createResult(params);
    res.status(200).json(result);
  } catch (error) {
    console.error("createGoalExecution error", error);
    res.status(500).json({ error: (error as { message: string }).message });
  }
}

async function createResult({
  goalId,
  executionId,
  exeResult,
  dag,
  state,
  session,
}: CreateResultParams): Promise<Result> {
  if (session?.user.id) {
    const caller = appRouter.createCaller({ session, prisma });
    const createResultOptions = {
      goalId,
      executionId,
      value: exeResult,
      graph: dag,
      state,
    };
    const createResult = await caller.result.create(createResultOptions);
    console.log("createResult", createResult);
    return createResult;
  } else {
    throw new Error("no user id");
  }
}
