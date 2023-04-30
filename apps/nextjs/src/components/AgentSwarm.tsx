// pages/simulation.tsx
import React, { useCallback, useEffect, useState } from "react";
import { Button } from "@mui/joy";

import ForceTree, { GraphData, LinkObject, NodeObject } from "./ForceTree";

interface AgentNode extends NodeObject {
  type: "goal" | "task" | "review";
  failedReview?: boolean;
}

interface AgentLink extends LinkObject {
  type: "plan" | "review" | "dependency";
}

const randomBoolean = () => Math.random() > 0.9;

const generateGraphData = (
  rootTask: AgentNode,
  taskOutput: AgentNode,
  agentLinks: AgentLink[],
): GraphData => {
  const graphData = { nodes: [rootTask, taskOutput], links: agentLinks };

  for (let i = 0; i < 3; i++) {
    const subTask: AgentNode = {
      id: `subTask-${taskOutput.id}-${i}`,
      type: "task",
    };

    const subTaskLink: AgentLink = {
      source: taskOutput.id,
      target: subTask.id,
      type: "plan",
    };

    agentLinks.push(subTaskLink);
    graphData.nodes.push(subTask);

    if (randomBoolean()) {
      const reviewTask: AgentNode = {
        id: `review-${subTask.id}`,
        type: "review",
        failedReview: randomBoolean(),
      };
      const reviewLink: AgentLink = {
        source: subTask.id,
        target: reviewTask.id,
        type: "review",
      };

      agentLinks.push(reviewLink);
      graphData.nodes.push(reviewTask);
    }
  }

  return graphData;
};

const AgentSwarm: React.FC = () => {
  const [graphData, setGraphData] = useState<GraphData>({
    nodes: [],
    links: [],
  });

  const [isSimulationRunning, setIsSimulationRunning] = useState(true);

  const simulate = useCallback(() => {
    if (!isSimulationRunning) return;

    const rootTask: AgentNode = {
      id: "root",
      type: "goal",
    };

    const taskOutput: AgentNode = {
      id: "taskOutput",
      type: "task",
    };

    const agentLinks: AgentLink[] = [
      {
        source: rootTask.id,
        target: taskOutput.id,
        type: "plan",
      },
    ];

    setGraphData(generateGraphData(rootTask, taskOutput, agentLinks));
  }, [isSimulationRunning]);

  useEffect(() => {
    simulate();
  }, [simulate]);

  return (
    <div>
      <h1>Collaborative AI Agent Swarm Simulation</h1>
      <Button onClick={simulate}>Next Step</Button>
      {graphData.nodes.length > 0 && graphData.links.length > 0 && (
        <ForceTree data={graphData} />
      )}
    </div>
  );
};

export default AgentSwarm;
