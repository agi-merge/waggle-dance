// TODO: stop using this and use an alias of an Omit/Pick of ExecuteNode instead
export interface DAGNode {
  id: string;
  name: string;
  context: string;
}
