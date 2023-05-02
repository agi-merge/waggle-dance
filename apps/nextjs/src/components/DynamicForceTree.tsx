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
      nodeAutoColorBy={(node) => node.id || null}
      graphData={data}
      cooldownTicks={100}
      linkWidth={4}
      linkAutoColorBy="id"
      dagLevelDistance={30}
      linkDirectionalParticles={1}
      linkDirectionalParticleWidth={6}
      linkDirectionalArrowLength={0}
      linkDirectionalArrowRelPos={1}
      onEngineTick={() => {
        fgRef.current.zoomToFit();
      }}
      onDagError={(loopNodeIds) => {
        console.error(`DAG error: ${loopNodeIds}`);
      }}
      onEngineStop={() => fgRef.current.zoomToFit(0)}
    />
  );
};

export default ForceTree;
