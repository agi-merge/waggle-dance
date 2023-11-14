import { rootPlanId } from "./initialNodes";

export function isServerId(id: string): boolean {
  return id !== rootPlanId && id.includes(".");
}

export function makeServerIdIfNeeded(
  id: string,
  executionId: string | undefined,
): string {
  if (!executionId) {
    return id;
  }
  return isServerId(id) ? id : `${executionId}.${id}`;
}
