// api/agent/result.ts

import { type NextApiRequest, type NextApiResponse } from "next";

import { type AgentPacket } from "@acme/agent";
import { appRouter } from "@acme/api";
import { getServerSession, type Session } from "@acme/auth";
import { prisma, type ExecutionState, type Result } from "@acme/db";

export const config = {
  runtime: "nodejs",
};

export type CreateResultParams = {
  goalId: string;
  nodeId: string;
  executionId: string;
  packet: AgentPacket;
  packets: AgentPacket[];
  state: ExecutionState;
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
    console.error("createResult error", error);
    res.status(500).json({ error: (error as { message: string }).message });
  }
}

async function createResult(
  createResultOptions: CreateResultParams,
): Promise<Result> {
  const { session } = createResultOptions;
  if (session?.user.id) {
    const caller = appRouter.createCaller({ session, prisma });

    // goalId: z.string().nonempty(),
    // executionId: z.string().cuid(),
    // nodeId: z.string().cuid(),
    // packets: z.array(z.any()),
    // state: z.nativeEnum(ExecutionState),
    const createResult = await caller.result.create(createResultOptions);
    console.debug("createResult", createResult);
    return createResult;
  } else {
    throw new Error("no user id");
  }
}
