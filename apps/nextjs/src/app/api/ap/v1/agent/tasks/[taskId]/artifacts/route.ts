import { type Readable } from "stream";
import { NextResponse, type NextRequest } from "next/server";
import { put } from "@vercel/blob";
import { type Artifact } from "lib/AgentProtocol/types";
import { customAlphabet } from "nanoid";
import { getServerSession } from "next-auth";

import { appRouter } from "@acme/api";
import { authOptions } from "@acme/auth";
import { prisma } from "@acme/db";

//
// List all artifacts that have been created for the given task.

/**
 * @name List Agent Task Artifacts
 * @description Execute a step in the specified agent task.
 * @param task_id string
 * @param current_page number
 * @param page_size number
 * @returns Promise<Artifact[]>
 */
export async function GET(
  req: NextRequest,
  { params: { taskId } }: { params: { taskId: string } },
) {
  if (!taskId) {
    return NextResponse.json("taskId in path is required", { status: 404 });
  }
  const params = req.nextUrl.searchParams;
  const pageSize = Number(params.get("page_size") ?? 10);
  const currentPage = Number(params.get("current_page") ?? 1);

  const session = (await getServerSession(authOptions)) || null;
  const caller = appRouter.createCaller({
    session,
    prisma,
    origin: req.nextUrl.origin,
  });

  const result = await caller.result.byExecutionId({
    executionId: taskId,
    currentPage: currentPage,
    pageSize,
  });

  if (!result) {
    return NextResponse.json("Artifact not found", { status: 404 });
  }

  // Redirect to the blob URL
  // return NextResponse.redirect(artifact.blobUrl);

  return NextResponse.json(result, { status: 200 });
}

const nanoid = customAlphabet(
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
  7,
); // 7-character random string

/**
 *
 * @param task_id string
 * @param relative_path string
 * @returns
 */
export async function POST(
  req: NextRequest,
  { params: { taskId } }: { params: { taskId: string } },
) {
  if (!taskId) {
    return Response.json("taskId in path is required", { status: 400 });
  }

  const contentType = req.headers.get("content-type") || "";
  const file = await req.blob();

  const response = await uploadAndSaveResult({
    contentType,
    file,
    taskId,
    origin: req.nextUrl.origin,
  });

  return NextResponse.json(response, { status: 201 });
}

type UploadFileParams = {
  contentType: string;
  file:
    | string
    | Readable
    | Blob
    | ArrayBuffer
    | FormData
    | ReadableStream<any>
    | File;
};

export async function uploadFile({ contentType, file }: UploadFileParams) {
  const artifactId = nanoid();
  const filename = `${artifactId}.${contentType.split("/")[1]}`;

  const blob = await put(filename, file, {
    contentType,
    access: "public",
    addRandomSuffix: true,
  });

  return {
    artifactId: artifactId,
    blobUrl: blob.url,
  };
}

type UploadAndSaveResultParams = UploadFileParams & {
  origin: string;
  taskId: string;
};
export async function uploadAndSaveResult({
  origin,
  taskId,
  ...uploadFileParams
}: UploadAndSaveResultParams): Promise<Artifact> {
  const { artifactId, blobUrl } = await uploadFile(uploadFileParams);

  const session = (await getServerSession(authOptions)) || null;
  const caller = appRouter.createCaller({
    session,
    prisma,
    origin,
  });

  const result = await caller.result.upsertAppendArtifactUrl({
    executionId: taskId,
    resultId: undefined,
    artifactUrl: blobUrl,
  });

  return {
    artifact_id: result.id,
    file_name: result.artifactUrls[0] || "error",
    agent_created: true,
    relative_path: null,
    created_at: result.createdAt.toISOString(),
  };
}
