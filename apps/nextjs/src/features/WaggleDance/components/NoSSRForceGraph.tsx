// NoSSRForceGraph.tsx
import React, { useEffect, useRef, useState } from "react";
import useResizeObserver from "@react-hook/resize-observer";
import { ForceGraph2D as OriginalForceGraph2D } from "react-force-graph";
import { useDebounce } from "use-debounce";

interface GraphData {
  nodes: NodeObject[];
  links: LinkObject[];
}

type NodeObject = object & {
  id?: string | number;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number;
  fy?: number;
};

type LinkObject = object & {
  source?: string | number | NodeObject;
  target?: string | number | NodeObject;
};

interface ForceGraphProps {
  width?: number;
  height?: number;
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

  const [debouncedData, _state] = useDebounce(data, 1000);

  // const handleClick = useCallback(
  //   (node: NodeObject) => {
  //     // Aim at node from outside it
  //     const distance = 40;
  //     const distRatio = 1 + distance / Math.hypot(node?.x ?? 0, node?.y ?? 0);

  //     fgRef.current?.cameraPosition(
  //       { x: node?.x ?? 0 * distRatio, y: node?.y ?? 0 * distRatio }, // new position
  //       node, // lookAt ({ x, y, z })
  //       200, // ms transition duration
  //     );
  //   },
  //   [fgRef],
  // );
  return (
    <div ref={containerRef} style={{ width: "100%", position: "relative" }}>
      <OriginalForceGraph2D
        width={containerWidth}
        height={containerWidth * 0.5}
        // TODO: gotta come back to this one
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        ref={fgRef}
        dagMode="td"
        nodeLabel="name"
        nodeAutoColorBy="id"
        graphData={debouncedData}
        cooldownTicks={100}
        linkWidth={4}
        linkLabel="id"
        linkAutoColorBy="id"
        dagLevelDistance={15}
        linkDirectionalParticles={2}
        linkDirectionalParticleSpeed={0.005}
        linkDirectionalParticleWidth={5}
        linkDirectionalArrowLength={8}
        linkDirectionalArrowRelPos={0.6}
        onEngineTick={() => {
          fgRef.current?.zoomToFit();
        }}
        onDagError={(loopNodeIds) => {
          console.error(`DAG error: ${loopNodeIds}`);
        }}
        onNodeDragEnd={(node) => {
          node.fx = node.x;
          node.fy = node.y;
        }}
        onEngineStop={() => fgRef.current?.zoomToFit()}
        enableZoomInteraction={false}
        enablePanInteraction={false}
        // onNodeClick={handleClick}
        // enablePointerInteraction={false}
      />
    </div>
  );
};

export default NoSSRForceGraph;
