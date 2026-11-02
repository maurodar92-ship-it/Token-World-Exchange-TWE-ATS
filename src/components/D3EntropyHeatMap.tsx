import React, { useEffect, useRef, useState, useMemo } from "react";
import * as d3 from "d3";
import { EntropyCell, HEX_CHARACTERS } from "../utils/entropyAnalytics";

export type ColorTheme = "cyber_turbo" | "quantum_viridis" | "neon_inferno" | "plasma_matrix";

interface D3EntropyHeatMapProps {
  cells: EntropyCell[];
  totalTokens: number;
  selectedTokenSignature?: string;
  selectedPosition?: number | null;
  selectedChar?: string | null;
  onSelectCell?: (position: number, char: string) => void;
  colorTheme?: ColorTheme;
  metricType?: "count" | "frequency" | "zScore";
}

export const D3EntropyHeatMap: React.FC<D3EntropyHeatMapProps> = ({
  cells,
  totalTokens,
  selectedTokenSignature,
  selectedPosition,
  selectedChar,
  onSelectCell,
  colorTheme = "cyber_turbo",
  metricType = "count",
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Hover state for tooltip & crosshair
  const [hoveredCell, setHoveredCell] = useState<EntropyCell | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  // Dimensions state
  const [dimensions, setDimensions] = useState({ width: 900, height: 380 });

  // Handle Resize
  useEffect(() => {
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const { width } = entries[0].contentRect;
      if (width > 200) {
        setDimensions((prev) => ({
          ...prev,
          width: Math.floor(width),
        }));
      }
    });
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Compute color scale based on metricType
  const { colorScale, minVal, maxVal, expectedVal } = useMemo(() => {
    let min = 0;
    let max = 1;
    let expected = 0;

    if (metricType === "count") {
      min = (d3.min(cells, (d: EntropyCell) => d.count) as number | undefined) ?? 0;
      max = Math.max(1, (d3.max(cells, (d: EntropyCell) => d.count) as number | undefined) ?? 1);
      expected = totalTokens / 16;
    } else if (metricType === "frequency") {
      min = (d3.min(cells, (d: EntropyCell) => d.frequency) as number | undefined) ?? 0;
      max = Math.max(0.01, (d3.max(cells, (d: EntropyCell) => d.frequency) as number | undefined) ?? 0.125);
      expected = 1 / 16; // 0.0625
    } else {
      // zScore
      const absMax = Math.max(
        1,
        (d3.max(cells, (d: EntropyCell) => Math.abs(d.zScore)) as number | undefined) ?? 2
      );
      min = -absMax;
      max = absMax;
      expected = 0;
    }

    const interpolator =
      colorTheme === "quantum_viridis"
        ? d3.interpolateViridis
        : colorTheme === "neon_inferno"
        ? d3.interpolateInferno
        : colorTheme === "plasma_matrix"
        ? d3.interpolatePlasma
        : d3.interpolateTurbo;

    const scale = d3.scaleSequential(interpolator).domain([min, max]);

    return { colorScale: scale, minVal: min, maxVal: max, expectedVal: expected };
  }, [cells, colorTheme, metricType, totalTokens]);

  // Extract signature characters if active token is provided
  const activeSignatureChars = useMemo(() => {
    if (!selectedTokenSignature) return null;
    const clean = selectedTokenSignature.toLowerCase().replace(/[^0-9a-f]/g, "").padEnd(64, "0").slice(0, 64);
    return clean.split("");
  }, [selectedTokenSignature]);

  // Draw Heat Map with D3
  useEffect(() => {
    if (!svgRef.current || cells.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Clear previous render

    const margin = { top: 32, right: 28, bottom: 44, left: 36 };
    const innerWidth = Math.max(200, dimensions.width - margin.left - margin.right);
    const innerHeight = Math.max(150, dimensions.height - margin.top - margin.bottom);

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // X scale: 64 positions (0 to 63)
    const xScale = d3
      .scaleBand<number>()
      .domain(Array.from({ length: 64 }, (_, i) => i))
      .range([0, innerWidth])
      .padding(0.08);

    // Y scale: 16 hex characters ('0' to 'f')
    const yScale = d3
      .scaleBand<string>()
      .domain([...HEX_CHARACTERS])
      .range([0, innerHeight])
      .padding(0.08);

    // Grid cells background / border styling
    g.append("rect")
      .attr("width", innerWidth)
      .attr("height", innerHeight)
      .attr("fill", "#0A0A0C")
      .attr("stroke", "#1F1F23")
      .attr("rx", 4);

    // Render cells
    g.selectAll<SVGRectElement, EntropyCell>(".cell")
      .data(cells)
      .enter()
      .append("rect")
      .attr("class", "cell transition-opacity duration-150")
      .attr("x", (d: EntropyCell) => xScale(d.position) || 0)
      .attr("y", (d: EntropyCell) => yScale(d.char) || 0)
      .attr("width", xScale.bandwidth())
      .attr("height", yScale.bandwidth())
      .attr("rx", 1.5)
      .attr("fill", (d: EntropyCell) => {
        const val =
          metricType === "count"
            ? d.count
            : metricType === "frequency"
            ? d.frequency
            : d.zScore;
        return colorScale(val);
      })
      .attr("stroke", (d: EntropyCell) => {
        if (selectedPosition === d.position && selectedChar === d.char) {
          return "#FFFFFF";
        }
        return "none";
      })
      .attr("stroke-width", 1.5)
      .style("cursor", "pointer")
      .on("mouseenter", function (event: MouseEvent, d: EntropyCell) {
        d3.select(this).attr("stroke", "#FFFFFF").attr("stroke-width", 1.5);
        setHoveredCell(d);
        const rect = svgRef.current?.getBoundingClientRect();
        if (rect) {
          setTooltipPos({
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
          });
        }
      })
      .on("mousemove", function (event: MouseEvent) {
        const rect = svgRef.current?.getBoundingClientRect();
        if (rect) {
          setTooltipPos({
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
          });
        }
      })
      .on("mouseleave", function (event: MouseEvent, d: EntropyCell) {
        if (selectedPosition !== d.position || selectedChar !== d.char) {
          d3.select(this).attr("stroke", "none");
        }
        setHoveredCell(null);
        setTooltipPos(null);
      })
      .on("click", function (event: MouseEvent, d: EntropyCell) {
        if (onSelectCell) {
          onSelectCell(d.position, d.char);
        }
      });

    // Crosshair column highlight when hovering
    if (hoveredCell) {
      g.append("rect")
        .attr("x", xScale(hoveredCell.position) || 0)
        .attr("y", 0)
        .attr("width", xScale.bandwidth())
        .attr("height", innerHeight)
        .attr("fill", "none")
        .attr("stroke", "rgba(255, 255, 255, 0.4)")
        .attr("stroke-dasharray", "2,2")
        .attr("pointer-events", "none");

      g.append("rect")
        .attr("x", 0)
        .attr("y", yScale(hoveredCell.char) || 0)
        .attr("width", innerWidth)
        .attr("height", yScale.bandwidth())
        .attr("fill", "none")
        .attr("stroke", "rgba(255, 255, 255, 0.4)")
        .attr("stroke-dasharray", "2,2")
        .attr("pointer-events", "none");
    }

    // Active token trajectory line overlay
    if (activeSignatureChars) {
      const lineGenerator = d3
        .line<{ pos: number; char: string }>()
        .x((d) => (xScale(d.pos) || 0) + xScale.bandwidth() / 2)
        .y((d) => (yScale(d.char) || 0) + yScale.bandwidth() / 2)
        .curve(d3.curveMonotoneX);

      const pathData = activeSignatureChars.map((char, pos) => ({ pos, char }));

      g.append("path")
        .datum(pathData)
        .attr("fill", "none")
        .attr("stroke", "#FFFFFF")
        .attr("stroke-width", 2)
        .attr("stroke-opacity", 0.85)
        .attr("stroke-dasharray", "4,2")
        .attr("pointer-events", "none")
        .attr("d", lineGenerator);

      // Dots on each position for the active token
      pathData.forEach((pt) => {
        g.append("circle")
          .attr("cx", (xScale(pt.pos) || 0) + xScale.bandwidth() / 2)
          .attr("cy", (yScale(pt.char) || 0) + yScale.bandwidth() / 2)
          .attr("r", 2.5)
          .attr("fill", "#06B6D4")
          .attr("stroke", "#FFFFFF")
          .attr("stroke-width", 1)
          .attr("pointer-events", "none");
      });
    }

    // X Axis: 64 Character Positions
    const xAxis = d3
      .axisBottom(xScale)
      .tickValues([0, 4, 8, 12, 16, 20, 24, 28, 32, 36, 40, 44, 48, 52, 56, 60, 63])
      .tickFormat((d) => `#${d}`);

    const xAxisGroup = g
      .append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(xAxis);

    xAxisGroup.select(".domain").attr("stroke", "#2A2A30");
    xAxisGroup.selectAll(".tick line").attr("stroke", "#2A2A30");
    xAxisGroup
      .selectAll(".tick text")
      .attr("fill", "#8E9299")
      .attr("font-family", "monospace")
      .attr("font-size", "10px");

    // X Axis label
    g.append("text")
      .attr("x", innerWidth / 2)
      .attr("y", innerHeight + 36)
      .attr("fill", "#8E9299")
      .attr("text-anchor", "middle")
      .attr("font-size", "11px")
      .attr("font-family", "monospace")
      .text("Entropy Signature Character Position (0 to 63 · 256 Bits)");

    // Y Axis: 16 Hex Characters
    const yAxis = d3.axisLeft(yScale);
    const yAxisGroup = g.append("g").call(yAxis);

    yAxisGroup.select(".domain").attr("stroke", "#2A2A30");
    yAxisGroup.selectAll(".tick line").attr("stroke", "#2A2A30");
    yAxisGroup
      .selectAll(".tick text")
      .attr("fill", (d: unknown) => (/[0-9]/.test(String(d)) ? "#A855F7" : "#06B6D4"))
      .attr("font-family", "monospace")
      .attr("font-size", "11px")
      .attr("font-weight", "bold");

    // Top X markers (Byte Math: 0 to 31 bytes)
    const topAxisValues = [0, 8, 16, 24, 32, 40, 48, 56];
    topAxisValues.forEach((pos) => {
      const byteIndex = Math.floor(pos / 2);
      g.append("text")
        .attr("x", (xScale(pos) || 0) + xScale.bandwidth() / 2)
        .attr("y", -10)
        .attr("fill", "#666672")
        .attr("text-anchor", "middle")
        .attr("font-size", "9px")
        .attr("font-family", "monospace")
        .text(`Byte ${byteIndex}`);
    });
  }, [
    cells,
    dimensions,
    colorScale,
    hoveredCell,
    selectedPosition,
    selectedChar,
    activeSignatureChars,
    metricType,
    onSelectCell,
  ]);

  return (
    <div ref={containerRef} className="relative w-full overflow-hidden select-none">
      {/* SVG Canvas */}
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        className="block mx-auto rounded-lg"
      />

      {/* Interactive Tooltip */}
      {hoveredCell && tooltipPos && (
        <div
          className="absolute pointer-events-none z-30 p-3 rounded-lg bg-[#0A0A0C]/95 border border-[#2A2A30] shadow-2xl backdrop-blur-md text-xs font-mono transform -translate-x-1/2 -translate-y-full -mt-2 space-y-1"
          style={{ left: tooltipPos.x, top: tooltipPos.y }}
        >
          <div className="flex items-center justify-between gap-3 border-b border-[#1F1F23] pb-1">
            <span className="text-white font-bold">
              Position #{hoveredCell.position} (Byte {Math.floor(hoveredCell.position / 2)})
            </span>
            <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold">
              Glyph: 0x{hoveredCell.char}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px] pt-0.5">
            <span className="text-[#8E9299]">Occurrence Count:</span>
            <span className="text-white font-bold text-right">
              {hoveredCell.count} / {totalTokens}
            </span>

            <span className="text-[#8E9299]">Observed Freq:</span>
            <span className="text-cyan-300 font-bold text-right">
              {(hoveredCell.frequency * 100).toFixed(2)}%
            </span>

            <span className="text-[#8E9299]">Expected Freq:</span>
            <span className="text-[#8E9299] text-right">6.25% (1/16)</span>

            <span className="text-[#8E9299]">Z-Score Dev:</span>
            <span
              className={`font-bold text-right ${
                hoveredCell.zScore > 1.5
                  ? "text-amber-400"
                  : hoveredCell.zScore < -1.5
                  ? "text-blue-400"
                  : "text-green-400"
              }`}
            >
              {hoveredCell.zScore > 0 ? "+" : ""}
              {hoveredCell.zScore.toFixed(2)}σ
            </span>
          </div>

          <div className="text-[10px] text-[#666672] pt-1 border-t border-[#1F1F23]">
            Click to inspect tokens with 0x{hoveredCell.char} at #{hoveredCell.position}
          </div>
        </div>
      )}

      {/* Visual Color Scale Gradient Legend Bar */}
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3 text-[11px] font-mono text-[#8E9299] px-2">
        <div className="flex items-center gap-2">
          <span>Density Scale ({metricType}):</span>
          <div className="flex items-center gap-1.5">
            <span className="text-xs">
              {metricType === "count"
                ? `${minVal}`
                : metricType === "frequency"
                ? `${(minVal * 100).toFixed(1)}%`
                : `${minVal.toFixed(1)}σ`}
            </span>
            <div
              className="h-2.5 w-32 rounded-full border border-[#1F1F23]"
              style={{
                background:
                  colorTheme === "quantum_viridis"
                    ? "linear-gradient(to right, #440154, #21918c, #fde725)"
                    : colorTheme === "neon_inferno"
                    ? "linear-gradient(to right, #000004, #bb3754, #fcffa4)"
                    : colorTheme === "plasma_matrix"
                    ? "linear-gradient(to right, #0d0887, #cc4778, #f0f921)"
                    : "linear-gradient(to right, #30123b, #1ae4b6, #e1dc32, #7a0403)",
              }}
            />
            <span className="text-xs text-white font-bold">
              {metricType === "count"
                ? `${maxVal}`
                : metricType === "frequency"
                ? `${(maxVal * 100).toFixed(1)}%`
                : `${maxVal.toFixed(1)}σ`}
            </span>
          </div>
        </div>

        {selectedTokenSignature && (
          <div className="flex items-center gap-1.5 text-cyan-300">
            <span className="inline-block w-3 h-0.5 border-b-2 border-dashed border-white" />
            <span>Active Token Trajectory (Tracing 64 Nibbles)</span>
          </div>
        )}

        <div className="text-[10px] text-[#666672]">
          Matrix: 64 Positions × 16 Hex Glyphs (1,024 Discrete State Cells)
        </div>
      </div>
    </div>
  );
};
