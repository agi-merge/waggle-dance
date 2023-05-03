// NoSSRForceGraph.tsx
import React, { useEffect, useRef, useState } from "react";
import useResizeObserver from "@react-hook/resize-observer";
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
  width: number;
  height: number;
  data: GraphData;
}
interface ForceGraphRef {
  zoomToFit: () => void;
}

const NoSSRForceGraph: React.FC<ForceGraphProps> = ({ data }) => {
  const fgRef = useRef<ForceGraphRef | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useResizeObserver(containerRef, (entry) => {
    setContainerWidth(entry.contentRect.width);
  });

  useEffect(() => {
    if (containerRef.current) {
      setContainerWidth(containerRef.current.clientWidth);
    }
  }, []);
  return (
    <div ref={containerRef} style={{ width: "100%", position: "relative" }}>
      <OriginalForceGraph2D
        width={containerWidth}
        height={containerWidth * 0.75}
        ref={fgRef as any}
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
        onEngineStop={() => fgRef.current?.zoomToFit()}
        enableZoomInteraction={false}
        enablePanInteraction={false}
        // enablePointerInteraction={false}
      />
    </div>
  );
};

export default NoSSRForceGraph;
