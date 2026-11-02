import { useState, useRef, useEffect } from "react";
import {
  Palette,
  Sparkles,
  Download,
  Share2,
  Copy,
  Check,
  RefreshCw,
  Eye,
  Layers,
  Sliders,
  Play,
  Pause,
  Rocket,
  Code2,
  ExternalLink,
  Shield,
  FileJson,
  Cpu,
  Orbit,
  Radio,
  Coins,
  Hexagon,
  Zap,
  Gauge,
} from "lucide-react";
import { TokenRecord } from "../types";
import { TokenImage } from "./TokenImage";
import {
  generateTokenNFTMetadata,
  computeSimulatedDeploymentStats,
} from "../utils/nftMetadataGenerator";

interface TokenArtVisualizerProps {
  tokens?: TokenRecord[];
  selectedToken?: TokenRecord | null;
  onSelectToken?: (token: TokenRecord) => void;
  onDeployToken?: (token: TokenRecord) => void;
}

type ArtStyleMode = "quantum_lattice" | "orbital_hologram" | "neural_mesh" | "depin_grid" | "holographic_coin";

interface ColorPalette {
  id: string;
  name: string;
  primary: string;
  secondary: string;
  accent: string;
  background: string;
}

const COLOR_PALETTES: ColorPalette[] = [
  {
    id: "amber_foundry",
    name: "Foundry Amber",
    primary: "#F27D26",
    secondary: "#FFB03A",
    accent: "#FF5722",
    background: "#0A0A0C",
  },
  {
    id: "cyber_neon",
    name: "Cyber Neon",
    primary: "#00F0FF",
    secondary: "#D946EF",
    accent: "#7000FF",
    background: "#060814",
  },
  {
    id: "quantum_emerald",
    name: "Quantum Emerald",
    primary: "#10B981",
    secondary: "#34D399",
    accent: "#064E3B",
    background: "#03120E",
  },
  {
    id: "solar_supernova",
    name: "Solar Flare",
    primary: "#F59E0B",
    secondary: "#EF4444",
    accent: "#DC2626",
    background: "#140707",
  },
  {
    id: "obsidian_stealth",
    name: "Obsidian Core",
    primary: "#E2E8F0",
    secondary: "#94A3B8",
    accent: "#38BDF8",
    background: "#08090A",
  },
];

export const TokenArtVisualizer = ({
  tokens = [],
  selectedToken: externalSelectedToken,
  onSelectToken,
  onDeployToken,
}: TokenArtVisualizerProps) => {
  // Current active token
  const defaultToken: TokenRecord = {
    id: "gns_genesis_01",
    name: "Genesis Protocol",
    symbol: "GNS",
    chain: "ethereum",
    networkId: 1,
    contractAddress: "0x5AFE742f53909748b61c927f805a8b7921de9C0RP",
    isVanity: true,
    contractArchetype: "Enterprise Transparent Upgradeable Proxy (EIP-1967)",
    isEnterprise: true,
    enterpriseSalt: "0x0000000000000000000000000000000000000000000000000000000000005afe",
    enterpriseTier: "Tier-1 Institutional",
    tokenId: "8947291847291847291847291847291847291847291847291847291847291847",
    tokenStandard: "ERC-20",
    narrative: "quantum_defi",
    launchStatus: "Deployed",
    initialSupply: "10000000",
    decimals: 18,
    marketCap: 45000000,
    priceUsd: 4.5,
    liquidityPair: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
    holderCount: 1420,
    auditFirm: "OpenZeppelin",
    securityScore: 99,
    createdAt: new Date().toISOString(),
    creationTx: "0x9812739812739812739812739812739812739812739812739812739812739812",
    deployerAddress: "0x5AFE48a2F594f8E619E63B09Cd4D64593C1fC891",
    quantum_entropy_signature: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  };

  const [currentToken, setCurrentToken] = useState<TokenRecord>(
    externalSelectedToken || (tokens.length > 0 ? tokens[0] : defaultToken)
  );

  useEffect(() => {
    if (externalSelectedToken) {
      setCurrentToken(externalSelectedToken);
    }
  }, [externalSelectedToken]);

  // Art Customization Parameters
  const [artStyle, setArtStyle] = useState<ArtStyleMode>("quantum_lattice");
  const [activePalette, setActivePalette] = useState<ColorPalette>(COLOR_PALETTES[0]);
  const [complexity, setComplexity] = useState<number>(64);
  const [isRotating, setIsRotating] = useState<boolean>(true);
  const [rotationSpeed, setRotationSpeed] = useState<number>(1);
  const [glowIntensity, setGlowIntensity] = useState<number>(80);
  const [seedSalt, setSeedSalt] = useState<number>(42);
  const [activeSubTab, setActiveSubTab] = useState<"canvas" | "metadata" | "gallery" | "svg">("canvas");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const angleRef = useRef<number>(0);

  // Simple copy helper
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Convert contract address into deterministic numeric array (entropy seeds)
  const getHashValues = (addr: string, salt: number): number[] => {
    const clean = addr.replace("0x", "").toLowerCase();
    const values: number[] = [];
    for (let i = 0; i < clean.length; i += 2) {
      const hex = clean.substring(i, i + 2);
      values.push((parseInt(hex, 16) + salt * (i + 1)) % 256);
    }
    return values;
  };

  // Main Generative Art Canvas Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const hashValues = getHashValues(currentToken.contractAddress, seedSalt);

    const render = () => {
      if (isRotating) {
        angleRef.current += 0.006 * rotationSpeed;
      }

      const width = canvas.width;
      const height = canvas.height;
      const cx = width / 2;
      const cy = height / 2;

      // 1. Background Fill with subtle radial gradient
      ctx.fillStyle = activePalette.background;
      ctx.fillRect(0, 0, width, height);

      const bgRadial = ctx.createRadialGradient(cx, cy, 10, cx, cy, width * 0.7);
      bgRadial.addColorStop(0, activePalette.accent + "18");
      bgRadial.addColorStop(1, "transparent");
      ctx.fillStyle = bgRadial;
      ctx.fillRect(0, 0, width, height);

      // Glow setup
      ctx.shadowBlur = (glowIntensity / 100) * 20;
      ctx.shadowColor = activePalette.primary;

      // 2. Draw based on Art Style Mode
      if (artStyle === "quantum_lattice") {
        drawQuantumLattice(ctx, cx, cy, hashValues);
      } else if (artStyle === "orbital_hologram") {
        drawOrbitalHologram(ctx, cx, cy, hashValues);
      } else if (artStyle === "neural_mesh") {
        drawNeuralMesh(ctx, cx, cy, hashValues);
      } else if (artStyle === "depin_grid") {
        drawDepinGrid(ctx, cx, cy, hashValues);
      } else if (artStyle === "holographic_coin") {
        drawHolographicCoin(ctx, cx, cy, hashValues);
      }

      // 3. Central Cryptographic Watermark & Metadata overlay
      drawCryptographicOverlays(ctx, width, height);

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [artStyle, activePalette, complexity, isRotating, rotationSpeed, glowIntensity, seedSalt, currentToken]);

  // STYLE 1: Quantum Lattice Generator
  const drawQuantumLattice = (ctx: CanvasRenderingContext2D, cx: number, cy: number, hashes: number[]) => {
    const pointsCount = Math.min(complexity, 90);
    const radiusBase = 180;
    const points: { x: number; y: number; r: number; color: string }[] = [];

    for (let i = 0; i < pointsCount; i++) {
      const h = hashes[i % hashes.length] || 128;
      const angle = (i / pointsCount) * Math.PI * 2 + angleRef.current * ((i % 2 === 0 ? 1 : -1) * 0.8);
      const dist = (radiusBase * (0.3 + (h / 255) * 0.85));
      const px = cx + Math.cos(angle) * dist;
      const py = cy + Math.sin(angle) * dist;
      const nodeR = 2 + (h % 5);
      const nodeColor = i % 3 === 0 ? activePalette.primary : i % 3 === 1 ? activePalette.secondary : activePalette.accent;
      points.push({ x: px, y: py, r: nodeR, color: nodeColor });
    }

    // Connect lattice lines
    ctx.lineWidth = 1;
    for (let i = 0; i < points.length; i++) {
      for (let j = i + 1; j < points.length; j++) {
        const dx = points[i].x - points[j].x;
        const dy = points[i].y - points[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 75) {
          const alpha = (1 - dist / 75) * 0.45;
          ctx.strokeStyle = activePalette.primary + Math.floor(alpha * 255).toString(16).padStart(2, "0");
          ctx.beginPath();
          ctx.moveTo(points[i].x, points[i].y);
          ctx.lineTo(points[j].x, points[j].y);
          ctx.stroke();
        }
      }
    }

    // Draw nodes
    for (const pt of points) {
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  // STYLE 2: Orbital Hologram Gyroscope
  const drawOrbitalHologram = (ctx: CanvasRenderingContext2D, cx: number, cy: number, hashes: number[]) => {
    const ringCount = Math.floor(complexity / 12) + 3;
    const baseRadius = 210;

    for (let i = 0; i < ringCount; i++) {
      const h = hashes[i % hashes.length] || 100;
      const r = (baseRadius / ringCount) * (i + 1);
      const rot = angleRef.current * ((i % 2 === 0 ? 1 : -1) * (1 + (h % 3) * 0.3));

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rot);

      // Ellipse ring
      ctx.beginPath();
      ctx.ellipse(0, 0, r, r * (0.45 + (i * 0.08)), (h % 180) * (Math.PI / 180), 0, Math.PI * 2);
      ctx.strokeStyle = i % 2 === 0 ? activePalette.primary + "99" : activePalette.secondary + "88";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Orbital ticks / hash indicators
      const tickCount = 8 + (h % 12);
      for (let t = 0; t < tickCount; t++) {
        const tickAngle = (t / tickCount) * Math.PI * 2;
        const tx = Math.cos(tickAngle) * r;
        const ty = Math.sin(tickAngle) * r * (0.45 + (i * 0.08));
        ctx.fillStyle = activePalette.accent;
        ctx.beginPath();
        ctx.arc(tx, ty, 2, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  };

  // STYLE 3: Neural AI Mesh
  const drawNeuralMesh = (ctx: CanvasRenderingContext2D, cx: number, cy: number, hashes: number[]) => {
    const layers = 5;
    const nodesPerLayer = 7;
    const layerSpacing = 70;
    const nodeSpacing = 45;
    const startX = cx - ((layers - 1) * layerSpacing) / 2;
    const allNodes: { x: number; y: number; active: boolean }[][] = [];

    // Create layered nodes
    for (let l = 0; l < layers; l++) {
      const layerNodes: { x: number; y: number; active: boolean }[] = [];
      const startY = cy - ((nodesPerLayer - 1) * nodeSpacing) / 2;
      for (let n = 0; n < nodesPerLayer; n++) {
        const offset = Math.sin(angleRef.current * 2 + l + n) * 6;
        const x = startX + l * layerSpacing;
        const y = startY + n * nodeSpacing + offset;
        const isActive = ((hashes[(l * nodesPerLayer + n) % hashes.length] || 0) % 3) === 0;
        layerNodes.push({ x, y, active: isActive });
      }
      allNodes.push(layerNodes);
    }

    // Connect layer to layer
    for (let l = 0; l < layers - 1; l++) {
      for (const fromNode of allNodes[l]) {
        for (const toNode of allNodes[l + 1]) {
          const isPulse = fromNode.active && toNode.active;
          ctx.strokeStyle = isPulse ? activePalette.primary + "AA" : activePalette.secondary + "25";
          ctx.lineWidth = isPulse ? 1.8 : 0.8;
          ctx.beginPath();
          ctx.moveTo(fromNode.x, fromNode.y);
          ctx.lineTo(toNode.x, toNode.y);
          ctx.stroke();
        }
      }
    }

    // Draw neurons
    for (const layer of allNodes) {
      for (const node of layer) {
        ctx.fillStyle = node.active ? activePalette.accent : activePalette.primary;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.active ? 4.5 : 2.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  };

  // STYLE 4: DePIN Topological Grid
  const drawDepinGrid = (ctx: CanvasRenderingContext2D, cx: number, cy: number, hashes: number[]) => {
    const gridSize = 8;
    const cellW = 40;
    const cellH = 22;
    const startX = cx - (gridSize * cellW) / 2;
    const startY = cy - 60;

    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        const h = hashes[(r * gridSize + c) % hashes.length] || 50;
        const isoX = startX + (c - r) * (cellW / 2);
        const isoY = startY + (c + r) * (cellH / 2);
        const elevation = (h / 255) * 50 + Math.sin(angleRef.current + r * 0.5) * 12;

        // Draw pillar
        ctx.fillStyle = activePalette.secondary + "22";
        ctx.strokeStyle = activePalette.primary + "66";
        ctx.lineWidth = 1;

        ctx.beginPath();
        ctx.moveTo(isoX, isoY - elevation);
        ctx.lineTo(isoX + cellW / 2, isoY + cellH / 2 - elevation);
        ctx.lineTo(isoX, isoY + cellH - elevation);
        ctx.lineTo(isoX - cellW / 2, isoY + cellH / 2 - elevation);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Node tower top beacon
        if (h > 170) {
          ctx.fillStyle = activePalette.accent;
          ctx.beginPath();
          ctx.arc(isoX, isoY - elevation, 3, 0, Math.PI * 2);
          ctx.fill();

          // Signal waves
          ctx.strokeStyle = activePalette.accent + "44";
          ctx.beginPath();
          ctx.arc(isoX, isoY - elevation, 8 + (h % 10), 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    }
  };

  // STYLE 5: Holographic Sovereign Coin / Badge
  const drawHolographicCoin = (ctx: CanvasRenderingContext2D, cx: number, cy: number, hashes: number[]) => {
    const coinR = 150;
    const tilt = 0.85;

    ctx.save();
    ctx.translate(cx, cy);

    // Outer coin rim & shadow
    const rimGrad = ctx.createLinearGradient(-coinR, -coinR, coinR, coinR);
    rimGrad.addColorStop(0, activePalette.secondary);
    rimGrad.addColorStop(0.5, activePalette.primary);
    rimGrad.addColorStop(1, activePalette.accent);

    ctx.beginPath();
    ctx.ellipse(0, 0, coinR + 10, (coinR + 10) * tilt, 0, 0, Math.PI * 2);
    ctx.fillStyle = rimGrad;
    ctx.fill();

    // Inner bevel
    ctx.beginPath();
    ctx.ellipse(0, 0, coinR - 4, (coinR - 4) * tilt, 0, 0, Math.PI * 2);
    ctx.fillStyle = activePalette.background;
    ctx.fill();
    ctx.strokeStyle = activePalette.secondary + "88";
    ctx.lineWidth = 3;
    ctx.stroke();

    // Reeding edges (teeth) around coin rim
    const teethCount = 48;
    for (let i = 0; i < teethCount; i++) {
      const a = (i / teethCount) * Math.PI * 2;
      const x1 = Math.cos(a) * (coinR + 4);
      const y1 = Math.sin(a) * (coinR + 4) * tilt;
      const x2 = Math.cos(a) * (coinR + 9);
      const y2 = Math.sin(a) * (coinR + 9) * tilt;
      ctx.strokeStyle = activePalette.primary + "AA";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    // Dynamic light sweep glint across face
    const glintGrad = ctx.createLinearGradient(-coinR, -coinR, coinR, coinR);
    const glintOffset = (Math.sin(angleRef.current) + 1) / 2;
    glintGrad.addColorStop(Math.max(0, glintOffset - 0.2), "transparent");
    glintGrad.addColorStop(glintOffset, activePalette.primary + "44");
    glintGrad.addColorStop(Math.min(1, glintOffset + 0.2), "transparent");
    ctx.fillStyle = glintGrad;
    ctx.beginPath();
    ctx.ellipse(0, 0, coinR - 10, (coinR - 10) * tilt, 0, 0, Math.PI * 2);
    ctx.fill();

    // Embossed Token Symbol in Center
    ctx.font = "bold 44px monospace";
    ctx.fillStyle = activePalette.primary;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(currentToken.symbol, 0, -8);

    // Subtitle & standard
    ctx.font = "bold 11px monospace";
    ctx.fillStyle = activePalette.secondary;
    ctx.fillText(`${currentToken.chain.toUpperCase()} • ${currentToken.tokenStandard}`, 0, 32);

    // Engraved circular contract address snippet
    ctx.font = "9px monospace";
    ctx.fillStyle = "#8E9299";
    ctx.fillText(currentToken.contractAddress.slice(0, 24) + "...", 0, 52);

    ctx.restore();
  };

  // Cryptographic Watermarks, Hash Text & Perimeter HUD
  const drawCryptographicOverlays = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.save();
    ctx.shadowBlur = 0;
    ctx.shadowColor = "transparent";

    // Top HUD
    ctx.font = "10px monospace";
    ctx.fillStyle = activePalette.primary + "DD";
    ctx.fillText(`GENESIS_HASH: ${currentToken.contractAddress.slice(0, 20)}...`, 20, 30);
    ctx.fillStyle = "#8E9299";
    ctx.fillText(`TOKEN_ID: #${currentToken.tokenId.slice(0, 16)}`, 20, 46);

    // Top Right Chain & Standard
    ctx.textAlign = "right";
    ctx.fillStyle = activePalette.secondary;
    ctx.fillText(`${currentToken.chain.toUpperCase()} [${currentToken.tokenStandard}]`, width - 20, 30);
    ctx.fillStyle = currentToken.isVanity ? "#10B981" : "#8E9299";
    ctx.fillText(currentToken.isVanity ? "VANITY_CURATED" : "STANDARD_EVM", width - 20, 46);

    // Bottom Status HUD
    ctx.textAlign = "left";
    ctx.fillStyle = "#8E9299";
    ctx.fillText(`SEC_AUDIT: ${currentToken.auditFirm} (${currentToken.securityScore}/100)`, 20, height - 25);

    ctx.textAlign = "right";
    ctx.fillStyle = activePalette.primary + "AA";
    ctx.fillText(`ALGO_VISUAL_SEED: 0x${seedSalt.toString(16).padStart(4, "0")}`, width - 20, height - 25);

    // Border Frame Corners
    ctx.strokeStyle = activePalette.primary + "44";
    ctx.lineWidth = 1;
    const corner = 20;
    // Top-left
    ctx.beginPath();
    ctx.moveTo(10, 10 + corner);
    ctx.lineTo(10, 10);
    ctx.lineTo(10 + corner, 10);
    ctx.stroke();
    // Top-right
    ctx.beginPath();
    ctx.moveTo(width - 10 - corner, 10);
    ctx.lineTo(width - 10, 10);
    ctx.lineTo(width - 10, 10 + corner);
    ctx.stroke();
    // Bottom-left
    ctx.beginPath();
    ctx.moveTo(10, height - 10 - corner);
    ctx.lineTo(10, height - 10);
    ctx.lineTo(10 + corner, height - 10);
    ctx.stroke();
    // Bottom-right
    ctx.beginPath();
    ctx.moveTo(width - 10 - corner, height - 10);
    ctx.lineTo(width - 10, height - 10);
    ctx.lineTo(width - 10, height - 10 - corner);
    ctx.stroke();

    ctx.restore();
  };

  // Export Canvas as High-Res PNG Image
  const handleDownloadPng = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `${currentToken.symbol.toLowerCase()}_generative_art.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  // Generate SVG Vector Markup
  const generateSvgMarkup = (): string => {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="100%" height="100%">
  <defs>
    <radialGradient id="bgGrad" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${activePalette.accent}" stop-opacity="0.2"/>
      <stop offset="100%" stop-color="${activePalette.background}" stop-opacity="1"/>
    </radialGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  <rect width="600" height="600" fill="${activePalette.background}"/>
  <rect width="600" height="600" fill="url(#bgGrad)"/>
  <circle cx="300" cy="300" r="180" fill="none" stroke="${activePalette.primary}" stroke-width="2" filter="url(#glow)"/>
  <circle cx="300" cy="300" r="140" fill="none" stroke="${activePalette.secondary}" stroke-width="1.5" stroke-dasharray="8,6"/>
  <circle cx="300" cy="300" r="90" fill="none" stroke="${activePalette.accent}" stroke-width="2"/>
  <text x="300" y="315" font-family="monospace" font-size="52" font-weight="bold" fill="${activePalette.primary}" text-anchor="middle">${currentToken.symbol}</text>
  <text x="300" y="355" font-family="monospace" font-size="14" fill="${activePalette.secondary}" text-anchor="middle">${currentToken.name}</text>
  <text x="300" y="380" font-family="monospace" font-size="11" fill="#8E9299" text-anchor="middle">${currentToken.contractAddress}</text>
  <text x="30" y="45" font-family="monospace" font-size="12" fill="${activePalette.primary}">GENESIS // ${currentToken.chain.toUpperCase()}</text>
  <text x="570" y="45" font-family="monospace" font-size="12" fill="${activePalette.secondary}" text-anchor="end">${currentToken.tokenStandard}</text>
</svg>`;
  };

  // Download SVG
  const handleDownloadSvg = () => {
    const svgData = generateSvgMarkup();
    const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${currentToken.symbol.toLowerCase()}_crypto_art.svg`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Comprehensive NFT Marketplace Metadata & Simulated Deployment Stats
  const metadataJson = generateTokenNFTMetadata(currentToken);
  const simulatedStats = computeSimulatedDeploymentStats(currentToken);

  const handleDownloadMetadataJson = () => {
    const jsonStr = JSON.stringify(metadataJson, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${currentToken.symbol.toLowerCase()}_nft_metadata.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-[#16161A] border border-[#1F1F23] rounded-xl p-5 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F27D26]/10 border border-[#F27D26]/30 flex items-center justify-center">
              <Palette className="w-5 h-5 text-[#F27D26]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight uppercase">
                  Generative Cryptographic Art Studio
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#F27D26]/20 text-[#F27D26] border border-[#F27D26]/30 font-semibold">
                  On-Chain SVG & Canvas
                </span>
              </div>
              <p className="text-xs text-[#8E9299] mt-0.5">
                Mathematical cryptographic visualizer synthesizing unique generative artwork, NFT tokens, and sovereign holographic coins from contract bytecode hashes.
              </p>
            </div>
          </div>

          {/* Sub Navigation */}
          <div className="flex flex-wrap items-center gap-1.5 bg-[#0A0A0C] p-1 rounded-lg border border-[#1F1F23]">
            <button
              onClick={() => setActiveSubTab("canvas")}
              className={`px-3 py-1.5 rounded text-xs font-mono transition-all cursor-pointer flex items-center gap-1.5 ${
                activeSubTab === "canvas"
                  ? "bg-[#16161A] text-white border border-[#F27D26] font-semibold"
                  : "text-[#8E9299] hover:text-white"
              }`}
            >
              <Eye className="w-3.5 h-3.5 text-[#F27D26]" />
              <span>Canvas Visualizer</span>
            </button>
            <button
              onClick={() => setActiveSubTab("metadata")}
              className={`px-3 py-1.5 rounded text-xs font-mono transition-all cursor-pointer flex items-center gap-1.5 ${
                activeSubTab === "metadata"
                  ? "bg-[#16161A] text-white border border-[#F27D26] font-semibold"
                  : "text-[#8E9299] hover:text-white"
              }`}
            >
              <FileJson className="w-3.5 h-3.5 text-[#F27D26]" />
              <span>IPFS Metadata</span>
            </button>
            <button
              onClick={() => setActiveSubTab("svg")}
              className={`px-3 py-1.5 rounded text-xs font-mono transition-all cursor-pointer flex items-center gap-1.5 ${
                activeSubTab === "svg"
                  ? "bg-[#16161A] text-white border border-[#F27D26] font-semibold"
                  : "text-[#8E9299] hover:text-white"
              }`}
            >
              <Code2 className="w-3.5 h-3.5 text-[#F27D26]" />
              <span>SVG Vector</span>
            </button>
            <button
              onClick={() => setActiveSubTab("gallery")}
              className={`px-3 py-1.5 rounded text-xs font-mono transition-all cursor-pointer flex items-center gap-1.5 ${
                activeSubTab === "gallery"
                  ? "bg-[#16161A] text-white border border-[#F27D26] font-semibold"
                  : "text-[#8E9299] hover:text-white"
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-[#F27D26]" />
              <span>Market Gallery ({tokens.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* SUB-VIEW 1: CANVAS STUDIO */}
      {activeSubTab === "canvas" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Controls Column (Left) */}
          <div className="lg:col-span-4 space-y-4">
            {/* Active Token Card */}
            <div className="bg-[#16161A] border border-[#1F1F23] rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#1F1F23]">
                <span className="text-[10px] font-mono text-[#8E9299] uppercase">Target Asset</span>
                <span className="text-[10px] font-mono text-[#F27D26] bg-[#F27D26]/10 px-2 py-0.5 rounded border border-[#F27D26]/30">
                  {currentToken.tokenStandard}
                </span>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-white">{currentToken.name}</span>
                  <span className="text-xs font-mono font-bold text-[#F27D26]">{currentToken.symbol}</span>
                </div>
                <div className="text-[11px] font-mono text-[#8E9299] mt-1 break-all bg-[#0A0A0C] p-2 rounded border border-[#1F1F23]">
                  {currentToken.contractAddress}
                </div>
              </div>

              {/* Quick Preset Selector from Foundry Pool */}
              {tokens.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <label className="text-[10px] font-mono text-[#8E9299] uppercase block">
                    Switch Token from Catalog:
                  </label>
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                    {tokens.slice(0, 8).map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          setCurrentToken(t);
                          if (onSelectToken) onSelectToken(t);
                        }}
                        className={`px-2 py-1 rounded text-[10px] font-mono border whitespace-nowrap cursor-pointer transition-all ${
                          currentToken.id === t.id
                            ? "bg-[#F27D26]/20 border-[#F27D26] text-[#F27D26] font-bold"
                            : "bg-[#0A0A0C] border-[#1F1F23] text-[#8E9299] hover:text-white"
                        }`}
                      >
                        {t.symbol}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Generative Style Archetypes */}
            <div className="bg-[#16161A] border border-[#1F1F23] rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  Visual Archetype
                </span>
                <span className="text-[10px] font-mono text-[#8E9299]">5 Modes</span>
              </div>

              <div className="grid grid-cols-1 gap-2">
                {[
                  {
                    id: "quantum_lattice" as ArtStyleMode,
                    name: "Quantum Lattice",
                    desc: "Quantum nodes & interconnected entanglement vectors",
                    icon: Hexagon,
                  },
                  {
                    id: "orbital_hologram" as ArtStyleMode,
                    name: "Orbital Hologram",
                    desc: "Multi-ring celestial gyroscope with hash coordinates",
                    icon: Orbit,
                  },
                  {
                    id: "neural_mesh" as ArtStyleMode,
                    name: "Neural AI Mesh",
                    desc: "Synaptic neural layers & weighted signal pulses",
                    icon: Cpu,
                  },
                  {
                    id: "depin_grid" as ArtStyleMode,
                    name: "DePIN Vector Grid",
                    desc: "Isometric cybernetic grid & wireless node beacons",
                    icon: Radio,
                  },
                  {
                    id: "holographic_coin" as ArtStyleMode,
                    name: "Holographic Coin",
                    desc: "3D metallic sovereign badge with embossed symbol",
                    icon: Coins,
                  },
                ].map((m) => {
                  const Icon = m.icon;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setArtStyle(m.id)}
                      className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer flex items-center gap-3 ${
                        artStyle === m.id
                          ? "bg-[#F27D26]/15 border-[#F27D26] shadow-sm"
                          : "bg-[#0A0A0C] border-[#1F1F23] hover:border-[#F27D26]/40 text-[#8E9299]"
                      }`}
                    >
                      <div
                        className={`w-7 h-7 rounded-md flex items-center justify-center ${
                          artStyle === m.id
                            ? "bg-[#F27D26] text-black"
                            : "bg-[#16161A] text-[#8E9299]"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`text-xs font-bold truncate ${artStyle === m.id ? "text-white" : "text-[#AAA]"}`}>
                          {m.name}
                        </div>
                        <div className="text-[10px] text-[#8E9299] truncate">{m.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Color Palette Selector */}
            <div className="bg-[#16161A] border border-[#1F1F23] rounded-xl p-4 space-y-3">
              <span className="text-xs font-bold text-white uppercase tracking-wider font-mono block">
                Harmonic Palette
              </span>
              <div className="grid grid-cols-2 gap-2">
                {COLOR_PALETTES.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setActivePalette(p)}
                    className={`p-2 rounded-lg border text-left cursor-pointer transition-all ${
                      activePalette.id === p.id
                        ? "bg-[#0A0A0C] border-[#F27D26]"
                        : "bg-[#0A0A0C] border-[#1F1F23] hover:border-[#333]"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: p.primary }} />
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: p.secondary }} />
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: p.accent }} />
                    </div>
                    <span className="text-[11px] font-mono text-white block truncate">{p.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Fine-Tuning Sliders */}
            <div className="bg-[#16161A] border border-[#1F1F23] rounded-xl p-4 space-y-3.5">
              <span className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center justify-between">
                <span>Render Parameters</span>
                <Sliders className="w-3.5 h-3.5 text-[#F27D26]" />
              </span>

              {/* Complexity Slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-mono">
                  <span className="text-[#8E9299]">Density / Nodes:</span>
                  <span className="text-white font-bold">{complexity}</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="120"
                  value={complexity}
                  onChange={(e) => setComplexity(Number(e.target.value))}
                  className="w-full accent-[#F27D26] cursor-pointer"
                />
              </div>

              {/* Glow Intensity */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-mono">
                  <span className="text-[#8E9299]">Cyber Bloom / Glow:</span>
                  <span className="text-white font-bold">{glowIntensity}%</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={glowIntensity}
                  onChange={(e) => setGlowIntensity(Number(e.target.value))}
                  className="w-full accent-[#F27D26] cursor-pointer"
                />
              </div>

              {/* Animation Speed & Play/Pause */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-mono">
                  <span className="text-[#8E9299]">Rotation Engine:</span>
                  <span className="text-white font-bold">{isRotating ? `${rotationSpeed}x` : "Paused"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsRotating(!isRotating)}
                    className="p-1.5 rounded bg-[#0A0A0C] border border-[#1F1F23] text-[#8E9299] hover:text-white cursor-pointer"
                  >
                    {isRotating ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  </button>
                  <input
                    type="range"
                    min="0.2"
                    max="3"
                    step="0.2"
                    value={rotationSpeed}
                    onChange={(e) => setRotationSpeed(Number(e.target.value))}
                    disabled={!isRotating}
                    className="flex-1 accent-[#F27D26] cursor-pointer disabled:opacity-40"
                  />
                </div>
              </div>

              {/* Entropy Salt Randomizer */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setSeedSalt(Math.floor(Math.random() * 99999))}
                  className="w-full py-2 px-3 rounded-lg bg-[#0A0A0C] hover:bg-[#16161A] border border-[#1F1F23] text-xs font-mono text-[#8E9299] hover:text-white flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-[#F27D26]" />
                  <span>Scramble Visual Entropy Seed (0x{seedSalt.toString(16)})</span>
                </button>
              </div>
            </div>
          </div>

          {/* Canvas Preview Area (Right) */}
          <div className="lg:col-span-8 space-y-4">
            <div className="bg-[#0A0A0C] border border-[#1F1F23] rounded-xl p-4 shadow-2xl relative overflow-hidden flex flex-col items-center justify-center">
              {/* Top Action Toolbar */}
              <div className="w-full flex items-center justify-between mb-3 px-2">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#10B981] animate-pulse" />
                  <span className="text-xs font-mono text-[#8E9299]">
                    60 FPS Dynamic Generative Canvas
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadPng}
                    className="px-3 py-1.5 rounded-lg bg-[#16161A] hover:bg-[#1F1F23] border border-[#1F1F23] text-xs font-mono text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-[#F27D26]" />
                    <span>Download PNG</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadSvg}
                    className="px-3 py-1.5 rounded-lg bg-[#16161A] hover:bg-[#1F1F23] border border-[#1F1F23] text-xs font-mono text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Code2 className="w-3.5 h-3.5 text-[#00F0FF]" />
                    <span>Download SVG</span>
                  </button>

                  {onDeployToken && (
                    <button
                      type="button"
                      onClick={() => onDeployToken(currentToken)}
                      className="px-3 py-1.5 rounded-lg bg-[#F27D26] hover:bg-[#ff8e3c] text-black font-bold text-xs font-mono flex items-center gap-1.5 transition-all cursor-pointer shadow-lg"
                    >
                      <Rocket className="w-3.5 h-3.5 fill-current" />
                      <span>Deploy with Art</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Main Interactive HTML5 Canvas Element */}
              <div className="relative rounded-lg overflow-hidden border border-[#1F1F23] shadow-2xl bg-black">
                <canvas
                  ref={canvasRef}
                  width={600}
                  height={600}
                  className="w-full max-w-[560px] aspect-square object-contain block"
                />
              </div>

              {/* Bottom Quick Stats */}
              <div className="w-full grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4 text-[11px] font-mono">
                <div className="bg-[#16161A] p-2.5 rounded border border-[#1F1F23]">
                  <span className="text-[#8E9299] block text-[10px]">ALGORITHM</span>
                  <span className="text-white font-bold capitalize">{artStyle.replace("_", " ")}</span>
                </div>
                <div className="bg-[#16161A] p-2.5 rounded border border-[#1F1F23]">
                  <span className="text-[#8E9299] block text-[10px]">PALETTE</span>
                  <span className="text-white font-bold">{activePalette.name}</span>
                </div>
                <div className="bg-[#16161A] p-2.5 rounded border border-[#1F1F23]">
                  <span className="text-[#8E9299] block text-[10px]">IPFS PIN STATUS</span>
                  <span className="text-[#10B981] font-bold">Ready for Mint</span>
                </div>
                <div className="bg-[#16161A] p-2.5 rounded border border-[#1F1F23]">
                  <span className="text-[#8E9299] block text-[10px]">ARWEAVE WEAVE</span>
                  <span className="text-[#00F0FF] font-bold">Permanent Sync</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-VIEW 2: IPFS & ARWEAVE NFT METADATA */}
      {activeSubTab === "metadata" && (
        <div className="bg-[#16161A] border border-[#1F1F23] rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#1F1F23]">
            <div>
              <h3 className="text-sm font-bold text-white uppercase font-mono flex items-center gap-2">
                <FileJson className="w-4 h-4 text-[#F27D26]" />
                ERC-721 / ERC-1155 / SPL Standard Metadata JSON
              </h3>
              <p className="text-xs text-[#8E9299] mt-0.5">
                Compliant with OpenSea, Blur, MagicEden, and decentralized IPFS / Arweave indexing standards.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleCopy(JSON.stringify(metadataJson, null, 2), "metadata_json")}
                className="px-3 py-1.5 rounded bg-[#0A0A0C] hover:bg-[#1E1E24] border border-[#1F1F23] text-xs font-mono text-[#8E9299] hover:text-white flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                {copiedKey === "metadata_json" ? (
                  <Check className="w-3.5 h-3.5 text-green-500" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span>Copy JSON</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadMetadataJson}
                className="px-3 py-1.5 rounded bg-[#F27D26] hover:bg-[#ff8e3c] text-black font-bold text-xs font-mono flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download .json</span>
              </button>
            </div>
          </div>

          {/* Simulated Deployment Stats Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="bg-[#0A0A0C] p-2.5 rounded-lg border border-[#1F1F23] font-mono">
              <span className="text-[10px] text-[#8E9299] uppercase block">Intended Blockchain</span>
              <span className="text-xs font-bold text-white mt-0.5 block">{currentToken.chain.toUpperCase()}</span>
              <span className="text-[10px] text-cyan-400">Net ID: #{currentToken.networkId || 1}</span>
            </div>
            <div className="bg-[#0A0A0C] p-2.5 rounded-lg border border-[#1F1F23] font-mono">
              <span className="text-[10px] text-[#8E9299] uppercase block">Standard</span>
              <span className="text-xs font-bold text-[#F27D26] mt-0.5 block">{currentToken.tokenStandard}</span>
              <span className="text-[10px] text-[#8E9299]">{currentToken.decimals} Decimals</span>
            </div>
            <div className="bg-[#0A0A0C] p-2.5 rounded-lg border border-[#1F1F23] font-mono">
              <span className="text-[10px] text-[#8E9299] uppercase block">Simulated Gas Units</span>
              <span className="text-xs font-bold text-white mt-0.5 block">{simulatedStats.totalGasUnits.toLocaleString()}</span>
              <span className="text-[10px] text-green-400">{simulatedStats.nativeCostFormatted}</span>
            </div>
            <div className="bg-[#0A0A0C] p-2.5 rounded-lg border border-[#1F1F23] font-mono">
              <span className="text-[10px] text-[#8E9299] uppercase block">Simulation Success</span>
              <span className="text-xs font-bold text-emerald-400 mt-0.5 block flex items-center gap-1">
                <Gauge className="w-3 h-3" />
                {simulatedStats.overallSuccessRate}%
              </span>
              <span className="text-[10px] text-[#8E9299]">Bytecode: {simulatedStats.bytecodeSize}B</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <pre className="p-4 rounded-lg bg-[#0A0A0C] border border-[#1F1F23] text-xs font-mono text-[#E0E0E0] overflow-x-auto leading-relaxed max-h-[460px]">
              {JSON.stringify(metadataJson, null, 2)}
            </pre>

            <div className="space-y-3">
              <div className="bg-[#0A0A0C] p-4 rounded-lg border border-[#1F1F23] space-y-2">
                <span className="text-xs font-bold text-white font-mono uppercase block">
                  IPFS Gateway Endpoint
                </span>
                <div className="text-xs font-mono text-[#00F0FF] break-all bg-[#16161A] p-2.5 rounded border border-[#1F1F23]">
                  {metadataJson.image}
                </div>
                <p className="text-[11px] text-[#8E9299]">
                  Immutable hash pinned to decentralized Pinata / Web3.Storage clusters for censorship resistance.
                </p>
              </div>

              <div className="bg-[#0A0A0C] p-4 rounded-lg border border-[#1F1F23] space-y-2">
                <span className="text-xs font-bold text-white font-mono uppercase block">
                  Arweave Permanent Storage
                </span>
                <div className="text-xs font-mono text-[#F27D26] break-all bg-[#16161A] p-2.5 rounded border border-[#1F1F23]">
                  {metadataJson.animation_url}
                </div>
                <p className="text-[11px] text-[#8E9299]">
                  Permanent permaweb storage guaranteeing 200+ years of persistent asset availability.
                </p>
              </div>

              <div className="bg-[#0A0A0C] p-4 rounded-lg border border-[#1F1F23] space-y-2">
                <span className="text-xs font-bold text-white font-mono uppercase block">
                  On-Chain Attribute Matrix ({metadataJson.attributes.length} Traits)
                </span>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                  {metadataJson.attributes.map((attr, idx) => (
                    <div key={idx} className="bg-[#16161A] p-2 rounded border border-[#1F1F23] text-[10px] font-mono">
                      <span className="text-[#8E9299] block">{attr.trait_type}</span>
                      <span className="text-white font-semibold truncate block">{String(attr.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-VIEW 3: SVG VECTOR CODE */}
      {activeSubTab === "svg" && (
        <div className="bg-[#16161A] border border-[#1F1F23] rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#1F1F23]">
            <div>
              <h3 className="text-sm font-bold text-white uppercase font-mono flex items-center gap-2">
                <Code2 className="w-4 h-4 text-[#F27D26]" />
                Pure Mathematical SVG Vector Output
              </h3>
              <p className="text-xs text-[#8E9299] mt-0.5">
                Can be embedded directly on-chain inside Solidity ERC-721 `tokenURI()` Base64 outputs.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleCopy(generateSvgMarkup(), "svg_code")}
                className="px-3 py-1.5 rounded bg-[#0A0A0C] border border-[#1F1F23] text-xs font-mono text-[#8E9299] hover:text-white flex items-center gap-1.5 cursor-pointer"
              >
                {copiedKey === "svg_code" ? (
                  <Check className="w-3.5 h-3.5 text-green-500" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span>Copy SVG</span>
              </button>
              <button
                onClick={handleDownloadSvg}
                className="px-3 py-1.5 rounded bg-[#F27D26] hover:bg-[#ff8e3c] text-black font-bold text-xs font-mono flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 fill-current" />
                <span>Save .svg</span>
              </button>
            </div>
          </div>

          <pre className="p-4 rounded-lg bg-[#0A0A0C] border border-[#1F1F23] text-xs font-mono text-[#E0E0E0] overflow-x-auto leading-relaxed max-h-[460px]">
            {generateSvgMarkup()}
          </pre>
        </div>
      )}

      {/* SUB-VIEW 4: MARKET TOKEN GALLERY */}
      {activeSubTab === "gallery" && (
        <div className="space-y-4">
          <div className="bg-[#16161A] border border-[#1F1F23] rounded-xl p-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white uppercase font-mono">
                Market Cryptocurrencies Art Catalog ({tokens.length} Assets)
              </h3>
              <p className="text-xs text-[#8E9299] mt-0.5">
                Click any asset to generate its cryptographic artwork and view on-chain attributes.
              </p>
            </div>
            <span className="text-xs font-mono text-[#F27D26] bg-[#F27D26]/10 px-3 py-1.5 rounded-lg border border-[#F27D26]/30 font-bold">
              Dynamic Batch Rendering
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {tokens.slice(0, 16).map((tok) => {
              const isCurrent = currentToken.id === tok.id;
              return (
                <div
                  key={tok.id}
                  className={`bg-[#16161A] rounded-xl p-3 border transition-all cursor-pointer space-y-2.5 ${
                    isCurrent
                      ? "border-[#F27D26] shadow-lg bg-[#1a1714]"
                      : "border-[#1F1F23] hover:border-[#F27D26]/50"
                  }`}
                  onClick={() => {
                    setCurrentToken(tok);
                    setActiveSubTab("canvas");
                    if (onSelectToken) onSelectToken(tok);
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white truncate">{tok.name}</span>
                    <span className="text-xs font-mono font-bold text-[#F27D26]">{tok.symbol}</span>
                  </div>

                  {/* Mini Visual Preview Block */}
                  <div className="h-28 rounded-lg bg-[#0A0A0C] border border-[#1F1F23] flex items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-radial from-[#F27D26]/10 to-transparent" />
                    <TokenImage
                      token={tok}
                      size="xl"
                      rounded="rounded-xl"
                      fallbackSymbolLength={3}
                    />
                    <span className="absolute bottom-1.5 left-2 text-[9px] font-mono text-[#8E9299]">
                      {tok.chain}
                    </span>
                    <span className="absolute bottom-1.5 right-2 text-[9px] font-mono text-[#10B981]">
                      Score: {tok.securityScore}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[10px] font-mono text-[#8E9299]">
                    <span>{tok.tokenStandard}</span>
                    <span className="text-[#F27D26] hover:underline font-bold">Inspect Art →</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
