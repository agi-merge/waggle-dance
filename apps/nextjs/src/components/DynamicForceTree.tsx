// ForceTreeComponent.tsx or ForceTreeComponent.jsx (depending on your file extension)
import React, { forwardRef, useEffect, useRef, useState } from "react";
import d3 from "d3";
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
  // const ForceGraph2D = forwardRef((props: any, ref: any) => (
  //   <OriginalForceGraph2D ref={ref} {...props} />
  // ));
  const fgRef = useRef<typeof OriginalForceGraph2D>();

  return (
    <OriginalForceGraph2D
      width={600}
      height={300}
      ref={fgRef}
      dagMode="radial"
      nodeLabel="id"
      nodeAutoColorBy={(node) => node.id}
      graphData={data}
      // cooldownTicks={100}
      linkWidth={3}
      onNodeDragEnd={(node) => {
        node.fx = node.x;
        node.fy = node.y;
      }}
      // dagLevelDistance={100}
      linkDirectionalParticles={1}
      linkDirectionalArrowLength={5}
      linkDirectionalArrowRelPos={1}
      onEngineStop={() => fgRef.current.zoomToFit(100)}
      // ref={fgRef}
      // graphData={data}
      // dagMode="td"
      // dagLevelDistance={50}
      // linkColor={() => "rgba(255,255,255,0.2)"}
      // nodeRelSize={1}
      // nodeId="path"
      // nodeVal={(node) => 0}
      // nodeLabel="path"
      // nodeAutoColorBy="module"
      // linkDirectionalParticles={2}
      // linkDirectionalParticleWidth={2}
      // d3VelocityDecay={0.3}
      // onEngineStop={() => {
      //   const current = fgRef.current;
      //   console.log("current", current);
      //   return current?.zoomToFit(400);
      // }}
    />
  );
};

export default ForceTree;
