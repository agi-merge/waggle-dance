import type { NextRequest } from "next/server";

import { appRouter } from "@acme/api";
import { auth } from "@acme/auth";
import { prisma } from "@acme/db";

/**
 * @api {get} /api/v1/agent/tasks/:taskId/artifacts/:artifactId Get Artifact
 * @apiDescription Download a specified artifact.
 * @apiName Download Agent Task Artifact
 * @param {string} task_id
 * @param {string} artifact_id
 */
export async function GET(
  req: NextRequest,
  {
    params: { taskId, artifactId },
  }: { params: { taskId: string; artifactId: string } },
) {
  if (!taskId) {
    return Response.json("task_id is required", { status: 400 });
  }
  if (!artifactId) {
    return Response.json("artifact_id is required", { status: 400 });
  }

  const session = (await auth()) ?? null;
  const caller = appRouter.createCaller({
    session,
    db: prisma,
    origin: req.nextUrl.origin,
  });

  const artifact = await caller.result.byExecutionIdAndArtifactId({
    executionId: taskId,
    artifactId,
  });

  if (artifact?.artifactUrls[0]) {
    return Response.redirect(artifact.artifactUrls[0]);
  }

  return Response.json({ error: "Artifact not found" }, { status: 404 });
}
