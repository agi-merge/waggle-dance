// utils/executeTasks.ts

import { type ChainPacket } from "@acme/chain";
import { type ExecuteRequestBody } from "~/pages/api/chain/types";
import { type DAGNodeClass, type DAGNode } from "../DAG";
import { parse, stringify } from "yaml";

// A utility function to wait for a specified amount of time (ms)
export function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

// The executeTasks function takes in a request and a DAG, then runs tasks concurrently,
// and updates the completed tasks and task results accordingly.
export default async function executeTask(
    request: ExecuteRequestBody,
    _maxConcurrency: number,
    _isRunning: boolean,
    sendChainPacket: (chainPacket: ChainPacket, node: DAGNode | DAGNodeClass) => void,
    log: (...args: (string | number | object)[]) => void,
    abortSignal: AbortSignal,
): Promise<string> {
    const { dag } = request;
    const { task } = request;
    let result: unknown | undefined
    try {
        // Keep looping while there are tasks in the task queue
        if (abortSignal.aborted) throw new Error("Signal aborted");

        // Execute the valid pairs of {task, dag} concurrently, storing the execution request promises in executeTaskPromises array
        const executeTaskPromise = async () => {

            log(`About to execute task ${task.id} -${task.name}...`);
            sendChainPacket({ type: "starting", nodeId: task.id }, task)

            // Execute each task by making an API request
            const data = { ...request, task, dag };
            const response = await fetch("/api/chain/execute", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(data),
                signal: abortSignal,
            });

            // Get the response body as a stream
            const stream = response.body;
            if (!response.ok || !stream) {
                throw new Error(`No stream: ${response.statusText} `);
            } else {
                sendChainPacket({ type: "working", nodeId: task.id }, task)
                log(`Task ${task.id} -${task.name} stream began!`);
            }

            // Read the stream data and process based on response
            const reader = stream.getReader();
            let buffer = Buffer.alloc(0);
            try {
                while (!abortSignal.aborted) {
                    const { done, value } = await reader.read();
                    if (value && value.length > 0) {
                        buffer = Buffer.concat([buffer, Buffer.from(value)]);
                    }
                    if (done) {
                        const packets = parse(buffer.toString()) as ChainPacket[];
                        let packet = packets.findLast((packet) => packet.type === "handleAgentEnd" || packet.type === "done");
                        if (!packet) {
                            packet = packets.findLast((packet) => packet.type === "error" || packet.type === "handleChainError" || packet.type === "handleToolError" || packet.type === "handleLLMError");
                        } else {
                            if (packet.type === "handleAgentEnd") {
                                result = packet.returnValues;
                            } else if (packet.type === "done") {
                                result = packet.value;
                            }
                        }

                        if (!packet) {
                            sendChainPacket({ type: "error", severity: "fatal", message: "No exe result packet found" }, task)
                        } else {
                            log(`Stream ended for ${task.id}, packet`, packet)
                            sendChainPacket(packet, task)
                        }
                        return packet;
                    }
                }
            } catch (error) {
                const message = stringify(error);
                const errorPacket: ChainPacket = { type: "error", severity: "fatal", message }
                sendChainPacket(errorPacket, task)
                log(`Error while reading the stream or processing the response data for task: \n${buffer.toString()}`)
                debugger
                return errorPacket;
            } finally {
                reader.releaseLock();
            }
        }

        await executeTaskPromise();
    } catch (error) {
        const message = stringify(error)
        sendChainPacket({ type: "error", severity: "fatal", message }, task);
        return message
    }

    if (!result) {
        sendChainPacket({ type: "error", severity: "fatal", message: "No exe result" }, task);
        throw new Error("No exe result");
    }

    // Return completed tasks and task results
    return stringify(result);
}