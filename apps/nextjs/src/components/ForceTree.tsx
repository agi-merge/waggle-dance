import React, { forwardRef, useRef, useState } from "react";
import { ForceGraphInstance } from "force-graph";
import { ForceGraph2D as OriginalForceGraph2D } from "react-force-graph";

import { ChainTask, DirectedAcyclicGraph } from "./ChainMachine";

const useForceUpdate = () => {
  const setToggle = useState(false)[1];
  return () => setToggle((b) => !b);
};
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

interface ForceGraphMethods {
  zoomToFit(
    durationMs?: number,
    padding?: number,
    nodeFilter?: (node: NodeObject) => boolean,
  ): ForceGraphInstance;
  // Add other methods if needed
}

interface ForceGraphProps {
  // Add the necessary properties here based on the library's documentation
}

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
