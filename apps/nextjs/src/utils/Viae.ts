/**
 * A library which executes an DAG of async functions.
 *
 * Async DAG definition
 * =========
 * With respect to data flow, there are two classes of nodes:
 *   - source: yield data
 *   - sink: a function which consumes data
 *
 * An async DAG instance is recursively defined as:
 *   - base case: Value nodes which are source nodes / terminal nodes.
 *     Value nodes do not depend on other nodes. From a functional
 *     programming perspective, Value nodes are treated as data
 *     (rather than computation).
 *   - recursive case: async function nodes which are inner nodes and is
 *     both sink and source. These nodes depend on other node, but can
 *     also be depended on. From a functional programming perspective,
 *     Async Function nodes are treated as data AND computation.
 *
 * Nodes are named and registered using with:
 *   - PromiseGraph#value: any JavaScript value including primitives, objects, even
 *     functions (treated as data)
 *   - PromiseGraph#async: a function which returns a promise. This function
 *     is treated as a computation and applied. Its output is treated as data.
 *
 * Dependencies
 * ==========
 * Source-sink relations, aka dependencies, are encoded in the formal parameters
 * of a function. The argument name must match the name of a node in the graph.
 *
 * The resolved values of a given dependency's promise is dependency injected by
 * the library. See Resolution section.
 *
 * Execution
 * ==========
 * The graph is not traversed until #entryPoint is invoked.
 *
 * A PromiseGraph #entryPoint can be invoked more than once, at which point
 * the registered graph nodes are snapshotted.
 *
 * Resolution / Auto-unboxing of promises
 * ==========
 * Value nodes resolve to their value.
 *
 * Async nodes resolve to the value of the promise its function returns.
 *
 * The library unwraps promises and applies the value of the promise to
 * functions which depend on the aforementioned Async node.
 *
 * Memoization
 * ==========
 * Suppose multiple sink nodes depend on a source node. The library will resolve
 * the value of the source node exactly once.
 *
 * In the case where the source is a value node, it's not a big deal if the node
 * is traversed multiple times. Even if the object is mutated by some outside
 * process, the library resolves the object not a copy, so this is okay too.
 * In the case of functions, resolving the value gets expensive, so the result
 * is memorized. An analogy is a memoized Fibonacci implementation.
 *
 * The memoizing is on a per-execution basis. Each execution starts a clean slate
 * by flushing the cache.
 *
 * Declarative API and order-independence
 * ==========
 * Declaration order of nodes do not matter, other than that
 * all the relevant nodes have been registered by the time of an execution.
 *
 * Moreover, the order in which dependencies are specified should not affect
 * their values. The traversal is DFS, and since nodes may not resolve until
 * other nodes are resolved, the order in which arguments are specified may
 * implicate the resolution order. While this may have performance implications,
 * correctness is utmost. There may be a loss of parallelization, and in a
 * simplified worst-case analysis would be the sum of the time it takes all
 * the async nodes to resolve if they were to be done sequentially.
 *
 * Usage
 * ==========
 * const graph = new Viae();
 * graph.value('age', 1);
 * graph.async('birthday', age => Promise.resolve(age+1));
 * graph.entryPoint((birthday) => {
 *   console.log(birthday);
 * });
 */
enum NodeType {
  Value,
  // Promise produced from Async function. Pending resolution to Value.
  Promise,
  // Denotes the function associated with g#entryPoint. It has similar
  // properties to Async nodes and is treated similarly.
  EntryPoint,
  // Encapsulates async function definition.
  Async,
  // Promise for Async function with resolved values ready for execution.
  PromiseAsyncExecutable,
}
interface ValueNode {
  type: NodeType.Value;
  name: string;
  value: any;
}
interface PromiseNode {
  type: NodeType.Promise;
  name: string;
  value: Promise<any>;
  dependencies: string[];
}
interface AsyncNode {
  type: NodeType.Async;
  name: string;
  value: FunctionAsync;
  dependencies: string[];
}
interface PromiseAsyncExecutableNode {
  type: NodeType.PromiseAsyncExecutable;
  name: string;
  value: FunctionAsync;
  dependencies: string[];
  resolvedValuesPromise: Promise<any[]>;
}
interface EntryPointNode {
  type: NodeType.EntryPoint;
  name: string;
  value: any;
  dependencies: string[];
}
type AsyncDerivativeNode = PromiseNode | AsyncNode | PromiseAsyncExecutableNode;
type UncausedNode = ValueNode;
type CausedNode = AsyncDerivativeNode | EntryPointNode;
type GraphNode = UncausedNode | CausedNode;
type FunctionAsync = (...args: any[]) => Promise<any>;

// Patterns extracted from AngularJS
// https://github.com/angular/angular.js/blob/master/src/auto/injector.js
const ARROW_DECLARATION = /^([^(]+?)=>/;
const FUNCTION_DECLARATION = /^[^(]*\(\s*([^)]*)\)/m;
const STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/gm;
function stringifyFn(fn: Function): string {
  return Function.prototype.toString.call(fn);
}
function extractArgs(fn: Function) {
  const fnText = stringifyFn(fn).replace(STRIP_COMMENTS, "");
  return fnText.match(ARROW_DECLARATION) || fnText.match(FUNCTION_DECLARATION);
}

export class Viae {
  private readonly ROOT_NODE_NAME = "root";
  dependencies: {
    [key: string]: GraphNode;
  } = {};
  private executionId = 0;
  // Isolate data and snapshot definition at each execution.
  executions: {
    // Key is executionId.
    [key: number]: {
      copy: {
        [key: string]: GraphNode;
      };
      cache: {
        [key: string]: GraphNode;
      };
    };
  } = {};
  /**
   * Invokes the given function with values injected for the dependencies.
   * The injected values are the produced values of functional dependencies,
   * and not to be confused as an execution pipeline of specified dependencies.
   **/
  entryPoint(entryPointNode: Function): Promise<any> {
    this.executionId++;
    const nodeName = this.ROOT_NODE_NAME;
    const execution = {
      copy: Object.assign(
        {
          [nodeName]: {
            name: nodeName,
            type: NodeType.EntryPoint,
            value: entryPointNode,
            dependencies: this.extractFunctionArgs(entryPointNode),
          },
        },
        this.dependencies,
      ),
      cache: {},
    };
    this.executions[this.executionId] = execution;
    const ancestors = [];
    return this.resolveDependencies(this.executionId, nodeName, ancestors).then(
      (dependencies) => entryPointNode.apply(entryPointNode, dependencies),
    );
  }
  // Convert Node.Async to NodeType.PromiseAsyncExecutable nodes.
  private makePromiseAsyncExecutable(
    executionId: number,
    name: string,
    ancestors: string[],
  ) {
    const graphNode: GraphNode = this.executions[executionId].copy[name];
    if (graphNode.type == NodeType.Value) {
      throw new Error("Internal error. Did not expect value node.");
    }
    console.log(
      `makePromiseAsyncExecutable: ${name}, graphNode.type: ${JSON.stringify(
        graphNode,
      )}`,
    );
    return graphNode.dependencies.flatMap((nodeName) => {
      const node: GraphNode | undefined =
        this.executions[executionId].copy[nodeName];
      console.log(
        `graphNode.dependencies.map: ${JSON.stringify(
          nodeName,
        )}, node: ${JSON.stringify(node)}}`,
      );

      if (!node) {
        console.error(`Node '${nodeName}' was not found in graph.`);
        // throw new Error(`Node '${nodeName}' was not found in graph.`);
        return null;
      }
      if (node.type == NodeType.Async) {
        const resolvedValuesPromise: Promise<any[]> = this.resolveDependencies(
          executionId,
          node.name,
          ancestors,
        );
        return (this.executions[executionId].copy[nodeName] = {
          type: NodeType.PromiseAsyncExecutable,
          value: node.value,
          resolvedValuesPromise,
          name: nodeName,
          dependencies: node.dependencies,
        });
      }
      return node;
    });
  }
  private resolveDependencies(
    executionId: number,
    name: string,
    ancestors: string[],
  ): Promise<any[]> {
    const graphNode: GraphNode = this.executions[executionId].copy[name];
    if (graphNode.type == NodeType.Value) {
      throw new Error("Internal error. Did not expect value node.");
    }
    // Resolve name of dependencies.
    const formalParameters: string[] = graphNode.dependencies;
    // Checks for a backedge, effectively implements cycle detection.
    for (let i = 0; i < formalParameters.length; i++) {
      const index = ancestors.indexOf(formalParameters[i]);
      if (index >= 0) {
        throw new Error(
          `Node '${name}' depends on '${formalParameters[i]}'` +
            ` which is actually an ancestor: ` +
            `${ancestors.join("->")}->${name}->${formalParameters[i]}`,
        );
      }
    }
    this.makePromiseAsyncExecutable(executionId, name, [...ancestors, name]);
    // Promise to resolve dependencies for Node.PromiseFunctionAsyncExecutable
    const resolvedValuesPromises: Array<Promise<any[]>> = [];
    const promiseAsyncExecutableNodePromises: PromiseAsyncExecutableNode[] = [];
    formalParameters.forEach((name: string) => {
      const node: GraphNode = this.executions[executionId].copy[name];
      if (node.type == NodeType.PromiseAsyncExecutable) {
        resolvedValuesPromises.push(node.resolvedValuesPromise);
        promiseAsyncExecutableNodePromises.push(node);
      }
    });
    return (
      Promise.all(resolvedValuesPromises)
        // Apply executable async node to get Node.Promise.
        .then((resolvedValuesValues: any[][]) => {
          promiseAsyncExecutableNodePromises.forEach((node, i) => {
            // In the time this set of applicable node has being resolved, the
            // particular node may have been resolved by an earlier iteration.
            if (this.executions[executionId].cache[node.name]) {
              return;
            }
            const resolvedValues: any[] = resolvedValuesValues[i];
            // Invoke the function, which produces a Promised value.
            let promiseNodeValue: Promise<any>;
            try {
              promiseNodeValue = node.value.apply(node.value, resolvedValues);
            } catch (e) {
              const reason = `threw error: (${e})`;
              throw this.getNodeError(
                ancestors,
                name,
                node,
                resolvedValues,
                reason,
              );
            }
            if (!promiseNodeValue.catch) {
              console.warn(
                `${node.name} produced (${JSON.stringify(
                  promiseNodeValue,
                )}) which is not a Promise, wrapping in promise.`,
              );
              promiseNodeValue = Promise.resolve(promiseNodeValue);
            }
            promiseNodeValue = promiseNodeValue.catch((e) => {
              const reason = `returned Promise rejected with (${e})`;
              throw this.getNodeError(
                ancestors,
                name,
                node,
                resolvedValues,
                reason,
              );
            });
            this.executions[executionId].copy[node.name] = {
              type: NodeType.Promise,
              value: promiseNodeValue,
              name: node.name,
              dependencies: node.dependencies,
            };
          });
        })
        // Reduce Node.Promise nodes to Node.Value.
        .then(() => {
          // Promises for upstream Node.Promise
          const promiseNodePromises: Array<Promise<PromiseNode>> = [],
            promiseNodeNames: string[] = [];
          formalParameters.forEach((name) => {
            const promiseNode = this.executions[executionId].copy[name];
            if (promiseNode.type == NodeType.Promise) {
              promiseNodePromises.push(promiseNode.value);
              promiseNodeNames.push(name);
            }
          });
          return Promise.all(promiseNodePromises).then((promiseNodes) => {
            promiseNodeNames.forEach((name, i) => {
              const node: ValueNode = {
                type: NodeType.Value,
                value: promiseNodes[i],
                name,
              };
              this.executions[executionId].copy[name] = node;
              this.executions[executionId].cache[name] = node;
            });
          });
        })
        .then(() =>
          formalParameters.map(
            (name) => this.executions[executionId].copy[name].value,
          ),
        )
    );
  }
  private getNodeError(
    ancestors: string[],
    parentName: string,
    node: CausedNode,
    resolvedValues: string[],
    reason: string,
  ) {
    const trace = ancestors.concat([parentName, node.name]).join("->");
    const params = node.dependencies.map((e, i) => `${e}=${resolvedValues[i]}`);
    const message = `Error on path ${trace}. call ${node.name}(${params}) ${reason}`;
    return new Error(message);
  }
  value(name: string, value: any) {
    this.validateNodeName(name);
    this.dependencies[name] = {
      type: NodeType.Value,
      value,
      name,
    };
  }
  async(name: string, value: FunctionAsync) {
    this.validateNodeName(name);
    this.dependencies[name] = {
      type: NodeType.Async,
      value,
      name,
      dependencies: this.extractFunctionArgs(value),
    };
  }
  private validateNodeName(name: string) {
    if (this.dependencies[name]) {
      throw new Error(`'${name}' is already registered`);
    }
    if (name.trim() !== name) {
      throw new Error("Node name cannot contain whitespace");
    }
    if (name.length == 0) {
      throw new Error("Node name cannot be empty");
    }
    if (name === this.ROOT_NODE_NAME) {
      throw new Error(`Node cannot be named 'root' to avoid confusion`);
    }
    // Checks if node name can be used as valid JS variable identifier,
    // since functions have these dependency injected.
    try {
      new Function(name, "var " + name);
    } catch (_) {
      throw new Error(`'${name}' is not a valid variable name`);
    }
  }
  private extractFunctionArgs(f: Function): string[] {
    const argsMatch = extractArgs(f);
    if (argsMatch === null || argsMatch.length < 2) {
      throw new Error(`Invalid function declaration: ${f}.`);
    }
    const argsString = argsMatch[1].trim();
    const isNoArgumentFn = argsString.length === 0;
    if (isNoArgumentFn) {
      return [];
    }
    return argsString.split(",").map((arg) => arg.trim());
  }
}
