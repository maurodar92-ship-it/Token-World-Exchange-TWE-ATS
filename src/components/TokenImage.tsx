import React, { useState, useEffect, useRef } from "react";
import { ChainType, TokenRecord } from "../types";
import { ChainIcon } from "./ChainIcon";
import {
  getSyncCachedTokenImage,
  getTokenImageFromCache,
  setTokenImageInCache,
  subscribeToImageCache,
} from "../utils/tokenImageCache";
import { generateTokenDataUri } from "../utils/tokenImageGenerator";

export interface TokenImageProps {
  token?: Partial<TokenRecord> | null;
  src?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "custom";
  className?: string;
  imageClassName?: string;
  showChainBadge?: boolean;
  chainBadgeSize?: "xs" | "sm";
  rounded?: "rounded" | "rounded-md" | "rounded-lg" | "rounded-xl" | "rounded-2xl" | "rounded-full";
  fallbackSymbolLength?: number;
  alt?: string;
  priority?: boolean;
}

const SIZE_CLASSES = {
  xs: "w-6 h-6 text-[10px]",
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-12 h-12 text-base",
  xl: "w-16 h-16 text-xl",
  "2xl": "w-20 h-20 text-2xl",
  custom: "",
};

export const TokenImage: React.FC<TokenImageProps> = ({
  token,
  src: explicitSrc,
  size = "sm",
  className = "",
  imageClassName = "",
  showChainBadge = false,
  chainBadgeSize = "xs",
  rounded = "rounded-lg",
  fallbackSymbolLength = 3,
  alt,
  priority = false,
}) => {
  const symbol = (token?.symbol || "TOK").toUpperCase();
  const name = token?.name || symbol;
  const chain: ChainType = token?.chain || "ethereum";
  const tokenId = token?.id || `${chain}_${symbol}`;

  // Check sync memory cache first for immediate zero-flicker render
  const initialCached = tokenId ? getSyncCachedTokenImage(tokenId) : null;
  const initialEffectiveSrc =
    explicitSrc ||
    initialCached ||
    token?.imageUrl ||
    (token?.svgData ? `data:image/svg+xml;utf8,${encodeURIComponent(token.svgData)}` : null);

  const [imageSrc, setImageSrc] = useState<string | null>(initialEffectiveSrc);
  const [isLoading, setIsLoading] = useState<boolean>(!initialEffectiveSrc);
  const [hasError, setHasError] = useState<boolean>(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Reactively update when token properties change
  useEffect(() => {
    let active = true;

    async function resolveSource() {
      // 1. Explicit prop
      if (explicitSrc) {
        setImageSrc(explicitSrc);
        setHasError(false);
        setIsLoading(false);
        return;
      }

      // 2. Token object data binding (imageUrl or svgData)
      if (token?.imageUrl) {
        setImageSrc(token.imageUrl);
        setHasError(false);
        setIsLoading(false);
        if (tokenId) setTokenImageInCache(tokenId, token.imageUrl);
        return;
      }

      if (token?.svgData) {
        const svgUri = `data:image/svg+xml;utf8,${encodeURIComponent(token.svgData)}`;
        setImageSrc(svgUri);
        setHasError(false);
        setIsLoading(false);
        if (tokenId) setTokenImageInCache(tokenId, svgUri);
        return;
      }

      // 3. Check L1 / L2 cache
      if (tokenId) {
        const cached = await getTokenImageFromCache(tokenId);
        if (!active) return;
        if (cached) {
          setImageSrc(cached);
          setHasError(false);
          setIsLoading(false);
          return;
        }
      }

      // 4. Fallback generation of deterministic cyber-styled vector SVG
      const generatedUri = generateTokenDataUri(token || {});
      if (active) {
        setImageSrc(generatedUri);
        setHasError(false);
        setIsLoading(false);
        if (tokenId) {
          setTokenImageInCache(tokenId, generatedUri);
        }
      }
    }

    resolveSource();

    // Subscribe to cache updates
    const unsubscribe = subscribeToImageCache(() => {
      if (tokenId && active) {
        const updated = getSyncCachedTokenImage(tokenId);
        if (updated) {
          setImageSrc(updated);
          setHasError(false);
          setIsLoading(false);
        }
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [explicitSrc, token?.imageUrl, token?.svgData, tokenId, token?.symbol, token?.chain]);

  const handleLoad = () => {
    if (!mountedRef.current) return;
    setIsLoading(false);
    setHasError(false);
    if (tokenId && imageSrc) {
      setTokenImageInCache(tokenId, imageSrc);
    }
  };

  const handleError = () => {
    if (!mountedRef.current) return;
    setIsLoading(false);
    setHasError(true);
  };

  const sizeClass = size === "custom" ? "" : SIZE_CLASSES[size];
  const displayInitials = symbol.slice(0, Math.min(fallbackSymbolLength, symbol.length));

  return (
    <div className={`relative inline-block shrink-0 select-none ${className}`}>
      {/* Outer container */}
      <div
        className={`relative ${sizeClass} ${rounded} overflow-hidden bg-[#0A0A0C] border border-[#1F1F24] flex items-center justify-center font-mono font-bold transition-all duration-200 group-hover:border-[#F27D26]/40`}
      >
        {/* Skeleton Loader during fetch / initial rendering */}
        {isLoading && (
          <div className="absolute inset-0 bg-gradient-to-r from-[#16161A] via-[#22222A] to-[#16161A] animate-pulse flex items-center justify-center">
            <span className="opacity-30 text-[10px] text-zinc-400 font-mono">
              {displayInitials}
            </span>
          </div>
        )}

        {/* Fallback avatar if error or no source */}
        {hasError || !imageSrc ? (
          <div
            className={`w-full h-full flex items-center justify-center font-bold text-white bg-gradient-to-br from-[#1A1A22] to-[#0A0A0E] text-center select-none shadow-inner`}
            title={`${name} (${symbol})`}
          >
            <span className="text-[#F27D26] tracking-tighter drop-shadow-sm">
              {displayInitials}
            </span>
          </div>
        ) : (
          <img
            src={imageSrc}
            alt={alt || `${name} token logo`}
            loading={priority ? "eager" : "lazy"}
            onLoad={handleLoad}
            onError={handleError}
            className={`w-full h-full object-cover object-center transition-opacity duration-200 ${
              isLoading ? "opacity-0" : "opacity-100"
            } ${imageClassName}`}
          />
        )}
      </div>

      {/* Optional Chain Indicator Badge */}
      {showChainBadge && (
        <div
          className="absolute -bottom-1 -right-1 z-10 filter drop-shadow"
          title={`${chain.toUpperCase()} Network`}
        >
          <ChainIcon chain={chain} size={chainBadgeSize} showContainer />
        </div>
      )}
    </div>
  );
};

export default TokenImage;
