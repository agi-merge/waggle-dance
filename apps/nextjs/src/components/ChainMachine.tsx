/*
As such the actual long-running task of planning, reviewing, executing, and whatever else will be stubbed.

ChainTask is currently a toy, but will need to support the use case:

ChainMachine will need to intelligently manage tasks performed by large language model agents.
The first task is to plan how to achieve a variable goal.
The return value could be a DAG-like structure in json of the task dependency structure.
If a task can be run concurrently without any dependent tasks, it may be represented as a more top-level node.
If it is dependent on another task's completion, it must be parented under that node.
The next steps would be to start executing the top level tasks as well as launch a review agent of the chain-of-thought of the plan task.
This is true for all task types other than review.
If the review agent judges the task to not be completed or heading in a good direction, the task and all subsequent tasks must be canceled and invalidated.
Then a new plan must occur, in a loop, until the goal is achieved.
Another state could be waiting for human input if there is a fatal error (e.g. stuck, loss of network, etc.).


The component renders the raw JSON as well as a simplistic visualization of the DAG. The DAG visualization is a stretch goal, but would be a nice to have.
Again, the following code is only a starting point and can be totally changed.
*/

import { useEffect, useState } from "react";
import { Button, Stack } from "@mui/joy";
import { Graph } from "react-d3-graph";
import { useMachine } from "react-robot";
import { createMachine, invoke, reduce, state, transition } from "robot3";

enum ChainTaskType {
  plan = "plan",
  review = "review",
  execute = "execute",
  error = "error",
}

interface ChainTask {
  execute: () => Promise<any>;
  type: ChainTaskType;
}

class DAG {
  nodes: DAGNode[];

  constructor() {
    this.nodes = [];
  }

  addNode(chainTask: ChainTask) {
    const node = new DAGNode(chainTask);
    this.nodes.push(node);
    return node;
  }

  connectNodes(parentNode: DAGNode, childNode: DAGNode) {
    parentNode.children.push(childNode);
    childNode.parents.push(parentNode);
  }
}

class DAGNode {
  chainTask: ChainTask;
  parents: DAGNode[];
  children: DAGNode[];

  constructor(chainTask: ChainTask) {
    this.chainTask = chainTask;
    this.parents = [];
    this.children = [];
  }
}

const context = () => ({
  goal: "",
  script: new DAG(),
});

async function createPlan(goal: string) {
  const task: ChainTask = {
    execute: async () => ["Task 1. do something", "Task 2. research"],
    type: ChainTaskType.plan,
  };

  const reviewTask: ChainTask = {
    execute: async () => ({ cancel: false, score: 1 }),
    type: ChainTaskType.review,
  };

  const script = new DAG();
  const agentNode = script.addNode(task);
  const reviewNode = script.addNode(reviewTask);
  script.connectNodes(agentNode, reviewNode);

  return script;
}

const machine = createMachine(
  {
    idle: state(transition("start", "planning")),
    planning: invoke(
      createPlan,
      transition(
        "done",
        "executing",
        reduce((ctx, ev) => ({ ...ctx, script: ev.data })),
      ),
    ),
    executing: state(),
  },
  context,
);

const getCircularReplacer = () => {
  const seen = new WeakSet();
  return (key, value) => {
    if (typeof value === "object" && value !== null) {
      if (seen.has(value)) {
        return;
      }
      seen.add(value);
    }
    return value;
  };
};

function convertToGraphData(script: DAG): { nodes: any[]; links: any[] } {
  return {
    nodes: script.nodes.map((node) => ({ id: node.chainTask.type })),
    links: script.nodes.flatMap((node) =>
      node.children.map((child) => ({
        source: node.chainTask.type,
        target: child.chainTask.type,
      })),
    ),
  };
}

const ChainMachine = () => {
  const [current, send] = useMachine(machine);
  const { goal, script } = current.context;

  const executeTask = async (task: ChainTask) => {
    const result = await task.execute();
    console.log("Task executed:", task.type, "Result:", result);
  };

  const goodReview = () => {
    // Simulate a good review by changing the review task's executed result
    script.nodes[1].chainTask.execute = async () => ({
      cancel: false,
      score: 1,
      reason: "Good review",
    });
  };

  const badReview = () => {
    // Simulate a bad review by changing the review task's executed result
    script.nodes[1].chainTask.execute = async () => ({
      cancel: true,
      score: 0,
      reason: "Bad review",
    });
  };

  const graphData = convertToGraphData(script);

  useEffect(() => {
    const nextGoal = "example goal";
    send({ type: "start", data: nextGoal });
  }, []);

  return (
    <Stack>
      <div>{JSON.stringify(script, getCircularReplacer())}</div>
      <div>
        {
          <Graph
            id="dag-graph"
            data={graphData}
            config={{
              node: { labelProperty: "id" },
              link: { renderLabel: true },
            }}
          />
        }
      </div>
      <Button onClick={() => executeTask(script.nodes[0].chainTask)}>
        Execute Task 1
      </Button>
      <Button onClick={() => executeTask(script.nodes[1].chainTask)}>
        Execute Review Task
      </Button>
      <Button onClick={() => goodReview()}>Simulate Good Review</Button>
      <Button onClick={() => badReview()}>Simulate Bad Review</Button>
    </Stack>
  );
};

export default ChainMachine;

// RETURN ONLY: A new ChainMachine.tsx that implements the header comment's stated goal of creating a demo.
