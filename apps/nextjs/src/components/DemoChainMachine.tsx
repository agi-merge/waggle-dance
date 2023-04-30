import React, { useCallback, useEffect, useState } from "react";
import { Button, Stack, Typography } from "@mui/joy";

import ForceTree, {
  GraphData,
  LinkObject,
  NodeObject,
  getGraphDataFromDAG,
} from "./ForceTree";

// Assuming you have a Task type defined

function getGraphDataFromTasks(tasks: Task[]): GraphData {
  const nodes: NodeObject[] = tasks.map((task) => ({
    id: task.id,
  }));

  const links: LinkObject[] = tasks.reduce((acc: LinkObject[], task) => {
    task.dependents.forEach((dependentId) => {
      acc.push({
        source: task.id,
        target: dependentId,
      });
    });
    return acc;
  }, []);

  return {
    nodes,
    links,
  };
}

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

type Task = {
  id: string;
  type: "plan" | "execute" | "review";
  dependents: string[];
  execute: () => Promise<string[]>;
};

const executeTask = async (
  task: Task,
): Promise<{ result: string[]; cancelNodes: boolean }> => {
  // console.log(`Executing task ${task.id}`);
  const result = await task.execute();
  console.log(`${task.id} completed with result:`, result);

  // Randomly decide to cancel nodes, you can replace this with your own logic
  const cancelNodes = Math.random() < 0.15;

  return { result, cancelNodes };
};

const addReviewTask = (
  tasks: Task[],
  taskId: string,
  parentTaskId?: string,
) => {
  console.log(`Adding review task for ${taskId}`);
  const reviewTask: Task = {
    id: `review-${taskId}`,
    type: "review",
    dependents: [],
    execute: async () => {
      const cancelNodes = Math.random() < 0.15;
      console.log(`Review of ${taskId} completed: cancel ${cancelNodes}`);
      return cancelNodes;
    },
  };
  tasks.push(reviewTask);

  // Add review task as a dependent of the task it is reviewing
  const originalTask = tasks.find((task) => task.id === taskId);
  if (originalTask) {
    originalTask.dependents.push(reviewTask.id);
    if (parentTaskId) {
      const parentTask = tasks.find((task) => task.id === parentTaskId);
      if (parentTask) {
        parentTask.dependents.push(reviewTask.id);
      }
    }
  }

  return tasks;
};

const DemoChainMachine: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);

  const [graphData, setGraphData] = useState<GraphData>(() =>
    getGraphDataFromTasks(tasks),
  );
  useEffect(() => {
    // Update graphData whenever dag changes
    console.log("dag", tasks);
    setGraphData(getGraphDataFromTasks(tasks));
  }, [tasks]);

  const taskPrefixes = [
    "analyze",
    "compute",
    "process",
    "optimize",
    "validate",
  ];
  const taskSuffixes = ["data", "algorithm", "workflow", "system", "structure"];
  const taskCounts = [1, 2, 3, 4, 5];

  function generateRandomTaskName() {
    const prefix =
      taskPrefixes[Math.floor(Math.random() * taskPrefixes.length)];
    const suffix =
      taskSuffixes[Math.floor(Math.random() * taskSuffixes.length)];
    return `${prefix}-${tasks.length}-${suffix}`;
  }

  function generateRandomTasks() {
    const taskCount = taskCounts[Math.floor(Math.random() * taskCounts.length)];
    const tasks = [];
    for (let i = 0; i < taskCount; i++) {
      tasks.push(generateRandomTaskName());
    }
    return tasks;
  }

  // Initialize the plan task
  useEffect(() => {
    const planTask: Task = {
      id: "plan",
      type: "plan",
      dependents: [],
      execute: async () => {
        const randomTime = 0; //Math.floor(Math.random() * 3000) + 1000;
        const randomTasks = generateRandomTasks();
        return new Promise((resolve) =>
          setTimeout(() => resolve(randomTasks), randomTime),
        );
      },
    };
    let initialTasks = [planTask];
    initialTasks = addReviewTask(initialTasks, planTask.id);
    setTasks(initialTasks);
  }, []);

  const advanceSimulation = useCallback(async () => {
    const planTask = tasks.find((task) => task.type === "plan");
    if (!planTask) return;

    const subTaskIds = await executeTask(planTask);
    const reviewPlanTask = tasks.find(
      (task) => task.id === `review-${planTask.id}`,
    );
    if (reviewPlanTask) {
      await executeTask(reviewPlanTask);
    }

    const subTasks = subTaskIds.result.map((id) => ({
      id,
      type: "execute",
      dependents: [],
      execute: async () => {
        const randomTime = 0;
        return new Promise((resolve) =>
          setTimeout(() => resolve(`Result of ${id}`), randomTime),
        );
      },
    }));

    planTask.dependents = subTasks.map((task) => task.id);

    let newTasks = [...tasks, ...subTasks];
    subTasks.forEach((task) => {
      newTasks = addReviewTask(newTasks, task.id, planTask.id);
    });

    setTasks(newTasks);

    const executeTasks = tasks.filter((task) => task.type === "execute");
    if (executeTasks.length === 0) return;

    const reviewTasks = executeTasks.map((task) =>
      tasks.find((review) => review.id === `review-${task.id}`),
    );

    const taskPromises = Promise.all([
      ...executeTasks.map((task) => executeTask(task)),
      ...reviewTasks.map((task) => executeTask(task)),
    ]);

    const raceReviewTasks = Promise.race(
      reviewTasks.map((task, index) =>
        task.execute().then((result) => ({ task, result })),
      ),
    );

    const firstFailedReview = await raceReviewTasks;
    if (firstFailedReview.result.cancelNodes) {
      console.log(
        `Cancelling nodes related to task ${firstFailedReview.task.id}`,
      );
      setTasks(
        tasks.filter(
          (t) =>
            !firstFailedReview.task.dependents.includes(t.id) &&
            t.id !== firstFailedReview.task.id,
        ),
      );
    }

    await taskPromises.then(() => console.log("Review completed"));
  }, [tasks]);

  return (
    <Stack>
      <Button onClick={advanceSimulation}>Next Step</Button>
      {tasks.length > 0 && <ForceTree data={graphData} />}
    </Stack>
  );
};

export default DemoChainMachine;
