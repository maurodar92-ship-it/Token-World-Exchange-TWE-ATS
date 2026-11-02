import React from "react";
import { ChainType } from "../types";
import {
  Diamond,
  Zap,
  CircleDot,
  Boxes,
  Hexagon,
  Bitcoin,
  Atom,
  Orbit,
  Layers,
} from "lucide-react";

interface ChainIconProps {
  chain: ChainType | string;
  className?: string;
  size?: "xs" | "sm" | "md" | "lg";
  showContainer?: boolean;
}

export const CHAIN_ICON_CONFIG: Record<
  string,
  {
    icon: React.ComponentType<{ className?: string }>;
    name: string;
    textColor: string;
    bgColor: string;
    borderColor: string;
    fillClass?: string;
  }
> = {
  ethereum: {
    icon: Diamond,
    name: "Ethereum",
    textColor: "text-[#627EEA]",
    bgColor: "bg-[#627EEA]/15",
    borderColor: "border-[#627EEA]/40",
    fillClass: "fill-[#627EEA]/20",
  },
  solana: {
    icon: Zap,
    name: "Solana",
    textColor: "text-[#14F195]",
    bgColor: "bg-[#14F195]/15",
    borderColor: "border-[#14F195]/40",
    fillClass: "fill-[#14F195]/30",
  },
  base: {
    icon: CircleDot,
    name: "Base",
    textColor: "text-[#0052FF]",
    bgColor: "bg-[#0052FF]/15",
    borderColor: "border-[#0052FF]/40",
    fillClass: "fill-[#0052FF]/20",
  },
  arbitrum: {
    icon: Boxes,
    name: "Arbitrum",
    textColor: "text-[#28A0F0]",
    bgColor: "bg-[#28A0F0]/15",
    borderColor: "border-[#28A0F0]/40",
    fillClass: "fill-[#28A0F0]/10",
  },
  polygon: {
    icon: Hexagon,
    name: "Polygon",
    textColor: "text-[#A855F7]",
    bgColor: "bg-[#8247E5]/15",
    borderColor: "border-[#8247E5]/40",
    fillClass: "fill-[#8247E5]/20",
  },
  bitcoin: {
    icon: Bitcoin,
    name: "Bitcoin",
    textColor: "text-[#F7931A]",
    bgColor: "bg-[#F7931A]/15",
    borderColor: "border-[#F7931A]/40",
  },
  quantum: {
    icon: Atom,
    name: "Quantum",
    textColor: "text-violet-400",
    bgColor: "bg-violet-500/15",
    borderColor: "border-violet-500/40",
  },
  cosmos: {
    icon: Orbit,
    name: "Cosmos",
    textColor: "text-indigo-400",
    bgColor: "bg-indigo-500/15",
    borderColor: "border-indigo-500/40",
  },
};

const DEFAULT_CONFIG = {
  icon: Layers,
  name: "Blockchain",
  textColor: "text-[#8E9299]",
  bgColor: "bg-[#16161A]",
  borderColor: "border-[#1F1F23]",
  fillClass: "",
};

export const ChainIcon: React.FC<ChainIconProps> = ({
  chain,
  className = "",
  size = "sm",
  showContainer = false,
}) => {
  const config = CHAIN_ICON_CONFIG[chain.toLowerCase()] || DEFAULT_CONFIG;
  const IconComponent = config.icon;

  const sizeClasses = {
    xs: "w-2.5 h-2.5",
    sm: "w-3 h-3",
    md: "w-3.5 h-3.5",
    lg: "w-4 h-4",
  }[size];

  const containerSizeClasses = {
    xs: "w-4 h-4",
    sm: "w-4.5 h-4.5 p-0.5",
    md: "w-5 h-5",
    lg: "w-6 h-6",
  }[size];

  if (showContainer) {
    return (
      <span
        className={`inline-flex items-center justify-center rounded-full border shrink-0 ${config.bgColor} ${config.borderColor} ${containerSizeClasses} ${className}`}
        title={`${config.name} Network`}
      >
        <IconComponent className={`${sizeClasses} ${config.textColor} ${config.fillClass || ""}`} />
      </span>
    );
  }

  return (
    <IconComponent
      className={`shrink-0 ${sizeClasses} ${config.textColor} ${config.fillClass || ""} ${className}`}
    />
  );
};
