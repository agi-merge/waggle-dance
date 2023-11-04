import Base64 from "crypto-js/enc-base64";
import { z } from "zod";

import DynamicZodSkill from "./DynamicZodSkill";

const schema = z.object({
  file: z.object({
    textOrBase64: z
      .string()
      .min(1)
      .describe("Non-placeholder plain text content of the file.")
      .or(
        z
          .string()
          .refine((c) => Base64.parse(c).words.length > 0)
          .describe("base64 encoded content of the file."),
      ),
    mimeType: z
      .string()
      .regex(/^[a-z]+\/[a-z]+$/i)
      .min(1)
      .describe("The RFC 2077 MIME type of the file."),
    // encoding: z.enum(["utf-8", "base64"]).optional().default("utf-8"),
  }),
  executionId: z
    .string()
    .cuid()
    .describe(
      "The task execution id to securely upload to. You must pass the system EXECUTION ID variable as the executionId.",
    ),
  taskId: z
    .string()
    .describe(
      "The task to associate the file with. You must pass the system TASK ID.",
    ),
  // FIXME: real auth
  //  namespace is not strongly encrypted, and is also sent to e.g. langsmith
  namespace: z
    .string()
    .min(1)
    .describe(
      "A verification token. You must pass the system NAMESPACE variable as the namespace.",
    ),
});

const uploadFileSkill = new DynamicZodSkill({
  name: "Upload File",
  description: `Write/Upload/Save files.`,
  func: async (input, _runManager) => {
    const {
      file: { textOrBase64, mimeType },
      executionId,
      taskId,
      namespace,
    } = schema.parse(input);
    console.debug(
      "uploadFileSkill",
      textOrBase64,
      mimeType,
      executionId,
      taskId,
    );
    const fileBlob = new Blob([textOrBase64], { type: mimeType });
    const response = await fetch(
      `${process.env.NEXTAUTH_URL}/api/ap/v1/agent/tasks/${executionId}/artifacts`,
      {
        method: "POST",
        body: fileBlob,
        headers: {
          "X-Skill-Namespace": namespace,
          "X-Skill-Task-Id": taskId,
          "Content-Type": mimeType,
          // "X-File-Encoding": encoding,
        },
      },
    );
    if (response.ok) {
      const artifact = (await response.json()) as {
        artifact_id: string;
        file_name: string;
      };

      return artifact ? artifact.artifact_id : "Error: unexpected return value";
    } else {
      return `Error: ${response.status} ${response.statusText}`;
    }
  },
  schema,
});

export default uploadFileSkill;
