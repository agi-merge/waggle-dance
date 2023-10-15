import Base64 from "crypto-js/enc-base64";
import sha256 from "crypto-js/sha256";

import { type DraftExecutionNode } from "@acme/db";

export function saltAndHash(str: string): string {
  if (!process.env.VECTOR_NAMESPACE_SALT) {
    throw new Error("VECTOR_NAMESPACE_SALT is required.");
  }
  const hash = sha256(str + process.env.VECTOR_NAMESPACE_SALT);
  return hash.toString(Base64);
}

export function createUserNamespace(userId: string) {
  return saltAndHash(userId);
}

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

  const namespace = saltAndHash(`${goalId}_${executionId}`);
  console.debug("namespace", namespace);
  return namespace;
}

// it is okay for the taskId to not be encrypted, as the other portion is.
export function createChatNamespace(namespace: string, taskId: string) {
  return `${namespace}_chat_history_${taskId}`;
}
