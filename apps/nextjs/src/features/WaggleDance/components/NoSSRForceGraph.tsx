// NoSSRForceGraph.tsx
import React, { useEffect, useRef, useState } from "react";
import useResizeObserver from "@react-hook/resize-observer";
import { forceCollide, forceLink, forceManyBody } from "d3-force";
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

function separateWords(input: string): string {
  return input
    .replace(/([a-z])([A-Z])/g, "$1 $2") // Separate camelCase and PascalCase
    .replace(/([A-Z])([A-Z][a-z])/g, "$1 $2") // Separate consecutive uppercase letters in PascalCase
    .replace(/_([a-zA-Z])/g, " $1") // Separate snake_case
    .replace(/([a-zA-Z])(\d+)/g, "$1 $2") // Separate words followed by numbers
    .replace(/(\d+)([a-zA-Z])/g, "$1 $2"); // Separate numbers followed by words
}

// Example usage:
console.log(separateWords("camelCase"));
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
  const label = separateWords((node as { name: string }).name);
  const fontSize = 12 / globalScale;
  ctx.font = `${fontSize}px Monospace`;

  // Set the maximum width for text wrapping
  const maxWidth = 150 / globalScale;
  const lines = wrapText(String(label), maxWidth, ctx) || [];

  // Calculate the width and height of the wrapped text
  const textWidth = Math.max(
    ...lines.map((line) => ctx.measureText(line ?? "?").width),
  );
  const textHeight = fontSize * lines.length;

  // Set the background color based on the node color
  const backgroundColor = (node as { color: string }).color || "white";
  ctx.fillStyle = backgroundColor;

  function drawRoundedRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
  ) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fill();
  }

  const paddingX = 20 / globalScale;
  const paddingY = 20 / globalScale;
  // Replace the ctx.ellipse method with the drawRoundedRect function
  drawRoundedRect(
    ctx,
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    node.x! - textWidth / 2 - paddingX / 2,
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    node.y! - textHeight / 2 - paddingY / 2,
    textWidth + paddingX,
    textHeight + paddingY,
    1,
  );

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
  ctx.textBaseline = "middle";
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

  useResizeObserver(containerRef, (entry) => {
    setContainerWidth(entry.contentRect.width);
  });

  useEffect(() => {
    if (containerRef.current) {
      setContainerWidth(containerRef.current.clientWidth);
    }
  }, [containerRef, setContainerWidth]);

  const [debouncedData, _state] = useDebounce(data, 1000);

  return (
    <div ref={containerRef} style={{ width: "100%", position: "relative" }}>
      <OriginalForceGraph2D
        width={containerWidth}
        height={containerWidth / (4 / 3)}
        // TODO: gotta come back to this one
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        ref={fgRef}
        nodeLabel="name"
        nodeAutoColorBy="id"
        graphData={debouncedData}
        cooldownTicks={60}
        linkWidth={4}
        linkAutoColorBy={"sId"}
        // linkAutoColorBy={(link: LinkObject) => stringToColor(String(link.sId))}
        linkDirectionalParticles={2}
        linkDirectionalParticleSpeed={0.007}
        linkDirectionalParticleWidth={5}
        linkDirectionalArrowLength={5}
        linkDirectionalArrowRelPos={0.8}
        nodeCanvasObject={renderNodeCanvasObject}
        linkCurvature={0.33}
        d3AlphaDecay={1}
        d3VelocityDecay={1}
        d3LinkForce={
          () =>
            forceLink()
              .id((d) => (d as { id: string }).id)
              .distance(20) // Increase the distance between linked nodes
              .strength(0) // Reduce the strength of the link force
        }
        d3Force={(forceName: string, forceFn: unknown) => {
          if (forceName === "collide") {
            console.log("collide");
            return forceCollide().radius(50); // Increase the collision radius
          } else if (forceName === "charge") {
            console.log("charge");
            return forceManyBody().strength(-500); // Increase the repelling force strength
          }
          return forceFn;
        }}
        onEngineTick={() => {
          fgRef.current?.zoomToFit(10);
          fgRef.current?.d3ReheatSimulation();
        }}
        onDagError={(loopNodeIds) => {
          console.error(`DAG error: ${loopNodeIds}`);
        }}
        onNodeDragEnd={(node) => {
          node.fx = node.x;
          node.fy = node.y;
        }}
        onEngineStop={() => fgRef.current?.zoomToFit(10)}
        enableZoomInteraction={false}
        enablePanInteraction={false}
        // onNodeClick={handleClick}
        // enablePointerInteraction={false}
      />
    </div>
  );
};

export default NoSSRForceGraph;
