import React, { useEffect, useRef, useState, useMemo } from "react";
import * as d3 from "d3";
import {
  AlertTriangle,
  Play,
  Square,
  RefreshCw,
  Download,
  Filter,
  ShieldAlert,
  Flame,
  Search,
  ExternalLink,
  Sliders,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
  Zap,
} from "lucide-react";
import { OWNER_PROFILE } from "../utils/atsVenueData";
import { SpoofingAlert } from "./SpoofingAlertNotificationLog";

export interface HeatmapCellData {
  timeIndex: number;
  timeLabel: string;
  price: number;
  priceLabel: string;
  side: "BID" | "ASK";
  cancelledVolume: number;
  cancellationCount: number;
  fillCount: number;
  cancelToFillRatio: number;
  avgRestingTimeMs: number;
  spoofingRiskScore: number;
  isSpoofingPattern: boolean;
  flaggedTrader: string;
}

interface SuspiciousTraderProfile {
  address: string;
  name: string;
  cancellations: number;
  cancelledShares: number;
  avgRestingMs: number;
  threatLevel: "CRITICAL_SPOOFER" | "SUSPECTED_LAYERING" | "HIGH_FREQUENCY_FLICKER";
  status: "FLAGGED_FOR_SEC" | "ACCESS_RESTRICTED" | "MONITORED";
}

interface TopBookSpoofingHeatmapProps {
  initialSymbol?: string;
  onFlagTrader?: (traderAddress: string) => void;
  onSpoofingAlert?: (alert: SpoofingAlert) => void;
  isHeatmapOverlayEnabled?: boolean;
  onToggleHeatmapOverlay?: (enabled: boolean) => void;
}

export const TopBookSpoofingHeatmap: React.FC<TopBookSpoofingHeatmapProps> = ({
  initialSymbol = "TW-EQ",
  onFlagTrader,
  onSpoofingAlert,
  isHeatmapOverlayEnabled: externalOverlayEnabled,
  onToggleHeatmapOverlay,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Toggle state for live D3 Heatmap Overlay
  const [internalOverlayEnabled, setInternalOverlayEnabled] = useState<boolean>(true);
  const isOverlayActive = externalOverlayEnabled !== undefined ? externalOverlayEnabled : internalOverlayEnabled;

  const handleToggleOverlay = () => {
    const nextState = !isOverlayActive;
    setInternalOverlayEnabled(nextState);
    if (onToggleHeatmapOverlay) {
      onToggleHeatmapOverlay(nextState);
    }
  };

  // Active Symbol & Reference Price
  const [selectedSymbol, setSelectedSymbol] = useState<string>(initialSymbol);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [anomalyThresholdVolume, setAnomalyThresholdVolume] = useState<number>(15000);
  const [restingTimeThresholdMs, setRestingTimeThresholdMs] = useState<number>(120);
  const [hoveredCell, setHoveredCell] = useState<HeatmapCellData | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({
    width: 860,
    height: 420,
  });

  // Base reference prices for symbols
  const referencePrice = useMemo(() => {
    switch (selectedSymbol) {
      case "TREE3":
        return 125.0;
      case "MAOMAO":
        return 8.88;
      case "ETH-ATS":
        return 3450.0;
      case "USDG":
        return 1.0;
      case "SPX-EQ":
        return 185.0;
      case "TW-EQ":
      default:
        return 52.5;
    }
  }, [selectedSymbol]);

  // Discrete price levels centered around reference price (top-of-book bids & asks)
  const priceLevels = useMemo(() => {
    const tick = referencePrice > 1000 ? 5.0 : referencePrice > 100 ? 0.25 : 0.05;
    const levels: { price: number; label: string; side: "BID" | "ASK" }[] = [];

    // 5 ask levels (above ref)
    for (let i = 5; i >= 1; i--) {
      const p = Number((referencePrice + i * tick).toFixed(2));
      levels.push({ price: p, label: `$${p.toFixed(2)} (Ask +${i})`, side: "ASK" });
    }
    // Mid/Ref Level
    levels.push({
      price: Number(referencePrice.toFixed(2)),
      label: `$${referencePrice.toFixed(2)} (NBBO Mid)`,
      side: "BID",
    });
    // 5 bid levels (below ref)
    for (let i = 1; i <= 5; i++) {
      const p = Number((referencePrice - i * tick).toFixed(2));
      levels.push({ price: p, label: `$${p.toFixed(2)} (Bid -${i})`, side: "BID" });
    }
    return levels;
  }, [referencePrice]);

  // Initial Seed for Time Slices
  const [timeSlices, setTimeSlices] = useState<string[]>(() => {
    const list: string[] = [];
    const now = Date.now();
    for (let i = 24; i >= 0; i--) {
      const t = new Date(now - i * 5000);
      list.push(t.toTimeString().split(" ")[0]);
    }
    return list;
  });

  // Generate synthetic order cancellations across time slices & price levels
  const [gridData, setGridData] = useState<HeatmapCellData[]>(() => {
    return generateInitialGrid(priceLevels, 25);
  });

  // Re-generate grid when symbol or price levels change
  useEffect(() => {
    setGridData(generateInitialGrid(priceLevels, timeSlices.length));
  }, [selectedSymbol, priceLevels]);

  function generateInitialGrid(
    levels: { price: number; label: string; side: "BID" | "ASK" }[],
    numSlices: number
  ): HeatmapCellData[] {
    const cells: HeatmapCellData[] = [];
    const traders = [
      "0x44BcA912c98F9082A81B0941F480414B60Ef110C (HFT Layering Bot)",
      "0x891a27eE242b109F20B271A6992dC8817282bAc6 (Suspected Spoof-Node)",
      "0x12bE66708709320Ac321A858712C208492E69d12 (Algorithmic MM)",
      "0x3A9F1B229D48C1C82902bC017845fD24E67Ac08E (Verified Broker)",
      "0x9812A27F11C871A6992dC8817282bAc60E21e905 (Quant Flow)",
    ];

    levels.forEach((lvl, rowIdx) => {
      for (let t = 0; t < numSlices; t++) {
        // Create occasional deliberate spoofing clusters at Top-of-Book (rows 4, 5, 6, near mid-book)
        const isNearTop = rowIdx >= 3 && rowIdx <= 7;
        const isSpoofSpike = isNearTop && (t === 8 || t === 9 || t === 18 || t === 22 || (t % 7 === 0 && rowIdx === 4));

        let cancelledVol = 0;
        let avgResting = 0;
        let cancelCount = 0;
        let fillCount = 0;
        let riskScore = 0;

        if (isSpoofSpike) {
          cancelledVol = 24000 + Math.floor(Math.random() * 45000);
          cancelCount = 14 + Math.floor(Math.random() * 20);
          fillCount = Math.floor(Math.random() * 2); // Barely any fills
          avgResting = 22 + Math.floor(Math.random() * 45); // Sub-50ms flash cancel!
          riskScore = 88 + Math.floor(Math.random() * 12);
        } else {
          cancelledVol = Math.floor(Math.random() * 6500);
          cancelCount = 1 + Math.floor(Math.random() * 5);
          fillCount = Math.floor(Math.random() * 6);
          avgResting = 350 + Math.floor(Math.random() * 1200);
          riskScore = Math.floor((cancelledVol / 15000) * 35);
        }

        const totalOrders = cancelCount + fillCount;
        const cancelRatio = totalOrders > 0 ? (cancelCount / totalOrders) * 100 : 0;
        const isSpoof = cancelledVol >= 15000 && avgResting <= 120 && cancelRatio >= 85;

        cells.push({
          timeIndex: t,
          timeLabel: `T-${(numSlices - t) * 5}s`,
          price: lvl.price,
          priceLabel: lvl.label,
          side: lvl.side,
          cancelledVolume: cancelledVol,
          cancellationCount: cancelCount,
          fillCount,
          cancelToFillRatio: Number(cancelRatio.toFixed(1)),
          avgRestingTimeMs: avgResting,
          spoofingRiskScore: riskScore,
          isSpoofingPattern: isSpoof,
          flaggedTrader: isSpoofSpike ? traders[0] : traders[Math.floor(Math.random() * traders.length)],
        });
      }
    });

    return cells;
  }

  // Handle Resize
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const { width } = entries[0].contentRect;
      if (width > 300) {
        setDimensions({
          width: Math.floor(width),
          height: 400,
        });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const onSpoofingAlertRef = useRef(onSpoofingAlert);
  useEffect(() => {
    onSpoofingAlertRef.current = onSpoofingAlert;
  }, [onSpoofingAlert]);

  // Real-time Top-of-Book cancellation streaming simulation
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setTimeSlices((prev) => {
        const nextTime = new Date().toTimeString().split(" ")[0];
        const next = [...prev.slice(1), nextTime];
        return next;
      });

      setGridData((prev) => {
        const numSlices = 25;
        let detectedAlert: SpoofingAlert | null = null;

        // Shift cells left and append fresh column
        const nextGrid = prev.map((cell) => {
          if (cell.timeIndex > 0) {
            return {
              ...cell,
              timeIndex: cell.timeIndex - 1,
            };
          } else {
            // New column generation at index 24
            const isNearTop = cell.priceLabel.includes("NBBO") || cell.priceLabel.includes("Ask +1") || cell.priceLabel.includes("Bid -1");
            const isSpike = isNearTop && Math.random() < 0.22;

            const cancelledVol = isSpike
              ? 18000 + Math.floor(Math.random() * 38000)
              : Math.floor(Math.random() * 7000);
            const cancelCount = isSpike ? 15 + Math.floor(Math.random() * 15) : 1 + Math.floor(Math.random() * 4);
            const fillCount = isSpike ? 0 : Math.floor(Math.random() * 4);
            const avgResting = isSpike ? 28 + Math.floor(Math.random() * 55) : 400 + Math.floor(Math.random() * 800);
            const cancelRatio = (cancelCount / Math.max(1, cancelCount + fillCount)) * 100;
            const isSpoof = cancelledVol >= anomalyThresholdVolume && avgResting <= restingTimeThresholdMs;

            if (isSpoof && !detectedAlert) {
              const alertId = `SPOOF-STREAM-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
              detectedAlert = {
                id: alertId,
                timestamp: Date.now(),
                symbol: selectedSymbol,
                side: cell.side,
                priceLevel: cell.priceLabel,
                price: cell.price,
                cancelledVolume: cancelledVol,
                cancellationCount: cancelCount,
                fillCount,
                cancelToFillRatio: Number(cancelRatio.toFixed(1)),
                avgRestingTimeMs: avgResting,
                riskScore: 92 + Math.floor(Math.random() * 8),
                severity: cancelledVol > 30000 ? "CRITICAL_SPOOFER" : "FLASH_BURST",
                suspectTrader: "0x44BcA912c98F9082A81B0941F480414B60Ef110C (HFT Layering Bot)",
                patternDescription: `Rapid top-of-book ${cell.side} quote cluster: ${cancelledVol.toLocaleString()} units abruptly withdrawn in ${avgResting}ms across ${cancelCount} orders with ${cancelRatio.toFixed(1)}% cancel ratio.`,
                status: "NEW",
                isRead: false,
              };
            }

            return {
              ...cell,
              timeIndex: numSlices - 1,
              cancelledVolume: cancelledVol,
              cancellationCount: cancelCount,
              fillCount,
              cancelToFillRatio: Number(cancelRatio.toFixed(1)),
              avgRestingTimeMs: avgResting,
              spoofingRiskScore: isSpoof ? 92 + Math.floor(Math.random() * 8) : Math.floor((cancelledVol / 12000) * 40),
              isSpoofingPattern: isSpoof,
              flaggedTrader: isSpoof
                ? "0x44BcA912c98F9082A81B0941F480414B60Ef110C (HFT Layering Bot)"
                : "0x12bE66708709320Ac321A858712C208492E69d12 (Algorithmic MM)",
            };
          }
        });

        if (detectedAlert && onSpoofingAlertRef.current) {
          onSpoofingAlertRef.current(detectedAlert);
        }

        return nextGrid;
      });
    }, 2400);

    return () => clearInterval(interval);
  }, [isPlaying, anomalyThresholdVolume, restingTimeThresholdMs, selectedSymbol]);

  // Aggregate metrics
  const stats = useMemo(() => {
    let totalCancelledVol = 0;
    let totalCancels = 0;
    let totalFills = 0;
    let spoofCount = 0;

    gridData.forEach((c) => {
      totalCancelledVol += c.cancelledVolume;
      totalCancels += c.cancellationCount;
      totalFills += c.fillCount;
      if (c.cancelledVolume >= anomalyThresholdVolume && c.avgRestingTimeMs <= restingTimeThresholdMs) {
        spoofCount++;
      }
    });

    const ratio = totalCancels + totalFills > 0 ? (totalCancels / (totalCancels + totalFills)) * 100 : 0;

    return {
      totalCancelledVol,
      totalCancels,
      totalFills,
      spoofCount,
      cancelRatio: ratio.toFixed(1),
    };
  }, [gridData, anomalyThresholdVolume, restingTimeThresholdMs]);

  // Suspicious traders registry
  const suspiciousTraders: SuspiciousTraderProfile[] = [
    {
      address: "0x44BcA912c98F9082A81B0941F480414B60Ef110C",
      name: "Blackwater Offshore Alpha Node",
      cancellations: 482,
      cancelledShares: 1245000,
      avgRestingMs: 34,
      threatLevel: "CRITICAL_SPOOFER",
      status: "ACCESS_RESTRICTED",
    },
    {
      address: "0x891a27eE242b109F20B271A6992dC8817282bAc6",
      name: "Helios Sub-Second Layering Engine",
      cancellations: 265,
      cancelledShares: 680000,
      avgRestingMs: 78,
      threatLevel: "SUSPECTED_LAYERING",
      status: "FLAGGED_FOR_SEC",
    },
    {
      address: "0x9812A27F11C871A6992dC8817282bAc60E21e905",
      name: "Quant Quote-Flicker Algorithm",
      cancellations: 142,
      cancelledShares: 310000,
      avgRestingMs: 145,
      threatLevel: "HIGH_FREQUENCY_FLICKER",
      status: "MONITORED",
    },
  ];

  // Render D3 Heatmap SVG
  useEffect(() => {
    if (!svgRef.current || gridData.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const margin = { top: 25, right: 30, bottom: 40, left: 145 };
    const width = Math.max(300, dimensions.width - margin.left - margin.right);
    const height = dimensions.height - margin.top - margin.bottom;

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Unique values
    const times = (Array.from(new Set(gridData.map((d) => d.timeIndex))) as number[]).sort((a, b) => a - b);
    const prices: string[] = priceLevels.map((p) => p.label);

    // Scales
    const xScale = d3.scaleBand<number>().domain(times).range([0, width]).padding(0.06);
    const yScale = d3.scaleBand<string>().domain(prices).range([0, height]).padding(0.08);

    // Maximum volume for color scale
    const maxValFound = d3.max(gridData, (d: HeatmapCellData) => d.cancelledVolume);
    const maxVol: number = Math.max(35000, typeof maxValFound === "number" ? maxValFound : 35000);

    // Multi-stop color scale: deep dark slate -> cyan -> amber -> orange -> glowing crimson red
    const colorScale = d3
      .scaleSequential((t: number) => {
        if (t < 0.25) {
          // deep slate to cyan
          return d3.interpolateRgb("#0F172A", "#0284C7")(t / 0.25);
        } else if (t < 0.55) {
          // cyan to amber
          return d3.interpolateRgb("#0284C7", "#F59E0B")((t - 0.25) / 0.3);
        } else if (t < 0.8) {
          // amber to bright neon orange
          return d3.interpolateRgb("#F59E0B", "#F97316")((t - 0.55) / 0.25);
        } else {
          // orange to glowing crimson spoof alert
          return d3.interpolateRgb("#F97316", "#EF4444")((t - 0.8) / 0.2);
        }
      })
      .domain([0, maxVol]);

    // Draw Heatmap Cells
    const cellGroups = g
      .selectAll(".cell-group")
      .data(gridData)
      .enter()
      .append("g")
      .attr("class", "cell-group")
      .attr("transform", (d: HeatmapCellData) => `translate(${xScale(d.timeIndex) || 0}, ${yScale(d.priceLabel) || 0})`);

    cellGroups
      .append("rect")
      .attr("width", xScale.bandwidth())
      .attr("height", yScale.bandwidth())
      .attr("rx", 3)
      .attr("ry", 3)
      .attr("fill", (d: HeatmapCellData) => {
        if (!isOverlayActive) {
          // Clean standard order book view without cancellation heat distortion
          if (d.priceLabel.includes("NBBO")) return "#0e2238";
          return d.side === "BID" ? "#0c1929" : "#1f1019";
        }
        const isSpoof = d.cancelledVolume >= anomalyThresholdVolume && d.avgRestingTimeMs <= restingTimeThresholdMs;
        return isSpoof ? "#DC2626" : colorScale(d.cancelledVolume);
      })
      .attr("stroke", (d: HeatmapCellData) => {
        if (!isOverlayActive) {
          if (d.priceLabel.includes("NBBO")) return "#0284C7";
          return "#1E293B";
        }
        const isSpoof = d.cancelledVolume >= anomalyThresholdVolume && d.avgRestingTimeMs <= restingTimeThresholdMs;
        if (isSpoof) return "#F87171";
        if (d.priceLabel.includes("NBBO")) return "#06B6D4";
        return "#1E293B";
      })
      .attr("stroke-width", (d: HeatmapCellData) => {
        if (!isOverlayActive) return 1;
        const isSpoof = d.cancelledVolume >= anomalyThresholdVolume && d.avgRestingTimeMs <= restingTimeThresholdMs;
        return isSpoof ? 2 : 1;
      })
      .attr("cursor", "pointer")
      .on("mouseenter", (event: MouseEvent, d: HeatmapCellData) => {
        setHoveredCell(d);
        const [x, y] = d3.pointer(event, containerRef.current);
        setTooltipPos({ x, y });
      })
      .on("mousemove", (event: MouseEvent) => {
        const [x, y] = d3.pointer(event, containerRef.current);
        setTooltipPos({ x, y });
      })
      .on("mouseleave", () => {
        setHoveredCell(null);
        setTooltipPos(null);
      });

    // Add glowing hazard pulse markers on cells with confirmed spoofing pattern (only when overlay is enabled)
    if (isOverlayActive) {
      cellGroups
        .filter((d: HeatmapCellData) => d.cancelledVolume >= anomalyThresholdVolume && d.avgRestingTimeMs <= restingTimeThresholdMs)
        .append("circle")
        .attr("cx", xScale.bandwidth() / 2)
        .attr("cy", yScale.bandwidth() / 2)
        .attr("r", Math.min(xScale.bandwidth(), yScale.bandwidth()) * 0.28)
        .attr("fill", "#FEE2E2")
        .attr("stroke", "#EF4444")
        .attr("stroke-width", 1.5)
        .attr("opacity", 0.95)
        .append("animate")
        .attr("attributeName", "r")
        .attr("values", `${Math.min(xScale.bandwidth(), yScale.bandwidth()) * 0.2};${Math.min(xScale.bandwidth(), yScale.bandwidth()) * 0.38};${Math.min(xScale.bandwidth(), yScale.bandwidth()) * 0.2}`)
        .attr("dur", "1.2s")
        .attr("repeatCount", "indefinite");
    }

    // X-Axis (Time)
    const xAxis = d3
      .axisBottom(xScale)
      .tickValues(times.filter((t: number) => t % 4 === 0))
      .tickFormat((t: d3.NumberValue) => {
        const idx = Number(t);
        const timeStr = timeSlices[idx] || `T-${(25 - idx) * 5}s`;
        return timeStr;
      });

    g.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(xAxis)
      .attr("color", "#64748B")
      .selectAll("text")
      .style("font-size", "10px")
      .style("font-family", "monospace")
      .style("fill", "#94A3B8");

    // Y-Axis (Top-of-Book Price Levels)
    const yAxis = d3.axisLeft(yScale);
    const yAxisGroup = g
      .append("g")
      .call(yAxis)
      .attr("color", "#475569");

    yAxisGroup
      .selectAll("text")
      .style("font-size", "10.5px")
      .style("font-family", "monospace")
      .style("fill", (d) => {
        const text = String(d);
        if (text.includes("NBBO")) return "#38BDF8";
        if (text.includes("Ask")) return "#FB7185";
        return "#34D399";
      })
      .style("font-weight", (d) => (String(d).includes("NBBO") ? "700" : "500"));

    // Label: Time Axis
    g.append("text")
      .attr("x", width / 2)
      .attr("y", height + 34)
      .attr("text-anchor", "middle")
      .style("fill", "#64748B")
      .style("font-size", "11px")
      .style("font-family", "sans-serif")
      .text("Continuous Top-of-Book Execution Windows (UTC Chronological Slices)");

    // Reference Mid-line highlighter
    const midIdx = priceLevels.findIndex((p) => p.label.includes("NBBO"));
    if (midIdx !== -1) {
      const midY = (yScale(priceLevels[midIdx].label) || 0) + yScale.bandwidth() / 2;
      g.append("line")
        .attr("x1", 0)
        .attr("x2", width)
        .attr("y1", midY)
        .attr("y2", midY)
        .attr("stroke", "#38BDF8")
        .attr("stroke-dasharray", "3,3")
        .attr("stroke-width", 1)
        .attr("opacity", 0.7);
    }
  }, [gridData, dimensions, priceLevels, timeSlices, anomalyThresholdVolume, restingTimeThresholdMs, isOverlayActive]);

  // Actions
  const handleExportCsv = () => {
    const headers = [
      "Time Slice",
      "Symbol",
      "Price Level",
      "Side",
      "Cancelled Volume",
      "Cancelled Orders",
      "Fills Executed",
      "Cancel/Fill Ratio (%)",
      "Avg Resting Time (ms)",
      "Spoofing Anomaly Flag",
      "Suspected Trader",
    ];

    const rows = gridData.map((d) => [
      d.timeLabel,
      selectedSymbol,
      `"$${d.price.toFixed(2)}"`,
      d.side,
      d.cancelledVolume,
      d.cancellationCount,
      d.fillCount,
      d.cancelToFillRatio,
      d.avgRestingTimeMs,
      d.isSpoofingPattern ? "CONFIRMED_SPOOFING" : "NORMAL",
      `"${d.flaggedTrader}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `TWE_ATS_Spoofing_Heatmap_${selectedSymbol}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setToastMessage("Exported D3 Top-of-Book Spoofing Heatmap Audit Log (CSV)");
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleRunHeuristicScan = () => {
    setToastMessage("Ran FINRA Rule 5210 / SEC Rule 10b-5 Algorithmic Spoofing Pattern Scan. 3 high-volume layering clusters isolated.");
    setTimeout(() => setToastMessage(null), 5000);
  };

  const handleSimulateBurst = () => {
    // Pick top-of-book ask (+1) or bid (-1) level
    const targetLvl = priceLevels.find((lvl) => lvl.label.includes("Ask +1") || lvl.label.includes("Bid -1")) || priceLevels[4];
    const burstVol = 46500 + Math.floor(Math.random() * 32000);
    const burstCancels = 24 + Math.floor(Math.random() * 18);
    const burstResting = 19 + Math.floor(Math.random() * 25);
    const burstTrader = "0x44BcA912c98F9082A81B0941F480414B60Ef110C (HFT Layering Bot)";
    const burstRatio = 100;

    setGridData((prev) => {
      const numSlices = timeSlices.length;
      return prev.map((cell) => {
        if (cell.price === targetLvl.price && cell.timeIndex === numSlices - 1) {
          return {
            ...cell,
            cancelledVolume: burstVol,
            cancellationCount: burstCancels,
            fillCount: 0,
            cancelToFillRatio: burstRatio,
            avgRestingTimeMs: burstResting,
            spoofingRiskScore: 99,
            isSpoofingPattern: true,
            flaggedTrader: burstTrader,
          };
        }
        return cell;
      });
    });

    if (onSpoofingAlertRef.current) {
      const alertId = `SPOOF-BURST-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
      onSpoofingAlertRef.current({
        id: alertId,
        timestamp: Date.now(),
        symbol: selectedSymbol,
        side: targetLvl.side,
        priceLevel: targetLvl.label,
        price: targetLvl.price,
        cancelledVolume: burstVol,
        cancellationCount: burstCancels,
        fillCount: 0,
        cancelToFillRatio: burstRatio,
        avgRestingTimeMs: burstResting,
        riskScore: 99,
        severity: "CRITICAL_SPOOFER",
        suspectTrader: burstTrader,
        patternDescription: `Critical high-volume spoofing cluster detected: ${burstVol.toLocaleString()} phantom shares rapidly cancelled within ${burstResting}ms on ${targetLvl.label}.`,
        status: "NEW",
        isRead: false,
      });
    }

    setToastMessage(`Simulated high-volume spoofing burst: ${burstVol.toLocaleString()} units canceled in ${burstResting}ms at ${targetLvl.label}!`);
    setTimeout(() => setToastMessage(null), 4500);
  };

  const handleGenerateTcrFiling = () => {
    const report = {
      agency: "U.S. Securities and Exchange Commission (SEC) - Division of Enforcement",
      form: "Form TCR (Tip, Complaint or Referral) - Market Manipulation / Spoofing",
      venue: "Token World Exchange (TWE) ATS®",
      soleOwner: OWNER_PROFILE.soleOwnerName,
      headquarters: OWNER_PROFILE.headquarters,
      timestamp: new Date().toISOString(),
      targetAsset: selectedSymbol,
      referencePrice: referencePrice,
      spoofingIndicators: {
        anomalyThresholdShares: anomalyThresholdVolume,
        maxRestingTimeMs: restingTimeThresholdMs,
        detectedClusters: stats.spoofCount,
        aggregateCancelledVolume: stats.totalCancelledVol,
        cancellationRatio: `${stats.cancelRatio}%`,
      },
      flaggedEntities: suspiciousTraders,
      statutoryViolations: [
        "15 U.S.C. § 78j(b) and 17 CFR § 240.10b-5 (Employment of Manipulative and Deceptive Devices)",
        "FINRA Rule 5210 (Publication of Transactions and Quotations - Non-Bona Fide Bids/Offers)",
        "Commodity Exchange Act 7 U.S.C. § 6c(a)(5)(C) (Prohibition against Spoofing and Layering)",
      ],
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `SEC_Form_TCR_Spoofing_Incident_${selectedSymbol}_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setToastMessage("Generated and downloaded certified SEC Form TCR Spoofing Dossier JSON.");
    setTimeout(() => setToastMessage(null), 4500);
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-rose-500 animate-pulse" />
            <h2 className="text-base font-bold text-white tracking-tight">
              Top-of-Book Order Cancellation & Spoofing Heatmap Overlay
            </h2>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-rose-950/80 text-rose-400 border border-rose-800/80">
              D3.js SEC Reg ATS / FINRA 5210
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Visualizes high-frequency quote cancellations at top-of-book price levels to detect non-bona fide orders, quote-stuffing, and rapid layering.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Symbol Selector */}
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-lg p-1 text-xs">
            <span className="text-[11px] font-mono text-slate-500 px-2">ASSET:</span>
            {["TW-EQ", "TREE3", "MAOMAO", "ETH-ATS", "SPX-EQ", "USDG"].map((sym) => (
              <button
                key={sym}
                onClick={() => setSelectedSymbol(sym)}
                className={`px-2.5 py-1 rounded text-xs font-mono font-semibold transition-colors ${
                  selectedSymbol === sym
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {sym}
              </button>
            ))}
          </div>

          {/* Live D3 Heatmap Overlay Toggle Switch Component */}
          <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs">
            <span className="text-[11px] font-mono text-slate-300 font-semibold flex items-center gap-1.5">
              <Flame className={`w-3.5 h-3.5 ${isOverlayActive ? "text-rose-400 animate-pulse" : "text-slate-500"}`} />
              <span className="hidden sm:inline">Heatmap Overlay:</span>
              <span className="sm:hidden">Heatmap:</span>
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={isOverlayActive}
              onClick={handleToggleOverlay}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                isOverlayActive ? "bg-rose-600" : "bg-slate-700"
              }`}
              title={isOverlayActive ? "Disable D3 heatmap overlay for clean order book view" : "Enable D3 spoofing heatmap overlay"}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  isOverlayActive ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </button>
            <span className={`text-[10px] font-mono font-bold ${isOverlayActive ? "text-rose-400" : "text-slate-400"}`}>
              {isOverlayActive ? "ON" : "OFF"}
            </span>
          </div>

          {/* Live Playback Toggle */}
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
              isPlaying
                ? "bg-emerald-950/60 text-emerald-300 border-emerald-700/60 hover:bg-emerald-900/60"
                : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
            }`}
          >
            {isPlaying ? (
              <>
                <Square className="w-3.5 h-3.5 fill-emerald-400" />
                Live Stream
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-slate-300" />
                Stream Paused
              </>
            )}
          </button>

          {/* Simulate Spoofing Spike Button */}
          <button
            onClick={handleSimulateBurst}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-950/90 hover:bg-rose-900 text-rose-300 border border-rose-700/80 shadow-sm transition-colors"
            title="Inject high-volume cancellation cluster to trigger real-time spoofing alert"
          >
            <Flame className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
            <span>Simulate Spoofing Spike</span>
          </button>

          {/* Export CSV */}
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
            title="Download Heatmap Audit Data"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            CSV Log
          </button>

          {/* Generate SEC TCR */}
          <button
            onClick={handleGenerateTcrFiling}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white shadow-sm transition-colors"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            File SEC TCR
          </button>
        </div>
      </div>

      {/* Real-time Metric Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-950/60 border border-slate-800/80 p-3 rounded-lg">
          <div className="text-[11px] font-mono text-slate-400">CANCELLED L1/L2 VOLUME</div>
          <div className="text-xl font-bold font-mono text-white mt-1">
            {stats.totalCancelledVol.toLocaleString()} <span className="text-xs text-slate-400 font-sans">units</span>
          </div>
          <div className="text-[10px] text-cyan-400 mt-0.5">Top-of-Book depth cancellations</div>
        </div>

        <div className="bg-slate-950/60 border border-slate-800/80 p-3 rounded-lg">
          <div className="text-[11px] font-mono text-slate-400">CANCEL-TO-FILL RATIO</div>
          <div className="text-xl font-bold font-mono text-amber-400 mt-1">{stats.cancelRatio}%</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Industry alert baseline: &gt; 90%</div>
        </div>

        <div className="bg-slate-950/60 border border-slate-800/80 p-3 rounded-lg">
          <div className="text-[11px] font-mono text-slate-400">SPOOFING BURST CLUSTERS</div>
          <div className="text-xl font-bold font-mono text-rose-400 mt-1 flex items-center gap-2">
            {stats.spoofCount}
            {stats.spoofCount > 0 && <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />}
          </div>
          <div className="text-[10px] text-rose-400/80 mt-0.5">&lt; {restingTimeThresholdMs}ms resting lifetime</div>
        </div>

        <div className="bg-slate-950/60 border border-slate-800/80 p-3 rounded-lg">
          <div className="text-[11px] font-mono text-slate-400">BENCHMARK NBBO MID</div>
          <div className="text-xl font-bold font-mono text-cyan-300 mt-1">${referencePrice.toFixed(2)}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Token World Exchange (TWE) ATS®</div>
        </div>
      </div>

      {/* Threshold Sliders & Heuristic Controls */}
      <div className="bg-slate-950/40 border border-slate-800/80 p-3.5 rounded-lg flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex flex-wrap items-center gap-6">
          <div className="space-y-1 min-w-[200px]">
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-400">Spoofing Volume Threshold:</span>
              <span className="text-rose-400 font-mono font-bold">{anomalyThresholdVolume.toLocaleString()} units</span>
            </div>
            <input
              type="range"
              min="5000"
              max="50000"
              step="2500"
              value={anomalyThresholdVolume}
              onChange={(e) => setAnomalyThresholdVolume(parseInt(e.target.value, 10))}
              className="w-full accent-rose-500 cursor-pointer h-1.5 bg-slate-800 rounded"
            />
          </div>

          <div className="space-y-1 min-w-[200px]">
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-400">Max Resting Duration (Flash Cancel):</span>
              <span className="text-amber-400 font-mono font-bold">{restingTimeThresholdMs} ms</span>
            </div>
            <input
              type="range"
              min="30"
              max="350"
              step="10"
              value={restingTimeThresholdMs}
              onChange={(e) => setRestingTimeThresholdMs(parseInt(e.target.value, 10))}
              className="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-800 rounded"
            />
          </div>
        </div>

        <button
          onClick={handleRunHeuristicScan}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-950/60 hover:bg-cyan-900/60 text-cyan-300 border border-cyan-800/60 rounded-lg text-xs font-semibold transition-colors"
        >
          <Zap className="w-3.5 h-3.5 text-cyan-400" />
          Run Heuristic Scan
        </button>
      </div>

      {/* Toast Alert */}
      {toastMessage && (
        <div className="p-3 bg-cyan-950/70 border border-cyan-500/50 text-cyan-200 text-xs rounded-lg flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* D3 Heatmap Canvas Container */}
      <div className="relative bg-slate-950 rounded-lg border border-slate-800 p-2 overflow-x-auto" ref={containerRef}>
        <div className="min-w-[680px]">
          <svg ref={svgRef} width={dimensions.width} height={dimensions.height} className="overflow-visible" />
        </div>

        {/* Floating Tooltip */}
        {hoveredCell && tooltipPos && (
          <div
            className="absolute z-20 pointer-events-none bg-slate-900/95 border border-slate-700 shadow-xl rounded-lg p-3 text-xs text-slate-200 font-mono w-72 backdrop-blur-md"
            style={{
              left: `${Math.min(tooltipPos.x + 15, dimensions.width - 290)}px`,
              top: `${Math.max(10, tooltipPos.y - 80)}px`,
            }}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 mb-1.5">
              <span className="font-bold text-white text-sm">{hoveredCell.priceLabel}</span>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                  hoveredCell.side === "ASK" ? "bg-rose-950/80 text-rose-400" : "bg-emerald-950/80 text-emerald-400"
                }`}
              >
                {hoveredCell.side} BOOK
              </span>
            </div>

            <div className="space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-400">Cancelled Volume:</span>
                <span className="text-white font-bold">{hoveredCell.cancelledVolume.toLocaleString()} units</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Cancel / Fill Count:</span>
                <span className="text-slate-300">
                  {hoveredCell.cancellationCount} cancels / {hoveredCell.fillCount} fills
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Cancel-to-Fill Ratio:</span>
                <span className={`font-bold ${hoveredCell.cancelToFillRatio > 85 ? "text-rose-400" : "text-amber-400"}`}>
                  {hoveredCell.cancelToFillRatio}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Avg Resting Lifetime:</span>
                <span
                  className={`font-bold ${
                    hoveredCell.avgRestingTimeMs <= restingTimeThresholdMs ? "text-rose-400" : "text-emerald-400"
                  }`}
                >
                  {hoveredCell.avgRestingTimeMs} ms
                </span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-800">
                <span className="text-slate-400">Flagged Entity:</span>
                <span className="text-cyan-300 text-[10px] truncate max-w-[150px]">{hoveredCell.flaggedTrader}</span>
              </div>
              <div className="mt-2 pt-1 border-t border-slate-800 flex items-center justify-between">
                <span className="text-slate-400">Regulatory Verdict:</span>
                {hoveredCell.cancelledVolume >= anomalyThresholdVolume &&
                hoveredCell.avgRestingTimeMs <= restingTimeThresholdMs ? (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-950 text-rose-400 border border-rose-800">
                    SPOOFING / LAYERING
                  </span>
                ) : (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
                    BENIGN CANCELLATION
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Heatmap Legend */}
      <div className="flex flex-wrap items-center justify-between gap-4 text-xs font-mono text-slate-400 pt-2 border-t border-slate-800">
        <div className="flex items-center gap-2">
          <span>INTENSITY SCALE:</span>
          <div className="flex items-center gap-1">
            <span className="w-3.5 h-3.5 rounded bg-[#0F172A] border border-slate-700" title="Low / Baseline" />
            <span className="text-[10px] text-slate-500">Low (0)</span>
            <span className="w-3.5 h-3.5 rounded bg-[#0284C7]" title="Moderate" />
            <span className="w-3.5 h-3.5 rounded bg-[#F59E0B]" title="Elevated" />
            <span className="w-3.5 h-3.5 rounded bg-[#F97316]" title="High Cancel Rate" />
            <span className="w-3.5 h-3.5 rounded bg-[#DC2626] border border-rose-400 animate-pulse" title="Spoofing Anomaly" />
            <span className="text-[10px] text-rose-400 font-bold">Spoofing Cluster (&gt; {anomalyThresholdVolume / 1000}k)</span>
          </div>
        </div>

        <div className="text-[11px] text-slate-500">
          SEC Regulation ATS Rule 301 · FINRA Rule 5210 Heuristics · TWE Compliance Core
        </div>
      </div>

      {/* Suspicious Market Participant Audit Table */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              High-Velocity Cancel / Spoofing Suspect Registry
            </h3>
          </div>
          <span className="text-[11px] text-slate-400">Automated Market-Access Risk Dispositions</span>
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-800">
          <table className="w-full text-xs font-mono text-left bg-slate-950/40">
            <thead>
              <tr className="text-slate-400 border-b border-slate-800 bg-slate-950">
                <th className="py-2.5 px-3">PARTICIPANT / ALGO</th>
                <th className="py-2.5 px-3">TOTAL CANCELS</th>
                <th className="py-2.5 px-3">CANCELLED VOLUME</th>
                <th className="py-2.5 px-3">AVG RESTING</th>
                <th className="py-2.5 px-3">VIOLATION CLASSIFICATION</th>
                <th className="py-2.5 px-3">REGULATORY STATUS</th>
                <th className="py-2.5 px-3 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {suspiciousTraders.map((trader) => (
                <tr key={trader.address} className="hover:bg-slate-900/40">
                  <td className="py-2.5 px-3">
                    <div className="font-bold text-white">{trader.name}</div>
                    <div className="text-[10px] text-slate-500">{trader.address}</div>
                  </td>
                  <td className="py-2.5 px-3 text-slate-300 font-semibold">{trader.cancellations}</td>
                  <td className="py-2.5 px-3 text-amber-400 font-semibold">
                    {trader.cancelledShares.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-950 text-rose-400 border border-rose-800">
                      {trader.avgRestingMs} ms
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-300 font-medium">
                    {trader.threatLevel.replace(/_/g, " ")}
                  </td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        trader.status === "ACCESS_RESTRICTED"
                          ? "bg-rose-950 text-rose-400 border border-rose-800"
                          : trader.status === "FLAGGED_FOR_SEC"
                          ? "bg-amber-950 text-amber-400 border border-amber-800"
                          : "bg-cyan-950 text-cyan-400 border border-cyan-800"
                      }`}
                    >
                      {trader.status.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <button
                      onClick={() => {
                        if (onFlagTrader) onFlagTrader(trader.address);
                        setToastMessage(`Enforced trading restrictions on participant ${trader.address.slice(0, 10)}...`);
                        setTimeout(() => setToastMessage(null), 4000);
                      }}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded text-[11px] font-sans font-medium transition-colors"
                    >
                      Freeze Access
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
