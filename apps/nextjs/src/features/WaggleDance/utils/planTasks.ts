// utils/planTasks.ts

import { type ChainPacket, type ModelCreationProps } from "@acme/chain";
import { parse, stringify } from "yaml";
import DAG, { type DAGNodeClass } from "../DAG";
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
    sendChainPacket: (chainPacket: ChainPacket, node: DAGNode | DAGNodeClass) => void,
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
    let initialNode: DAGNode | DAGNodeClass | undefined
    if (!stream) {
        throw new Error(`No stream: ${res.statusText} `);
    } else {
        log(`started planning!`);
        initialNode = initialNodes(goal)[0]
        if (initialNode) {
            sendChainPacket({ type: "working", nodeId: rootPlanId }, initialNode)
        } else {
            log({ type: "error", nodeId: rootPlanId, message: "No initial node" })
            throw new Error("No initial node")
        }
    }
    let buffer = Buffer.alloc(0);
    let tokens = "";
    function parseBuffer(): DAG | undefined {
        try {
            // Parse the buffer and get the packets
            const newPackets = parse(buffer.toString()) as Partial<ChainPacket>[];
            // Find the token packets and accumulate the tokens
            newPackets.forEach((packet) => {
                if (packet.type === "token" && packet.token) {
                    tokens += packet.token;
                }
            });
            // finally, parse the tokens into a DAG
            const yaml = parse(tokens) as Partial<DAG>;
            if (yaml && yaml.nodes && yaml.nodes.length > 0) {
                const optDag = yaml;
                const validNodes = optDag.nodes?.filter((n) => n.name.length > 0 && n.act.length > 0 && n.id.length > 0 && n.context);
                const validEdges = optDag.edges?.filter((n) => n.sId.length > 0 && n.tId.length > 0);
                if (validNodes?.length) {
                    const hookupEdges = findNodesWithNoIncomingEdges(optDag).map((node) => new DAGEdgeClass(rootPlanId, node.id))
                    const partialDAG = new DAG(
                        [...initialNodes(goal), ...validNodes],
                        // connect our initial nodes to the DAG: gotta find them and create edges
                        [...initialEdges(), ...validEdges ?? [], ...hookupEdges],
                    );
                    const diffNodesCount = partialDAG.nodes.length - dag.nodes.length
                    const newEdgesCount = partialDAG.edges.length - dag.edges.length
                    if (diffNodesCount || newEdgesCount) {
                        setDAG(partialDAG)
                    }
                    const firstNode = validNodes[0]
                    if (startFirstTask && taskState.firstTaskState === "not started" && firstNode && validNodes.length > 0) { // would be 0, but params can be cut off
                        updateTaskState && updateTaskState("started");
                        void startFirstTask(firstNode, partialDAG);
                    }
                    return partialDAG
                }
            }

        } catch (error) {
            // normal, do nothing
        }
    }

    async function streamToString(stream: ReadableStream<Uint8Array>): Promise<string | DAG> {
        const reader = stream.getReader();

        updateTaskState && updateTaskState("not started");

        let result;
        while ((result = await reader.read()) && !result.done) {
            if (abortSignal.aborted) {
                throw new Error("Signal aborted");
            }
            const newData = Buffer.from(result.value);
            const lineBreakIndex = newData.lastIndexOf("\n");

            // Only store complete lines in the buffer and parse the partial line
            if (lineBreakIndex !== -1) {
                const completeLine = newData.subarray(0, lineBreakIndex + 1);
                const partialLine = newData.subarray(lineBreakIndex + 1);

                buffer = Buffer.concat([buffer, completeLine]);
                parseBuffer(); // Parse the data immediately after receiving a complete line
                buffer = partialLine; // Store the remaining partial line in the buffer
            } else {
                buffer = Buffer.concat([buffer, newData]);
            }
        }

        return tokens
    }


    async function parseDAG(stream: ReadableStream<Uint8Array>): Promise<DAG> {
        // Convert the ReadableStream<Uint8Array> to a string
        const dagYamlString = await streamToString(stream);

        try {
            let dag: DAG;
            if (typeof dagYamlString === "string") {
                dag = parse(dagYamlString) as DAG;
            } else {
                dag = dagYamlString;
            }

            // TODO: if this fails, spin up a ConstitutionChain w/ return type reinforcement
            return dag;
        } catch (error) {
            console.error(error);
            console.log("yaml", dagYamlString);

            try {
                // Attempt to fix formatting errors if parsing failed initially
                const fixedYamlString = fixYamlFormattingWithError(dagYamlString as string);
                const fixedDag: DAG = parse(fixedYamlString) as DAG;
                return fixedDag;
            } catch (innerError) {
                throw new Error(`Error parsing DAG: ${innerError}`);
            }
        }
    }

    return await parseDAG(stream);

}


function fixYamlIssues(yamlString: string): string {
    return yamlString.split('\n')
        .map((line: string): string => {
            const match: RegExpMatchArray | null = line.match(/^( *)(\w+): ?(.*)?$/);
            if (match) {
                const [, indentation, key, value] = match;
                const trimmedValue: string = (value || '').trim();
                return `${indentation}${key}: ${trimmedValue}`;
            }
            return line;
        })
        .join('\n');
}

function fixYamlFormattingWithError(yamlString: string): string {
    const fixedYamlIssues: string = fixYamlIssues(yamlString);
    const yamlData: unknown = parse(fixedYamlIssues);
    const fixedYamlString: string = stringify(yamlData, { indent: 2 });
    return fixedYamlString;
}