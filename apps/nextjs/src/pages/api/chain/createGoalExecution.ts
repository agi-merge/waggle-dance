import { prisma } from "@acme/db";
import { getServerSession } from "@acme/auth";
import { appRouter } from "@acme/api";
import { type NextApiResponse, type NextApiRequest } from "next";
import { type StrategyRequestBody } from "./types";

export const config = { runtime: "nodejs", regions: ["pdx-1"] } // TODO: figure out a way to make this use process.env.POSTGRES_REGION

// since PrismaClient is not accessible in edge, and plans save Executions to the database,
// we use this nodejs proxy that is co-located in the same region as the database
export default async function createExecution(req: NextApiRequest, res: NextApiResponse) {

  const session = await getServerSession({ req, res });

  const {
    goalId,
  } = req.body as StrategyRequestBody;

  const caller = appRouter.createCaller({ session, prisma });
  const createExecutionPromise = caller.goal.createExecution({ goalId })
  const exe = await createExecutionPromise;
  res.writeHead(200);
  res.end(res.json(exe));
}