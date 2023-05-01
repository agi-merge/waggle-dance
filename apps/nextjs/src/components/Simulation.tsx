import React, { useCallback, useMemo, useRef, useState } from "react";
import { Button } from "@mui/joy";

import useDAG, {
  ChainTask,
  ChainTaskType,
  DirectedAcyclicGraph,
} from "../hooks/useChainTaskDAG";

const executeTask = async (task: ChainTask) => {
  return new Promise.resolve({ status: "fulfilled" });
};

const performReview = async (task: ChainTask) => {
  return new Promise.resolve(Math.random() > 0.9);
};

const Simulation: React.FC = () => {
  const [log, setLog] = useState<string[]>([]);
  const { dag, updateDAG } = useDAG();

  const appendLog = (message: string) => {
    setLog((log) => [...log, message]);
  };

  const runSimulation = async () => {
    appendLog("Simulation started...");

    if (dag && dag.nodes) {
      const tasks = Array.from(dag.nodes).map((node) => node[1].data);
      await executeTasks(tasks);
    } else {
    }

    appendLog("Simulation ended.");
  };

  async function executeTasks(tasks: ChainTask[]): Promise<void> {
    await Promise.allSettled(
      tasks.map(async (task) => {
        if (task.type === ChainTaskType.error) return;

        task.type = ChainTaskType.execute;
        appendLog(`Executing task ${task.id}`);
        const executionResult = await executeTask(task);

        if (executionResult.status === "fulfilled") {
          task.type = ChainTaskType.review;
          appendLog(`Reviewing task ${task.id}`);
          const reviewResult = await performReview(task);
          if (reviewResult) {
            appendLog(`Review failed for task ${task.id}`);
            task.type = ChainTaskType.error;
            dag.cancelTask(task.id);
          } else {
            task.type = ChainTaskType.complete;
            appendLog(`Task ${task.id} completed.`);
          }
        } else {
          task.type = ChainTaskType.error;
          appendLog(`Task ${task.id} failed.`);
          dag.cancelTask(task.id);
        }
      }),
    );
  }

  return (
    <div>
      <h1>Concurrency Simulation</h1>
      <Button onClick={runSimulation}>Start</Button>
      <ul>
        {log.map((message, index) => (
          <li key={index}>{message}</li>
        ))}
      </ul>
    </div>
  );
};

export default Simulation;
