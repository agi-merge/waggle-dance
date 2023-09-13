import { rootPlanId } from "./initialNodes";

export function isServerId(id: string): boolean {
  return id !== rootPlanId && id.includes(".");
}

export function makeServerIdIfNeeded(id: string, executionId: string): string {
  return isServerId(id) ? id : `${executionId}.${id}`;
}
