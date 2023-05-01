// ForceTree.tsx or ForceTree.jsx (depending on your file extension)
import React from "react";
import dynamic from "next/dynamic";

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

const ForceTreeComponent = dynamic(() => import("./DynamicForceTree"), {
  ssr: false,
});

const ForceTree: React.FC<ForceTreeProps> = ({ data }) => {
  return <ForceTreeComponent data={data} />;
};

export default ForceTree;
