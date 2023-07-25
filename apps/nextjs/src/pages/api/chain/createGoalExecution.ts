import { type NextApiRequest, type NextApiResponse } from "next";

import { appRouter } from "@acme/api";
import { getServerSession } from "@acme/auth";
import { prisma } from "@acme/db";

import { type ExecuteRequestBody } from "./types";

export const config = { runtime: "nodejs", regions: ["pdx-1"] }; // TODO: figure out a way to make this use process.env

// since PrismaClient is not accessible in edge, and plans save Executions to the database,
// we use this nodejs proxy that is co-located in the same region as the database
export default async function createGoalExecution(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  try {
    const session = await getServerSession({ req, res });

    if (!session?.user.id) {
      throw new Error("no user id");
    }
    const { goalId } = req.body as ExecuteRequestBody;

    const caller = appRouter.createCaller({ session, prisma });
    const exe = await caller.goal.createExecution({ goalId });
    res.status(200).json(exe);
  } catch (error) {
    console.error("createGoalExecution error", error);
    res.status(500).json({ error: (error as { message: string }).message });
  }
}
