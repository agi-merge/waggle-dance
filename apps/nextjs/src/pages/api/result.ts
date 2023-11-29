// api/agent/result.ts

import { type NextApiRequest, type NextApiResponse } from "next";

import { appRouter } from "@acme/api";
import { type CreateResultParams } from "@acme/api/src/router/result";
import { auth } from "@acme/auth";
import { prisma, type Execution, type Result } from "@acme/db";

export const config = {
  runtime: "nodejs",
};

// data proxy for edge
export default async function createResultProxy(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  try {
    const session = await auth(req, res);

    const params = req.body as CreateResultParams;
    params["session"] = session;
    params["origin"] = req.headers.origin;

    const result = await createResult(params);
    console.debug("createResult result", result);
    res.status(200).json(result);
  } catch (error) {
    console.error("createResult error", error);
    res.status(500).json({ error: (error as { message: string }).message });
  }
}

async function createResult(
  createResultOptions: CreateResultParams,
): Promise<[Result, Execution]> {
  const { session, origin } = createResultOptions;
  const caller = appRouter.createCaller({
    session: session || null,
    db: prisma,
    origin,
  });
  const createResult = caller.result.create(createResultOptions);
  return createResult;
}
