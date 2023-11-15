import { z } from "zod";

import { makeServerIdIfNeeded } from "../..";
import DynamicZodSkill from "./DynamicZodSkill";

const schema = z.object({
  executionId: z
    .string()
    .cuid()
    .describe(
      "The task execution id to securely download from. You must pass the system EXECUTION ID variable as the executionId.",
    ),
  taskId: z
    .string()
    .describe(
      "The task to associate the file with. You must pass the system TASK ID.",
    ),
  artifactId: z
    .string()
    .describe(
      "The artifact id of the file to download. You must pass the system ARTIFACT ID.",
    ),
  namespace: z
    .string()
    .min(1)
    .describe(
      "A verification token. You must pass the system NAMESPACE variable as the namespace.",
    ),
});

const downloadFileSkill = new DynamicZodSkill({
  name: "Download File",
  description: `Read/Download private files from your cloud filesystem.`,
  func: async (input, _runManager) => {
    const { executionId, taskId, artifactId, namespace } = schema.parse(input);
    const nodeId = makeServerIdIfNeeded(taskId, executionId);
    console.debug("downloadFileSkill", executionId, nodeId, artifactId);
    const response = await fetch(
      `${process.env.NEXTAUTH_URL}/api/ap/v1/agent/tasks/${executionId}/artifacts/${artifactId}`,
      {
        method: "GET",
        headers: {
          "X-Skill-Namespace": namespace,
          "X-Skill-Node-Id": nodeId,
        },
      },
    );
    if (response.ok) {
      const artifact = await response.blob();
      return artifact
        ? URL.createObjectURL(artifact)
        : "Error: unexpected return value";
    } else {
      return `Error: ${response.status} ${response.statusText}`;
    }
  },
  schema,
});

export default downloadFileSkill;
