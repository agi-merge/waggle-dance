// utils/executeTasks.ts

import { type ChainPacket } from "@acme/chain";
import { type ExecuteRequestBody } from "~/pages/api/chain/types";
import { type DAGNode } from "../DAG";
import { type BaseResultType, type ScheduledTask } from "../types";

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
    const { dag, task, completedTasks, taskResults } = request;

    // Create a Set of completed tasks
    const completedTasksSet = new Set(completedTasks);
    // Create a task queue to store the tasks
    const taskQueue: ScheduledTask[] = [{ ...task, isScheduled: false }]
    try {
        // Keep looping while there are tasks in the task queue
        while (taskQueue.length > 0) {
            const validPairs = [{ task, dag }]

            log("Task queue:", taskQueue.map((t) => t.id), "validPairs", validPairs.map((p) => p.task.id));

            // Execute the valid pairs of {task, dag} concurrently, storing the execution request promises in executeTaskPromises array
            const executeTaskPromises = validPairs.map(async ({ task, dag }) => {
                // remove task from taskQueue
                const scheduledTask = taskQueue.findIndex((scheduledTask) => { scheduledTask.id == task.id })
                taskQueue.splice(scheduledTask, 1)

                log(`About to execute task ${task.id} -${task.name}...`);
                sendChainPacket({ type: "working", nodeId: task.id }, task)

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
                            log(`Stream ended for task ${task.id}-${task.name}:`);
                            log(`Raw buffer: ${buffer}`)
                            // Process response data and store packets in completedTasksSet and taskResults
                            // const packet = parse(buffer)

                            completedTasksSet.add(task.id);
                            taskResults[task.id] = buffer;
                            const packet = { type: "done", nodeId: task.id, value: buffer } as ChainPacket
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
                    sendChainPacket({ type: "error", nodeId: task.id, severity: "fatal", message }, task)
                    log(`Error while reading the stream or processing the response data for task ${task.id} -${task.name}: ${errMessage}`)
                } finally {
                    reader.releaseLock();
                }
            });

            // Wait for all task promises to settle and sleep for 1 second before looping again
            await Promise.all(executeTaskPromises);
            await sleep(1000);
        }
    } catch (error) {
        throw error;
    }

    // Return completed tasks and task results
    return { completedTasks: completedTasksSet, taskResults };
}