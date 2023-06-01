// utils/executeTasks.ts

import { type ChainPacket } from "@acme/chain";
import { type ExecuteRequestBody } from "~/pages/api/chain/types";
import { type DAGNode } from "../DAG";
import { type BaseResultType } from "../types";

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
    const taskQueue: DAGNode[] = [{ ...task }]
    try {
        // Keep looping while there are tasks in the task queue
        while (taskQueue.length > 0) {

            log("Task queue:", taskQueue.map((t) => t.id));

            // Execute the valid pairs of {task, dag} concurrently, storing the execution request promises in executeTaskPromises array
            const executeTaskPromise = async () => {
                // remove task from taskQueue
                // const scheduledTask = taskQueue.findIndex((scheduledTask) => { scheduledTask.id == task.id })
                console.log("before splice", taskQueue)
                const removed = taskQueue.splice(0, 1)
                console.log("after splice", taskQueue)
                if (!removed || removed.length <= 0) {
                    console.warn("Task not popped from taskQueue")
                    return
                }
                if (!task) {
                    if (removed.length > 0 && removed[0]) {
                        task = removed[0]
                    }
                    console.warn("No task")
                    return
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
                });

                // Get the response body as a stream
                const stream = response.body;
                if (!response.ok || !stream) {
                    throw new Error(`No stream: ${response.statusText} `);
                } else {
                    sendChainPacket({ type: "working", nodeId: task.id }, task)
                    log(`Task ${task.id} -${task.name} stream began!`);
                }
                const decoder = new TextDecoder()

                // Read the stream data and process based on response
                const reader = stream.getReader();
                let buffer = ""
                try {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) {
                            // Decode response data
                            // Process response data and store packets in completedTasksSet and taskResults
                            // const packet = parse(buffer)

                            completedTasksSet.add(task.id);
                            taskResults[task.id] = buffer;
                            const packet = { type: "done", nodeId: task.id, value: buffer } as ChainPacket
                            log(`Stream ended, raw buffer for ${task.id}: ${buffer}`, "packet", packet)
                            sendChainPacket(packet, task)
                            return packet;
                        } else if (value.length) {
                            // buffer.set(value, buffer.length);
                            const data = decoder.decode(value);
                            buffer += data
                            // const jsonLines = decodeText(value);
                            // console.log("jsonLines", jsonLines)
                            // const lastNewLineIndex = jsonLines.lastIndexOf("\n");
                            // buffer += lastNewLineIndex === jsonLines.length - 1 ? jsonLines : jsonLines.slice(0, lastNewLineIndex + 1);

                            // try {
                            //     const packet = parse(buffer) as ChainPacket;
                            //     log("packet", packet)
                            //     sendChainPacket(packet, task);
                            // } catch {
                            //     // normal, do nothing
                            // }
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
                    const errorPacket = { type: "error", nodeId: task.id, severity: "fatal", message } as ChainPacket
                    sendChainPacket(errorPacket, task)
                    log(`Error while reading the stream or processing the response data for task ${task.id} -${task.name}: ${errMessage}`)
                    return errorPacket;
                } finally {
                    reader.releaseLock();
                }
            }

            // Wait for all task promises to settle and sleep for 1 second before looping again
            if (taskQueue.filter(t => !!t).length > 0) {
                await executeTaskPromise();
            }
            await sleep(500);
        }
    } catch (error) {
        throw error;
    }

    // Return completed tasks and task results
    return { completedTasks: completedTasksSet, taskResults };
}