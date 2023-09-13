// TODO: stop using this and use an alias of an Omit/Pick of ExecuteNode instead
export interface DAGNode {
  id: string;
  name: string;
  context: string;
}

export function isServerId(id: string): boolean {
  return id.includes(".");
}

export function makeServerIdIfNeeded(id: string, executionId: string): string {
  return isServerId(id) ? id : `${executionId}.${id}`;
}
