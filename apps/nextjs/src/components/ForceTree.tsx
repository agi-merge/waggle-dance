// ForceTree.tsx or ForceTree.jsx (depending on your file extension)
import React from "react";
import dynamic from "next/dynamic";

import { ChainTask, DirectedAcyclicGraph } from "./ChainMachine";

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

  dag.nodes.forEach((task) => {
    nodes.push({
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

const ForceTreeComponent = dynamic(() => import("./ForceTree"), {
  ssr: false,
});

const ForceTree: React.FC<ForceTreeProps> = ({ data }) => {
  return <ForceTreeComponent data={data} />;
};

export default ForceTree;
