// NoSSRForceGraph.tsx
import { useEffect, useRef, useState } from "react";
import useResizeObserver from "@react-hook/resize-observer";
import ForceGraph, { type ForceGraphProps } from "react-force-graph-2d";
// ok to do here bc all uses are dynamic (client side)

import { useDebounce } from "use-debounce";

import { rootPlanId } from "@acme/agent";

import { isColorDark } from "../utils/colors";

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
            Math.min(30, Math.min(Math.round(globalScale * 1.5), label.length)),
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

const NoSSRForceGraph = ({ graphData }: ForceGraphProps) => {
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

  const [debouncedData, _state] = useDebounce(graphData, 1000);

  return (
    <div ref={containerRef} style={{ width: "100%", position: "relative" }}>
      <ForceGraph
        width={containerWidth}
        height={containerWidth / (4 / 3)}
        dagMode={dagMode}
        dagLevelDistance={containerWidth / 30}
        // TODO: gotta come back to this one
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        ref={fgRef}
        nodeLabel="name"
        nodeColor={(node: NodeObject) => {
          if (node.id === rootPlanId) {
            return "#FFD700AA";
          }
          switch (node.status) {
            case "working":
              return "#ffcc00aa";
            case "done":
              return "#00ff00aa";
            case "error":
              return "#ff0000aa";
            default:
              return "#bbbbbbaa";
          }
        }}
        graphData={debouncedData}
        cooldownTicks={100}
        warmupTicks={100}
        linkWidth={4}
        linkAutoColorBy={"sId"}
        linkDirectionalParticles={2}
        linkDirectionalParticleSpeed={0.007}
        linkDirectionalParticleWidth={5}
        linkDirectionalArrowLength={3}
        linkDirectionalArrowRelPos={2}
        nodeCanvasObject={renderNodeCanvasObject}
        nodeRelSize={10}
        nodeCanvasObjectMode={() => "after"}
        linkCurvature={0.05}
        d3AlphaDecay={0}
        d3VelocityDecay={0.8}
        onNodeDragEnd={(node) => {
          node.fx = node.x;
          node.fy = node.y;
        }}
        onEngineTick={() => {
          fgRef.current?.zoomToFit(0, containerWidth / 40);
        }}
        onEngineStop={() => {
          fgRef.current?.zoomToFit(0, containerWidth / 40);
        }}
        enableZoomInteraction={enableZoomInteraction}
        enablePanInteraction={true}
        enablePointerInteraction={true}
      />
    </div>
  );
};

export default NoSSRForceGraph;
