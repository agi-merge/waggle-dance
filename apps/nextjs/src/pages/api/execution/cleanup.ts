// api/execution/cleanup.ts
import { type NextApiRequest, type NextApiResponse } from "next";

import { ExecutionState, prisma } from "@acme/db";

const MAX_EXECUTION_TIME = 1000 * 60 * 5; // 5 minutes, adjust as needed

export default async function cleanupExecutions(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const now = Date.now();
  const executions = await prisma.execution.findMany({
    where: {
      state: ExecutionState.EXECUTING,
      updatedAt: {
        lt: new Date(now - MAX_EXECUTION_TIME),
      },
    },
  });

  const updatePromises = executions.map((execution) =>
    prisma.execution.updateMany({
      where: { id: execution.id },
      data: { state: ExecutionState.ERROR },
    }),
  );

  await Promise.all(updatePromises);

  res.status(200).json({ updated: updatePromises.length });
}
