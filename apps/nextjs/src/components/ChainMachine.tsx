import React, { useCallback } from "react";
import { useMachine } from "react-robot";
import { createMachine, invoke, state, transition } from "robot3";

// State machine definition
const taskMachine = createMachine({
  idle: state(transition("start", "working")),
  working: invoke(
    (ctx) => ctx.onCompletion,
    transition("done", "completed", (ctx) => {
      ctx.review();
    }),
  ),
  completed: state(),
});

const ChainMachine = () => {
  // Define the state
  const [tasks, setTasks] = React.useState([]);

  // Handle plan completion (progressing to review)
  const onPlanCompletion = useCallback(
    (id) => {
      setTasks(
        tasks.map((task) =>
          task.id === id ? { ...task, status: "review" } : task,
        ),
      );
    },
    [tasks],
  );

  // Add tasks to the tasks array
  const addTask = () => {
    const nextId = tasks.length + 1;
    setTasks([...tasks, { id: nextId, status: "working" }]);
  };

  return (
    <div>
      <h1>Chain Machine</h1>
      <button onClick={addTask}>Add Task</button>
      <div>
        {tasks.map((task) => (
          <Task
            key={task.id}
            id={task.id}
            onCompletion={() => onPlanCompletion(task.id)}
          />
        ))}
      </div>
    </div>
  );
};

const Task = ({ id, onCompletion }) => {
  const machineContext = React.useMemo(
    () => ({ onCompletion: () => onCompletion() }),
    [onCompletion],
  );
  const [current] = useMachine(taskMachine, machineContext);

  return (
    <div>
      Task {id}: {current.name}
    </div>
  );
};

export default ChainMachine;
