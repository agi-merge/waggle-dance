// NoSSRForceGraph.tsx
import React, { useEffect, useRef, useState } from "react";
import useResizeObserver from "@react-hook/resize-observer";
// ok to do here bc all uses are dynamic (client side)
// eslint-disable-next-line no-restricted-imports
import { ForceGraph2D as OriginalForceGraph2D } from "react-force-graph";
import { useDebounce } from "use-debounce";

import { isColorDark } from "../utils/colors";

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

  // my props (not on original type)
  name?: string;
  containerWidth?: number;
  status?: string;
};

type LinkObject = object & {
  source?: string | number | NodeObject;
  target?: string | number | NodeObject;

  // my props (not on original type)
  sId?: string;
};

interface ForceGraphProps {
  width?: number;
  height?: number;
  data: GraphData;
}

interface ForceGraphRef {
  zoomToFit: (durationMs?: number, padding?: number) => void;
  d3ReheatSimulation: () => void;
}

// Example usage:
function wrapText(
  text: string,
  maxWidth: number,
  ctx: CanvasRenderingContext2D,
) {
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = words[0];

  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    const width = ctx.measureText(`${currentLine} ${word}`).width;

    if (width < maxWidth) {
      currentLine = `${currentLine} ${word}`;
    } else {
      if (currentLine) {
        lines.push(currentLine);
      }
      currentLine = word;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }

  // Force line break for long words
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) {
      break;
    }
    const lineWidth = ctx.measureText(line).width;
    if (lineWidth > maxWidth) {
      let splitIndex = Math.floor((line.length * maxWidth) / lineWidth);
      // Ensure splitIndex is at least 1 to avoid infinite loop
      splitIndex = Math.max(1, splitIndex);
      const firstPart = line.substring(0, splitIndex);
      const secondPart = line.substring(splitIndex);
      lines.splice(i, 1, firstPart, secondPart);
    }
  }

  return lines;
}

const renderNodeCanvasObject = (
  node: NodeObject,
  ctx: CanvasRenderingContext2D,
  globalScale: number,
) => {
  const label = (node as { name: string }).name;

  const fontSize = Math.max(
    1,
    Math.min(3, ctx.canvas.width / 100 / globalScale),
  );
  ctx.font = `${fontSize}px Monospace`;

  // Set the maximum width for text wrapping
  const maxWidth = ctx.canvas.width / 20 / globalScale;
  const lines =
    wrapText(
      String(
        label.slice(
          0,
          Math.max(
            2,
            Math.min(30, Math.min(Math.round(globalScale * 2), label.length)),
          ),
        ),
      ),
      maxWidth,
      ctx,
    ) || [];

  // Calculate the height of the wrapped text
  const textHeight = fontSize * lines.length;

  // Set the background color based on the node color
  const backgroundColor = (node as { color: string }).color || "grey";
  ctx.fillStyle = backgroundColor;

  // Calculate the text color based on the background color
  const isDark = isColorDark(backgroundColor);
  const textColor = isDark ? "white" : "black";

  // Set the text shadow/outline
  ctx.shadowColor = isDark ? "black" : "white";
  ctx.shadowBlur = 2;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  // Draw the wrapped text
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  ctx.fillStyle = textColor;
  lines.forEach((line, index) => {
    ctx.fillText(
      line ?? "?",
      node.x || 0,
      (node.y || 0) - textHeight / 4 + index * fontSize,
    );
  });

  // Reset the shadow
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
};

const NoSSRForceGraph: React.FC<ForceGraphProps> = ({ data }) => {
  const fgRef = useRef<ForceGraphRef | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const dagMode = containerWidth > 768 ? "td" : "lr"; // Use 'td' for larger screens and 'lr' for smaller screens
  const enableZoomInteraction = containerWidth < 768;
  useResizeObserver(containerRef, (entry) => {
    setContainerWidth(entry.contentRect.width);
  });

  useEffect(() => {
    if (containerRef.current) {
      setContainerWidth(containerRef.current.clientWidth);
    }
  }, [containerRef, setContainerWidth]);

  useEffect(() => {
    if (containerRef && containerRef.current) {
      containerRef.current.scrollIntoView();
    }
  }, [containerRef]);

  const [debouncedData, _state] = useDebounce(data, 1000);

  return (
    <div ref={containerRef} style={{ width: "100%", position: "relative" }}>
      <OriginalForceGraph2D
        width={containerWidth}
        height={containerWidth / (4 / 3)}
        dagMode={dagMode}
        dagLevelDistance={containerWidth / 30}
        // TODO: gotta come back to this one
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        ref={fgRef}
        nodeLabel="name"
        // nodeAutoColorBy="status"
        nodeColor={(node: NodeObject) => {
          switch (node.status) {
            case "working":
              return "#ffcc00aa";
            case "done":
              return "#00ff00aa";
            case "error":
              return "#ff0000aa";
            default:
              return "#bbbbbb66";
          }
        }}
        graphData={debouncedData}
        cooldownTicks={60}
        linkWidth={4}
        linkAutoColorBy={"sId"}
        // linkAutoColorBy={(link: LinkObject) => stringToColor(String(link.sId))}
        linkDirectionalParticles={2}
        linkDirectionalParticleSpeed={0.007}
        linkDirectionalParticleWidth={5}
        linkDirectionalArrowLength={3}
        linkDirectionalArrowRelPos={0.5}
        nodeCanvasObject={renderNodeCanvasObject}
        nodeRelSize={10}
        nodeCanvasObjectMode={() => "after"}
        linkCurvature={0}
        d3AlphaDecay={0.7}
        nodeAutoColorBy={"status"}
        d3VelocityDecay={0.7}
        onEngineTick={() => {
          fgRef.current?.zoomToFit(0, containerWidth / 40);
          // fgRef.current?.d3ReheatSimulation();
        }}
        onEngineStop={() => {
          fgRef.current?.zoomToFit(0, containerWidth / 40);
        }}
        onDagError={(loopNodeIds) => {
          console.error(`DAG error: ${loopNodeIds}`);
        }}
        onNodeDragEnd={(node) => {
          node.fx = node.x;
          node.fy = node.y;
        }}
        enableZoomInteraction={enableZoomInteraction}
        enablePanInteraction={true}
        // onNodeClick={handleClick}
        enablePointerInteraction={true}
      />
    </div>
  );
};

export default NoSSRForceGraph;
