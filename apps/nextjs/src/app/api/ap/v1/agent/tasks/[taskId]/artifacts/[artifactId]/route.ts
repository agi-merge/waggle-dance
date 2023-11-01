import { type NextRequest } from "next/server";
import { getServerSession } from "next-auth";

import { appRouter } from "@acme/api";
import { authOptions } from "@acme/auth";
import { prisma } from "@acme/db";

/**
 * @api {get} /api/v1/agent/tasks/:taskId/artifacts/:artifactId Get Artifact
 * @apiDescription Download a specified artifact.
 * @apiName Download Agent Task Artifact
 * @param {string} task_id
 * @param {string} artifact_id
 */
export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams;
  const taskId = query.get("task_id");
  const artifactId = query.get("artifact_id");
  if (!taskId) {
    return Response.json("task_id is required", { status: 400 });
  }
  if (!artifactId) {
    return Response.json("artifact_id is required", { status: 400 });
  }

  const session = (await getServerSession(authOptions)) || null;
  const caller = appRouter.createCaller({
    session,
    prisma,
    origin: req.nextUrl.origin,
  });

  const artifact = await caller.result.byGoalAndArtifactId({
    taskId,
    artifactId,
  });

  return Response.redirect(artifact!.id);
}
