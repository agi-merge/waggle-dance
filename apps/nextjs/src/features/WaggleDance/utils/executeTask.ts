// utils/executeTasks.ts

import { type ChainPacket } from "@acme/chain";
import { type ExecuteRequestBody } from "~/pages/api/chain/types";
import { type DAGNode } from "../DAG";
import { type BaseResultType } from "../types";
import { parse } from "yaml";

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
    sendChainPacket: (chainPacket: ChainPacket, node: DAGNode) => void,
    log: (...args: (string | number | object)[]) => void,
    abortSignal: AbortSignal,
): Promise<{
    completedTasks: Set<string>;
    taskResults: Record<string, BaseResultType>;
}> {
    // Destructure tasks and completedTasks from the request object
    const { dag, completedTasks, taskResults } = request;
    let { task } = request;
    // Create a Set of completed tasks
    const completedTasksSet = new Set(completedTasks);
    // Create a task queue to store the tasks
    const taskQueue: DAGNode[] = [{ ...task }].filter(t => !!t)
    try {
        // Keep looping while there are tasks in the task queue
        while (taskQueue.length > 0) {
            if (abortSignal.aborted) throw new Error("Signal aborted");

            // Execute the valid pairs of {task, dag} concurrently, storing the execution request promises in executeTaskPromises array
            const executeTaskPromise = async () => {
                // remove task from taskQueue
                // const scheduledTask = taskQueue.findIndex((scheduledTask) => { scheduledTask.id == task.id })
                const removed = taskQueue.splice(0, 1)
                if (!removed || removed.length <= 0) {
                    console.warn("Task not popped from taskQueue")
                    return
                }
                if (!task) {
                    if (removed.length > 0 && removed[0]) {
                        task = removed[0]
                    }
                    return
                }

                if (abortSignal.aborted) {
                    sendChainPacket({ type: "error", severity: "fatal", message: "Task has been canceled" }, task)
                    throw new Error("Aborted")
                }

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
                        if (done) {
                            value && (buffer = Buffer.concat([buffer, Buffer.from(value)]));
                            debugger;
                            const packets = parse(buffer.toString()) as ChainPacket[];
                            let packet = packets.findLast((packet) => { packet.type === "handleAgentEnd" || packet.type === "done" });
                            // debugger
                            if (!packet) {
                                packet = packets.findLast((packet) => { packet.type === "error" || packet.type === "handleChainError" || packet.type === "handleToolError" || packet.type === "handleLLMError" });
                            } else {
                                completedTasksSet.add(task.id);
                                if (packet.type === "handleAgentEnd") {
                                    taskResults[task.id] = packet.action?.returnValues;
                                } else if (packet.type === "done") {
                                    taskResults[task.id] = packet.value;
                                }
                            }

                            if (!packet) {
                                debugger
                                sendChainPacket({ type: "error", severity: "fatal", message: "No exe result packet found" }, task)
                            } else {
                                debugger
                                log(`Stream ended for ${task.id}}`, "packet", packet)
                                sendChainPacket(packet, task)
                            }
                            return packet;
                        } else if (value.length) {
                            buffer = Buffer.concat([buffer, Buffer.from(value)]);
                        }
                    }
                } catch (error) {
                    let errMessage: string
                    if (error instanceof Error) {
                        errMessage = error.message
                    } else {
                        errMessage = JSON.stringify(error)
                    }
                    const message = `Error while reading the stream or processing the response data for task ${task.id} -${task.name}: ${errMessage}`
                    const errorPacket: ChainPacket = { type: "error", severity: "fatal", message }
                    sendChainPacket(errorPacket, task)
                    log(`Error while reading the stream or processing the response data for task ${task.id} -${task.name}: ${errMessage}`)
                    return errorPacket;
                } finally {
                    reader.releaseLock();
                }
            }

            // Wait for all task promises to settle and sleep for 1 second before looping again
            if (taskQueue.length > 0) {
                await executeTaskPromise();
            }
            await sleep(500);
        }
    } catch (error) {
        sendChainPacket({ type: "error", severity: "fatal", message: String(error) }, task);
        throw error;
    }

    // Return completed tasks and task results
    return { completedTasks: completedTasksSet, taskResults };
}