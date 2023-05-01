// ChainMachine.tsx
import React, { useEffect, useState } from "react";
import { Button, Typography } from "@mui/joy";

import useChainTaskDAG, {
  ChainTask,
  ChainTaskType,
} from "../hooks/useChainTaskDAG";

type ExecutionLog = {
  id: number;
  message: string;
};

const executeTask = (task: ChainTask): Promise<{ status: "fulfilled" }> => {
  return new Promise((resolve) =>
    setTimeout(
      () => resolve({ status: "fulfilled" }),
      1000 + Math.random() * 3000,
    ),
  );
};

const performReview = (task: ChainTask): Promise<boolean> => {
  return new Promise((resolve) =>
    setTimeout(() => resolve(Math.random() > 0.9), 1000 + Math.random() * 3000),
  );
};

const ChainMachine: React.FC = () => {
  const [log, setLog] = useState<ExecutionLog[]>([]);
  const { dag, updateDAG } = useChainTaskDAG();

  const [initialized, setInitialized] = useState(false);

  const generateRandomTasks = () => {
    const taskCount = Math.floor(Math.random() * 5) + 1;
    const tasks: string[] = [];
    for (let i = 1; i <= taskCount; i++) {
      tasks.push(`task${i}`);
    }
    return tasks;
  };

  const appendLog = (message: string) => {
    setLog((log) => [...log, { id: Date.now(), message }]);
  };

  useEffect(() => {
    if (!initialized) {
      // Add nodes and dependencies to the DAG
      updateDAG((dag) => {
        dag.addNode("plan", {
          id: "plan",
          type: ChainTaskType.plan,
          dependencies: new Set(),
          dependents: new Set(),
        });
        const tasks = generateRandomTasks();
        tasks.forEach((task) => {
          dag.addNode(task, {
            id: task,
            type: ChainTaskType.execute,
            dependencies: new Set(["plan"]),
            dependents: new Set(),
          });
          dag.addEdge("plan", task);
        });
      });
      setInitialized(true);
    }
  }, [updateDAG, initialized]);

  const runSimulation = async () => {
    appendLog("Simulation started...");

    if (dag && dag.nodes) {
      const tasks = Array.from(dag.nodes).map((node) => node[1].data);
      await executeTasks(tasks);
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
      <Button onClick={runSimulation} color="primary">
        Start
      </Button>
      <Typography level="h5" style={{ marginTop: 16 }}>
        Execution Log:
      </Typography>
      <ul>
        {log.map((message) => (
          <li key={message.id}>{message.message}</li>
        ))}
      </ul>
    </div>
  );
};

export default ChainMachine;
