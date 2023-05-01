import React, { useCallback, useEffect, useState } from "react";
import { Button } from "@mui/joy";

import ForceTree, { GraphData } from "~/components/ForceTree";
import useChainTaskDAG, {
  ChainTask,
  ChainTaskType,
  DirectedAcyclicGraph,
} from "../hooks/useChainTaskDAG";

interface ChainTaskDAGProps {
  onStopSimulation: () => void;
}

const ChainTaskDAG: React.FC<ChainTaskDAGProps> = ({ onStopSimulation }) => {
  const { dag, updateDAG } = useChainTaskDAG();
  const [graphData, setGraphData] = useState<GraphData>({
    nodes: [],
    links: [],
  });
  const [lastTaskId, setLastTaskId] = useState(1);

  const generateUniqueId = () => {
    setLastTaskId(lastTaskId + 1);
    return lastTaskId;
  };

  const addTask = useCallback(
    (taskId: string, taskType: ChainTaskType, parentTaskId?: string) => {
      updateDAG((dag) => {
        dag.addNode(taskId, {
          id: taskId,
          type: taskType,
          dependencies: new Set((parentTaskId && [parentTaskId]) || []),
          dependents: new Set(),
        });

        if (parentTaskId) {
          dag.addEdge(parentTaskId, taskId);
        }
      });
    },
    [],
  );

  const runSimulation = useCallback(async () => {
    // Execute tasks in the DAG and add new tasks with a slight randomness
    const executeTasks = () => {
      const taskIds = Array.from(dag.nodes.keys());
      const taskId = taskIds[Math.floor(Math.random() * taskIds.length)];

      const task = taskId && dag.getNode(taskId);
      if (task && task.data.type === ChainTaskType.review) {
        // 10% chance a review fails
        if (Math.random() < 0.1) {
          const reviewedTaskId = task.data.id.replace("review-", "");
          dag.cancelTask(reviewedTaskId);
        }
      }

      if (task && task.data.type !== ChainTaskType.review) {
        const subTaskCount = 1 + Math.floor(Math.random() * 10);
        for (let i = 0; i < subTaskCount; i++) {
          const newTaskId = `task-${generateUniqueId()}`;
          addTask(newTaskId, ChainTaskType.execute, task.data.id);
        }
      }

      updateGraphData();
    };

    await executeTasks();
  }, [addTask]);

  const updateGraphData = useCallback(() => {
    setGraphData(dag.getGraphDataFromDAG(dag));
  }, [dag]);

  useEffect(() => {
    // Add root task - generate a plan to achieve a Goal
    addTask("root-goal", ChainTaskType.plan);
    updateGraphData();
  }, [updateGraphData]);

  return (
    <div>
      <Button
        onClick={() => {
          runSimulation();
        }}
      >
        Next
      </Button>
      {/* <div className="max-h-96 w-full">
        <pre>{JSON.stringify(graphData, null, 2)}</pre>
      </div> */}
      <ForceTree data={graphData} />
    </div>
  );
};

export default ChainTaskDAG;
