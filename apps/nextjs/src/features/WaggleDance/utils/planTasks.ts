// utils/planTasks.ts

import { type ChainPacket, type ModelCreationProps } from "@acme/chain";
import { parse } from "yaml";
import DAG, { type OptionalDAG, DAGEdgeClass, type DAGNode } from "../DAG";
import { initialNodes, initialEdges, findNodesWithNoIncomingEdges, rootPlanId, type OptimisticFirstTaskState } from "../WaggleDanceMachine";


// Request the execution plan (DAG) from the API
export default async function planTasks(
    goal: string,
    goalId: string,
    creationProps: ModelCreationProps,
    dag: DAG,
    setDAG: (dag: DAG) => void,
    log: (...args: (string | number | object)[]) => void,
    sendChainPacket: (chainPacket: ChainPacket, node: DAGNode) => void,
    taskState: OptimisticFirstTaskState,
    abortSignal: AbortSignal,
    updateTaskState?: (state: "not started" | "started" | "done") => void,
    startFirstTask?: (task: DAGNode, dag: DAG) => Promise<void>,
): Promise<DAG> {
    const data = { goal, goalId, creationProps };
    const res = await fetch("/api/chain/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        signal: abortSignal,
    });

    if (!res.ok) {
        console.error(`Error fetching plan: ${res.status} ${res.statusText}`);
        throw new Error(`Error fetching plan: ${res.status} ${res.statusText}`);
    }
    // Get the response body as a stream
    const stream = res.body;
    let initialNode: DAGNode | undefined
    if (!stream) {
        throw new Error(`No stream: ${res.statusText} `);
    } else {
        log(`started planning!`);
        initialNode = initialNodes(goal, creationProps.modelName)[0]
        if (initialNode) {
            sendChainPacket({ type: "working", nodeId: rootPlanId }, initialNode)
        } else {
            log({ type: "error", nodeId: rootPlanId, message: "No initial node" })
            throw new Error("No initial node")
        }
    }
    async function streamToString(stream: ReadableStream<Uint8Array>): Promise<string> {
        let chunks = "" as string;
        const reader = stream.getReader();

        updateTaskState && updateTaskState("not started")

        let result;
        while ((result = await reader.read()) && !result.done) {
            const chunk = new TextDecoder().decode(result.value);
            if (abortSignal.aborted) break;
            chunks += chunk;
            try {
                const yaml = parse(chunks) as unknown;
                if (yaml && yaml as OptionalDAG) {
                    const optDag = yaml as OptionalDAG
                    const validNodes = optDag.nodes?.filter((n) => n.name.length > 0 && n.act.length > 0 && n.id.length > 0 && n.context);
                    const validEdges = optDag.edges?.filter((n) => n.sId.length > 0 && n.tId.length > 0);
                    if (validNodes?.length) {
                        const hookupEdges = findNodesWithNoIncomingEdges(optDag).map((node) => new DAGEdgeClass(rootPlanId, node.id))
                        const partialDAG = new DAG(
                            [...initialNodes(goal, creationProps.modelName), ...validNodes],
                            // connect our initial nodes to the DAG: gotta find them and create edges
                            [...initialEdges(), ...validEdges ?? [], ...hookupEdges],
                            // optDag?.init ?? initialCond,
                            // optDag?.goal ?? initialCond,
                        );
                        const diffNodesCount = partialDAG.nodes.length - dag.nodes.length
                        const newEdgesCount = partialDAG.edges.length - dag.edges.length
                        if (diffNodesCount || newEdgesCount) {
                            // FIXME: this gets called 4x for some reason
                            // if (newEdgesCount) {
                            //     log("newEdgesCount", newEdgesCount)
                            // } else {
                            //     log("diffNodesCount", diffNodesCount)
                            // }
                            setDAG(partialDAG)
                        }
                        const firstNode = validNodes[0]
                        if (startFirstTask && taskState.firstTaskState === "not started" && firstNode && validNodes.length > 0) { // would be 0, but params can be cut off
                            updateTaskState && updateTaskState("started");
                            void startFirstTask(firstNode, partialDAG);
                        }
                    }
                }
            } catch {
                // normal, do nothing
            }
        }

        return chunks;
    }

    // Convert the ReadableStream<Uint8Array> to a string
    const dagYamlString = await streamToString(stream);

    log("dagYamlString", dagYamlString);
    try {
        const dag = parse(dagYamlString) as unknown;
        // log("dag", stringify(dag))
        // TODO: if this fails, spin up a ConstitutionChain w/ return type reinforcement
        return dag as DAG;
    } catch (error) {
        console.error(error);
        throw new Error(`Error parsing DAG: ${error}`);
    }
}