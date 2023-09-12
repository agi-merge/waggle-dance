// ForceGraph.tsx
import React, { lazy } from "react";

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

export interface ForceGraphProps {
  data: GraphData;
}

const NoSSRForceGraph = lazy(() => import("./NoSSRForceGraph"));

const ForceGraph: React.FC<ForceGraphProps> = ({ data }) => {
  return <NoSSRForceGraph data={data} />;
};

export default ForceGraph;
