// NoSSRForceGraph.tsx
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

export interface ForceGraphProps {
  data: GraphData;
}

const useForceUpdate = () => {
  const setToggle = useState(false)[1];
  return () => setToggle((b) => !b);
};

const NoSSRForceGraph: React.FC<ForceGraphProps> = ({ data }) => {
  // const ForceGraph2D = forwardRef((props: any, ref: any) => (
  //   <OriginalForceGraph2D ref={ref} {...props} />
  // ));
  const fgRef = useRef<typeof OriginalForceGraph2D>();

  return (
    <OriginalForceGraph2D
      width={600}
      height={300}
      ref={fgRef}
      // dagMode="radial"
      nodeLabel="id"
      nodeAutoColorBy="id"
      graphData={data}
      cooldownTicks={100}
      linkWidth={3}
      linkLabel="id"
      linkAutoColorBy="id"
      dagLevelDistance={50}
      linkDirectionalParticles={2}
      linkDirectionalParticleSpeed={0.005}
      linkDirectionalParticleWidth={4}
      linkDirectionalArrowLength={8}
      linkDirectionalArrowRelPos={0.6}
      onEngineTick={() => {
        fgRef.current?.zoomToFit();
      }}
      onDagError={(loopNodeIds) => {
        console.error(`DAG error: ${loopNodeIds}`);
      }}
      onEngineStop={() => fgRef.current.zoomToFit()}
      enableZoomInteraction={false}
      enablePanInteraction={false}
      // enablePointerInteraction={false}
    />
  );
};

export default NoSSRForceGraph;
