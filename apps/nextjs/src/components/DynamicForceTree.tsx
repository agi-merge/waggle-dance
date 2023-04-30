// ForceTreeComponent.tsx or ForceTreeComponent.jsx (depending on your file extension)
import React, { forwardRef, useEffect, useRef, useState } from "react";
import { ForceGraphInstance } from "force-graph";
import { ForceGraph2D as OriginalForceGraph2D } from "react-force-graph";

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

const useForceUpdate = () => {
  const setToggle = useState(false)[1];
  return () => setToggle((b) => !b);
};

const ForceTree: React.FC<ForceTreeProps> = ({ data }) => {
  const ForceGraph2D = forwardRef((props: any, ref: any) => (
    <OriginalForceGraph2D ref={ref} {...props} />
  ));
  // const fgRef = useRef<ForceGraphMethods | undefined>(undefined);
  const fgRef = useRef<React.RefObject<any>>(React.createRef());

  const [controls] = useState({ "DAG Orientation": "td" });
  const forceUpdate = useForceUpdate();

  return (
    <ForceGraph2D
      ref={fgRef}
      graphData={data}
      dagMode="td"
      dagLevelDistance={50}
      linkColor={() => "rgba(255,255,255,0.2)"}
      nodeRelSize={1}
      nodeId="path"
      // nodeVal={(node) => 0}
      nodeLabel="path"
      nodeAutoColorBy="module"
      linkDirectionalParticles={2}
      linkDirectionalParticleWidth={2}
      d3VelocityDecay={0.3}
      onEngineStop={() => {
        const current = fgRef.current?.current;
        console.log("current", current);
        return current?.zoomToFit(400);
      }}
    />
  );
};

export default ForceTree;
