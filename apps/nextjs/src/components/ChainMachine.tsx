import React, { useCallback, useEffect, useState } from "react";
import { useMachine } from "react-robot";
import {
  createMachine,
  guard,
  immediate,
  invoke,
  reduce,
  state,
  transition,
} from "robot3";

type TaskStatus = "idle" | "working" | "completed";

interface TaskData {
  id: number;
  status: TaskStatus;
  onCompletion: () => void;
}

const isTaskWorking = (task: TaskData) => task.status === "working";

const taskMachine = (onCompletion: () => void) =>
  createMachine({
    idle: state(transition("start", "working")),
    working: state(
      immediate("completed", guard(isTaskWorking)),
      transition("done", "completed"),
    ),
    completed: invoke(onCompletion, transition("done", "completed")),
  });

const Task: React.FC<TaskData> = ({ id, status, onCompletion }) => {
  const machine = taskMachine(onCompletion);
  const [current] = useMachine(machine);

  useEffect(() => {
    if (status === "working") {
      machine.send("start");
    }
  }, [status, machine]);

  return (
    <div>
      Task {id}: {current.name}
    </div>
  );
};

const ChainMachine: React.FC = () => {
  const [tasks, setTasks] = useState<TaskData[]>([]);

  const addNewTask = () => {
    setTasks((prevTasks): TaskData[] => [
      ...prevTasks,
      {
        id: prevTasks.length,
        status: "idle",
        onCompletion: () => console.log(`Task ${prevTasks.length} completed`),
      },
    ]);
  };

  const onPlanCompletion = useCallback(
    (id: number) => {
      setTasks(
        tasks.map((task) =>
          task.id === id ? { ...task, status: "completed" } : task,
        ),
      );
    },
    [tasks],
  );

  return (
    <div>
      <h1>Chain Machine</h1>
      <button onClick={addNewTask}>Add Task</button>
      <div>
        {tasks.map((task) => (
          <Task
            key={task.id}
            id={task.id}
            status={task.status}
            onCompletion={() => onPlanCompletion(task.id)}
          />
        ))}
      </div>
    </div>
  );
};

export default ChainMachine;
