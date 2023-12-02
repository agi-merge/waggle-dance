// api/execution/deleteOld.ts
import type {NextApiRequest, NextApiResponse} from "next";

import { prisma } from "@acme/db";

const MAX_EXECUTION_AGE = 1000 * 60 * 60 * 24 * 30; // 1 month, adjust as needed

export default async function deleteOldExecutions(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const now = Date.now();

  const deleted = await prisma.execution.deleteMany({
    where: {
      updatedAt: {
        lt: new Date(now - MAX_EXECUTION_AGE),
      },
    },
  });

  res.status(200).json({ deleted: deleted.count });
}
