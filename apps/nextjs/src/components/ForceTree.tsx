import { useEffect, useRef, useState } from "react";
import d3 from "d3";
import { ForceGraph2D } from "react-force-graph";

const useForceUpdate = () => {
  const setToggle = useState(false)[1];
  return () => setToggle((b) => !b);
};

const ForceTree = ({ data }) => {
  const fgRef = useRef<typeof ForceGraph2D>();

  const [controls] = useState({ "DAG Orientation": "td" });
  const forceUpdate = useForceUpdate();

  useEffect(() => {
    // add collision force
    fgRef?.current?.d3Force(
      "collision",
      d3.forceCollide((node) => Math.sqrt(100 / (node.level + 1))),
    );
  }, []);

  return (
    <ForceGraph2D
      ref={fgRef}
      graphData={data}
      dagMode="radialout"
      dagLevelDistance={50}
      backgroundColor="#101020"
      linkColor={() => "rgba(255,255,255,0.2)"}
      nodeRelSize={1}
      nodeId="path"
      nodeVal={(node) => 100 / (node.level + 1)}
      nodeLabel="path"
      nodeAutoColorBy="module"
      linkDirectionalParticles={2}
      linkDirectionalParticleWidth={2}
      d3VelocityDecay={0.3}
    />
  );
};

export default ForceTree;
