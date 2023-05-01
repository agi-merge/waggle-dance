import React, { useEffect, useState } from "react";
import { Button, Stack } from "@mui/joy";

import ForceTree, { GraphData } from "./ForceTree";

interface Task {
  id: string;
  dependencies?: Task[];
  status: "pending" | "running" | "canceled" | "completed";
  chanceOfFailure: number;
  input: any;
  output?: any;
}

class DAG {
  nodes: Map<string, Task>;
  edges: Map<string, string[]>;

  constructor() {
    this.nodes = new Map();
    this.edges = new Map();
  }

  addNode(task: Task): void {
    this.nodes.set(task.id, task);
  }

  addEdge(parentTaskId: string, childTaskId: string): void {
    if (this.edges.has(parentTaskId)) {
      this.edges.get(parentTaskId)?.push(childTaskId);
    } else {
      this.edges.set(parentTaskId, [childTaskId]);
    }
  }

  getChildTasks(taskId: string): Task[] {
    const childTaskIds = this.edges.get(taskId);
    const childTasks = childTaskIds?.map((taskId) => this.nodes.get(taskId));
    return childTasks?.filter((task): task is Task => task !== undefined) || [];
  }
}

const generateRandomTasks = (taskCount: number): Task[] => {
  const tasks: Task[] = [];

  for (let i = 0; i < taskCount; i++) {
    tasks.push({
      id: `task-${i}`,
      status: "pending",
      chanceOfFailure: 0.1,
      input: "",
    });
  }
  // Add some random dependencies
  tasks.forEach((task, index) => {
    if (index > 0) {
      task.dependencies = [tasks[index - 1]];
    }
  });
  return tasks;
};

const executeTask = async (task: Task) => {
  // Simulate task execution
  await new Promise((resolve) => setTimeout(resolve, 1000));
  return Math.random() >= task.chanceOfFailure;
};

const performReview = async (task: Task) => {
  // Simulate task review
  await new Promise((resolve) => setTimeout(resolve, 1000));
  return Math.random() >= 0.1;
};

const cancelDependentTasks = (dag: DAG, task: Task) => {
  const childTasks = dag.getChildTasks(task.id);
  if (childTasks) {
    childTasks.forEach((childTask) => {
      childTask.status = "canceled";
      cancelDependentTasks(dag, childTask);
    });
  }
};

const executeTasks = async (dag: DAG, tasks: Task[]): Promise<void> => {
  await Promise.allSettled(
    tasks.map(async (task) => {
      if (task.status === "canceled") return;

      task.status = "running";
      const executionResult = await executeTask(task);

      if (executionResult) {
        task.status = "completed";
        const childTasks = dag.getChildTasks(task.id);
        if (childTasks) {
          await executeTasks(dag, childTasks);
        }

        const reviewResult = await performReview(task);
        if (!reviewResult) {
          task.status = "canceled";
          cancelDependentTasks(dag, task);
        }
      } else {
        task.status = "canceled";
        cancelDependentTasks(dag, task);
      }
    }),
  );
};

const TaskSimulation: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>(generateRandomTasks(5));
  const [dag] = useState<DAG>(() => {
    const _dag = new DAG();
    tasks.forEach((task) => _dag.addNode(task));
    return _dag;
  });
  const [graphData, setGraphData] = useState<GraphData>({
    nodes: [],
    links: [],
  });

  useEffect(() => {
    dag.edges.clear();
    tasks.forEach((task) => {
      task.dependencies?.forEach((dep) => {
        dag.addEdge(task.id, dep.id);
      });
    });
  }, [tasks, dag]);

  useEffect(() => {
    setGraphData({
      nodes: tasks.map((task) => ({ id: task.id })),
      links: tasks.flatMap(
        (task) =>
          task.dependencies?.map((dep) => ({
            source: dep.id,
            target: task.id,
          })) || [],
      ),
    });
  }, [tasks]);

  const runSimulation = async () => {
    await executeTasks(dag, tasks);
    setTasks([...tasks]);
  };

  return (
    <Stack>
      <Button onClick={runSimulation}>Next Step</Button>
      {tasks.length > 0 && <ForceTree data={graphData} />}
    </Stack>
  );
};

export default TaskSimulation;
