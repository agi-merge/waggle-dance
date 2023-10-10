import { type DraftExecutionNode } from "@acme/db";

import { sha256ify } from "../prompts/utils/sha256";

// in order to help unauthorized lookup of data, we use an encrypted combination of goal+execution id as a namespace
export default function createNamespace(
  goalId: string | undefined,
  executionId: string | undefined,
  task: DraftExecutionNode,
) {
  // Check if both goalId and executionId are undefined
  if (!goalId && !executionId) {
    if (!task || !task.id) {
      throw new Error(
        "Invalid arguments: Either goalId and executionId, or a task with an id must be provided.",
      );
    }
    return task.id;
  }

  // Check if either goalId or executionId is undefined
  if (!goalId || !executionId) {
    throw new Error(
      "Invalid arguments: Both goalId and executionId must be provided.",
    );
  }

  const namespace = sha256ify(`${goalId}_${executionId}`);
  console.debug("namespace", namespace);
  return namespace;
}

// it is okay for the taskId to not be encrypted, as the other portion is.
export function createChatNamespace(namespace: string, taskId: string) {
  return `${namespace}_chat_history_${taskId}`;
}
