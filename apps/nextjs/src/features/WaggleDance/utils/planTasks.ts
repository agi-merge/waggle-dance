// utils/planTasks.ts

import { type ChainPacket, type ModelCreationProps } from "@acme/chain";
import { parse } from "yaml";
import DAG from "../DAG";
import { DAGEdgeClass, type DAGNode } from "../DAG";
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
    let buffer = Buffer.alloc(0);
    const bufferWindowDuration = 500;
    let parseInterval: ReturnType<typeof setInterval> | null = null;

    function parseBuffer() {
        try {
            const packets = parse(buffer.toString()) as Partial<ChainPacket>[];
            let tokens = "";
            packets.forEach((packet) => {
                if (packet.type === "handleLLMNewToken" && packet.token) {
                    tokens += packet.token;
                }
            });
            const yaml = parse(tokens) as Partial<DAG>;
            if (yaml && yaml) {
                const optDag = yaml;
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

        } catch (error) {
            console.error(error)
            // normal, do nothing
        }
    }
    async function streamToString(stream: ReadableStream<Uint8Array>): Promise<string> {
        const reader = stream.getReader();

        updateTaskState && updateTaskState("not started");

        parseInterval = setInterval(() => {
            parseBuffer();
        }, bufferWindowDuration);

        let result;
        while ((result = await reader.read()) && !result.done) {
            if (abortSignal.aborted) throw new Error("Signal aborted");
            buffer = Buffer.concat([buffer, Buffer.from(result.value)]);
        }

        clearInterval(parseInterval); // Clear the interval when the stream is done
        parseBuffer(); // Parse any remaining data after the stream ends

        return buffer.toString();
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