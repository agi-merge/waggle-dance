// components/TaskGraph.tsx
import React, { useCallback, useEffect, useState } from "react";

import { Viae } from "~/utils/Viae";

export type Task = {
  name: string;
  execute: () => Promise<any>;
};

type TaskResults = {
  [taskName: string]: { success: boolean; data?: any; error?: any };
};

type TaskGraphProps = {
  rootTask: Task;
};

const ogGraph = new Viae();
const TaskGraph = ({ rootTask }: TaskGraphProps) => {
  const [graph, setGraph] = useState(ogGraph);
  const [results, setResults] = useState<TaskResults>({});
  const [error, setError] = useState<Error | null>(null);

  const randomReviewStatus = () => Math.random() > 0.15;

  const executeNode = useCallback((task: Task): Promise<any> => {
    return task
      .execute()
      .then((res) => {
        setResults((prevResults) => ({
          ...prevResults,
          [task.name]: { success: true, data: res },
        }));
        return res;
      })
      .catch((err) => {
        setResults((prevResults) => ({
          ...prevResults,
          [task.name]: { success: false, error: err },
        }));
        throw err;
      });
  }, []);

  const executeReview = useCallback(
    (taskName: string): Promise<any> => {
      const reviewTask: Task = {
        name: `review${taskName}`,
        execute: async () => {
          const isSuccess = randomReviewStatus();
          if (!isSuccess) {
            throw new Error(`Review failed for task: ${taskName}`);
          }
          return { success: true };
        },
      };
      return executeNode(reviewTask);
    },
    [executeNode],
  );

  const addAndExecuteNode = async (task: Task): Promise<void> => {
    console.log(`Adding task: ${task.name}`);
    graph.value(task.name, task);
    graph.async(`execute${task.name}`, task.execute);
    if (!task.name.startsWith("review")) {
      graph.async(`review${task.name}`, () => executeReview(task.name));
    }
    try {
      graph.entryPoint(async ({ task, name }) => {
        console.log(`${task} executed ${name}`);
        // setResults()
        // setResults(`execute${rootTask.name}`);
      });
      // await graph.entryPoint(async (root: Task, `execute${rootTask.name}`: TaskResults) => {
      //   setResults(`execute-${rootTask.name}`);
      // });
    } catch (err) {
      if (err instanceof Error) {
        setError(err);
      }
    }
  };

  useEffect(() => {
    try {
      if (graph.dependencies && Object.values(graph.dependencies).length > 0) {
      } else {
        console.log(
          `Adding root task, ${rootTask.name} to graph ${JSON.stringify(
            graph,
          )}`,
        );

        addAndExecuteNode(rootTask);
        setGraph(graph);
      }
    } catch (error) {
      if (error instanceof Error) {
        setError(error);
      }
    }
  }, []);

  const renderResults = useCallback((): JSX.Element[] => {
    return Object.entries(results).map(([key, result]) => (
      <div key={key}>
        {key}: {result.success ? "Success" : "Failed"}{" "}
        {result.data ? JSON.stringify(result.data) : ""}
        {result.error ? result.error.message : ""}
      </div>
    ));
  }, [results]);

  return (
    <div>
      <h1>Task Graph Execution</h1>
      {error && <div>Error: {error.message}</div>}
      {renderResults()}
    </div>
  );
};

export default TaskGraph;
