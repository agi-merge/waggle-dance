import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import d3 from "d3";
import { ForceGraph2D } from "react-force-graph";

// import { ForceGraph2D } from "react-force-graph";

import { ChainTask, DirectedAcyclicGraph } from "./ChainMachine";

const useForceUpdate = () => {
  const setToggle = useState(false)[1];
  return () => setToggle((b) => !b);
};
export interface GraphData {
  nodes: NodeObject[];
  links: LinkObject[];
}

export type NodeObject = object & {
  id?: string | number;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number;
  fy?: number;
};

export type LinkObject = object & {
  source?: string | number | NodeObject;
  target?: string | number | NodeObject;
};

export interface ForceTreeProps {
  data: GraphData;
}

export const getGraphDataFromDAG = (
  dag: DirectedAcyclicGraph<ChainTask>,
): GraphData => {
  const nodes: NodeObject[] = [];
  const links: LinkObject[] = [];

  dag.tasks.forEach((task) => {
    nodes.push({
      id: task.id,
      ...task.data,
    });
    task.dependents.forEach((dependentId) => {
      links.push({
        source: task.id,
        target: dependentId,
      });
    });
  });

  return { nodes, links };
};

const ForceTree: React.FC<ForceTreeProps> = ({ data }) => {
  const fgRef = useRef<typeof ForceGraph2D>();

  const [controls] = useState({ "DAG Orientation": "td" });
  const forceUpdate = useForceUpdate();

  useEffect(() => {
    // add collision force
    fgRef?.current?.d3Force(
      "collision",
      d3.forceCollide((node) => Math.sqrt(100 / (node.level + 1))),
    );
  }, []);

  return (
    <ForceGraph2D
      // ref={fgRef}
      graphData={data}
      dagMode="radialout"
      dagLevelDistance={50}
      linkColor={() => "rgba(255,255,255,0.2)"}
      nodeRelSize={1}
      nodeId="path"
      nodeVal={(node) => 0}
      nodeLabel="path"
      nodeAutoColorBy="module"
      linkDirectionalParticles={2}
      linkDirectionalParticleWidth={2}
      d3VelocityDecay={0.3}
    />
  );
};

export default ForceTree;
