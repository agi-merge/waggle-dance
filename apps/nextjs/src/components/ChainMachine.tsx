/*

Given a DAG, write a idiomatic and complete ChainMachine React component that achieves the following:

Tasks have async executions.
The first task in the demo is to add a plan type task. The result of the plan task is an array of sub-task strings.
Those sub-tasks would be made dependents of the plan task.
When a task (≠ review type) returns a result, it must be reviewed.
However, because review is also async and slow, we want to start executing the sub-tasks while waiting. Similarly, some can be executed in parallel, while others are dependent on other tasks completing.
A task chain is said to be complete when all of its nodes have been canceled or completed.

*/

import { useCallback, useEffect, useState } from "react";
import { Button, Stack, Typography } from "@mui/joy";

import useDAG, { DAGNode } from "~/hooks/useDAG";
import ForceTree, { GraphData, getGraphDataFromDAG } from "./ForceTree";

export type Plan = {
  id: string;
  task: string;
  dependencies: Set<string>;
};

export enum ChainTaskType {
  plan = "plan",
  review = "review",
  execute = "execute",
  error = "error",
}

export type ChainTask = {
  id: string;
  type: ChainTaskType;
  dependencies: Set<string>;
  dependents: Set<string>;
};

export type ChainMachineProps = {
  initialPlan: string;
};

const ChainMachine: React.FC<ChainMachineProps> = ({ initialPlan }) => {
  // Replace the useState call for tasks with useDAG
  const { dag, updateDAG } = useDAG("initialPlan");

  // Modify the execute function to work with the DAG data structure
  const execute = async (taskNode: DAGNode<ChainTask>) => {
    console.log(`Executing task type: ${taskNode.data.type}`);
    // Implement your execution logic here based on taskNode.data.type
    // demo mode
    switch (taskNode.data.type) {
      case ChainTaskType.plan:
        const subTasks = await planTask(taskNode.id);
        updateDAG((dag) => {
          subTasks.forEach((subTask, index) => {
            const subTaskId = taskNode.id + index + 1;
            dag.addNode(subTaskId, taskNode.data);
            dag.addEdge(taskNode.id, subTaskId);
          });
        });
        break;
      case ChainTaskType.review:
        const reviewResult = await reviewTask(taskNode.id, taskNode.id);
        if (reviewResult) {
          await executeSubTask(taskNode.id);
        }
        break;
      case ChainTaskType.execute:
        await executeSubTask(taskNode.id);
    }
  };

  const executeTasks = async () => {
    for (const taskNode of dag.nodes.values()) {
      dag.executeTask(taskNode.id, async (task) => {
        await execute(taskNode);
      });
    }
  };

  useEffect(() => {
    executeTasks();
  }, [dag]);

  // const startChain = useCallback(async () => {
  //   if (dag.getNode(initialPlan)) {
  //     const taskPromises = [await executeTask(initialPlan)];
  //     await Promise.all(taskPromises);
  //   }
  // }, [initialPlan, executeTask, dag]);

  const [graphData, setGraphData] = useState<GraphData>(() =>
    getGraphDataFromDAG(dag),
  );
  useEffect(() => {
    // Update graphData whenever dag changes
    console.log("dag", dag);
    setGraphData(getGraphDataFromDAG(dag));
  }, [dag]);

  return (
    <Stack className="h-200 max-w-md">
      <Typography>
        {JSON.stringify(graphData, getCircularReplacer())}
      </Typography>
      {/* <Button onClick={startChain}>Start Chain</Button> */}
      <div className="h-200">{/* <ForceTree data={graphData} /> */}</div>
    </Stack>
  );
};

const execute = async (task: ChainTask) => {
  console.log(`Executing task type: ${task.type}`);
  // Implement your execution logic here based on task.type
  // demo mode
  switch (task.type) {
    case ChainTaskType.plan:
      return await planTask(task.id);
    case ChainTaskType.review:
      const reviewResult = await reviewTask(task.id, task.id);
      if (reviewResult) {
        return await executeSubTask(task.id);
      }
      break;
    case ChainTaskType.execute:
      return await executeSubTask(task.id);
  }
};

// Simulate async planTask
const planTask = async (id: string) => {
  return new Promise<Plan[]>((resolve) =>
    setTimeout(
      () =>
        resolve([
          { id: "task1", task: "fart", dependencies: new Set<string>() },
          {
            id: "task2",
            task: "poop",
            dependencies: new Set<string>(["task1"]),
          },
          {
            id: "task3",
            task: "peee",
            dependencies: new Set<string>(["task1"]),
          },
          { id: "task4", task: "peepee", dependencies: new Set<string>() },
        ]),
      1000 + Math.random() * 3000,
    ),
  );
};

// Simulate async reviewTask
const reviewTask = async (id: string, taskId: string) => {
  return new Promise<boolean>((resolve) =>
    setTimeout(() => resolve(Math.random() > 0.9), 1000 + Math.random() * 3000),
  );
};

// Simulate async executeSubTask
const executeSubTask = async (id: string) => {
  return new Promise<void>((resolve) =>
    setTimeout(resolve, 1000 + Math.random() * 3000),
  );
};

const getCircularReplacer = () => {
  const seen = new WeakSet();
  return (key: any, value: object | null) => {
    if (typeof value === "object" && value !== null) {
      if (seen.has(value)) {
        return;
      }
      seen.add(value);
    }
    return value;
  };
};

export default ChainMachine;

/* Return ONLY Improvements to the code, preserving the stated goals and implied intents */
