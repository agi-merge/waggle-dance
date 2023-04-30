// ForceTreeComponent.tsx or ForceTreeComponent.jsx (depending on your file extension)
import React, { forwardRef, useRef, useState } from "react";
import { ForceGraphInstance } from "force-graph";
import { ForceGraph2D as OriginalForceGraph2D } from "react-force-graph";

import { ChainTask, DirectedAcyclicGraph } from "./ChainMachine";
import { ForceTreeProps } from "./ForceTree";

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

  // useEffect(() => {
  //   // add collision force
  //   fgRef?.current?.d3Force(
  //     "collision",
  //     d3.forceCollide((node) => Math.sqrt(100 / (node.level + 1))),
  //   );
  // }, []);

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
        return fgRef.current?.current?.zoomToFit(400);
      }}
    />
  );
};

export default ForceTree;
