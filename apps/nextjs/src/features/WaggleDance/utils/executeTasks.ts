// utils/executeTasks.ts

import { type ChainPacket } from "@acme/chain";
import { type ExecuteRequestBody } from "~/pages/api/chain/types";
import { type DAGNode } from "../DAG";
import type DAG from "../DAG";
import { type BaseResultType, type ScheduledTask } from "../types";
import { parse } from "yaml";

// A utility function to wait for a specified amount of time (ms)
function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function decodeText(data: Uint8Array) {
    if (typeof TextDecoder !== "undefined") {
        return new TextDecoder().decode(data);
    } else {
        return String.fromCharCode.apply(null, Array.from(data));
    }
}

// The executeTasks function takes in a request and a DAG, then runs tasks concurrently,
// and updates the completed tasks and task results accordingly.
export default async function executeTasks(
    request: ExecuteRequestBody,
    maxConcurrency: number,
    _isRunning: boolean,
    sendChainPacket: (chainPacket: ChainPacket, node: DAGNode) => void,
    log: (...args: (string | number | object)[]) => void
): Promise<{
    completedTasks: Set<string>;
    taskResults: Record<string, BaseResultType>;
}> {
    // Destructure tasks and completedTasks from the request object
    const { dag, tasks, completedTasks, taskResults } = request;

    // Create a Set of completed tasks
    const completedTasksSet = new Set(completedTasks);
    // Create a task queue to store the tasks
    const taskQueue: ScheduledTask[] = tasks.map((t) => ({ ...t, isScheduled: false }));
    try {
        // Keep looping while there are tasks in the task queue
        while (taskQueue.length > 0) {
            let validPairs
            if (tasks.length === 1 && tasks[0]) {
                validPairs = [{ task: tasks[0], dag }]
            } else {
                // Gather the valid pairs of {task, dag} c from the task queue based on the completed tasks and the DAG edges
                validPairs = taskQueue.reduce((acc: Array<{ task: DAGNode; dag: DAG }>, task) => {
                    // const dag = dag[idx];
                    if (!dag || task.isScheduled || acc.length >= maxConcurrency) {
                        return acc;
                    }

                    const isValid = dag.edges.filter((edge) => edge.tId === task.id)
                        .every((edge) => completedTasksSet.has(edge.sId));

                    if (isValid) {
                        task.isScheduled = true
                        acc.push({ task, dag });
                    }

                    return acc;
                }, []);
                if (validPairs.length >= maxConcurrency) {
                    break;
                }
            }

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

                // Read the stream data and process based on response
                const reader = stream.getReader();
                let buffer = "";
                try {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) {
                            // Decode response data
                            log(`Stream ended for task ${task.id} -${task.name}:`);
                            log(`Raw buffer: ${buffer}`)
                            // Process response data and store packets in completedTasksSet and taskResults

                            const packet = parse(buffer) as ChainPacket

                            completedTasksSet.add(task.id);
                            taskResults[task.id] = [packet];
                            sendChainPacket({ type: "done", nodeId: task.id, value: JSON.stringify(packet) }, task)
                            return packet;
                        } else if (value.length) {
                            const jsonLines = decodeText(value);
                            const lastNewLineIndex = jsonLines.lastIndexOf("\n");
                            buffer += lastNewLineIndex === jsonLines.length - 1 ? jsonLines : jsonLines.slice(0, lastNewLineIndex + 1);

                            try {
                                const packet = parse(buffer) as ChainPacket;
                                log("packet", packet)
                                sendChainPacket(packet, task);
                            } catch {
                                // normal, do nothing
                            }
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