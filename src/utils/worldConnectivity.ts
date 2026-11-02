export interface WorldNodeHealth {
  id: string;
  city: string;
  country: string;
  region: string;
  flag: string;
  datacenter: string;
  latencyMs: number;
  status: "OPTIMAL" | "HEALTHY" | "CONGESTED";
  packetSuccessRate: number; // e.g. 100%
  lastPingTime: number;
}

export interface WorldMarketFeedItem {
  symbol: string;
  name: string;
  priceUsd: number;
  change24h: number;
  category: "CRYPTO" | "FIAT" | "COMMODITY" | "EQUITY";
  source: string;
  lastUpdated: number;
}

export const INITIAL_WORLD_NODES: WorldNodeHealth[] = [
  { id: "us-east", city: "New York", country: "United States", region: "North America East", flag: "🇺🇸", datacenter: "Equinix NY4 Secaucus", latencyMs: 14, status: "OPTIMAL", packetSuccessRate: 100, lastPingTime: Date.now() },
  { id: "us-west", city: "Los Angeles", country: "United States", region: "North America West", flag: "🇺🇸", datacenter: "One Wilshire LA", latencyMs: 22, status: "OPTIMAL", packetSuccessRate: 100, lastPingTime: Date.now() },
  { id: "eu-west", city: "London", country: "United Kingdom", region: "Europe West", flag: "🇬🇧", datacenter: "Telehouse North Docklands", latencyMs: 28, status: "OPTIMAL", packetSuccessRate: 100, lastPingTime: Date.now() },
  { id: "eu-central", city: "Frankfurt", country: "Germany", region: "Europe Central", flag: "🇩🇪", datacenter: "DE-CIX Interxion FRA", latencyMs: 31, status: "OPTIMAL", packetSuccessRate: 100, lastPingTime: Date.now() },
  { id: "ap-east", city: "Tokyo", country: "Japan", region: "Asia Pacific", flag: "🇯🇵", datacenter: "Equinix TY2 Otemachi", latencyMs: 42, status: "HEALTHY", packetSuccessRate: 99.8, lastPingTime: Date.now() },
  { id: "ap-se", city: "Singapore", country: "Singapore", region: "Southeast Asia", flag: "🇸🇬", datacenter: "Equinix SG1 Ayer Rajah", latencyMs: 51, status: "HEALTHY", packetSuccessRate: 100, lastPingTime: Date.now() },
  { id: "sa-east", city: "São Paulo", country: "Brazil", region: "South America", flag: "🇧🇷", datacenter: "Equinix SP4 Tamboré", latencyMs: 68, status: "HEALTHY", packetSuccessRate: 99.6, lastPingTime: Date.now() },
  { id: "ap-south", city: "Sydney", country: "Australia", region: "Oceania", flag: "🇦🇺", datacenter: "Equinix SY3 Alexandria", latencyMs: 76, status: "HEALTHY", packetSuccessRate: 99.9, lastPingTime: Date.now() },
];

export const INITIAL_WORLD_FEEDS: WorldMarketFeedItem[] = [
  { symbol: "BTC", name: "Bitcoin", priceUsd: 91420.0, change24h: 3.42, category: "CRYPTO", source: "Global Aggregate", lastUpdated: Date.now() },
  { symbol: "ETH", name: "Ethereum", priceUsd: 3380.5, change24h: 2.85, category: "CRYPTO", source: "Global Aggregate", lastUpdated: Date.now() },
  { symbol: "SOL", name: "Solana", priceUsd: 214.8, change24h: 5.12, category: "CRYPTO", source: "Global Aggregate", lastUpdated: Date.now() },
  { symbol: "TREE3", name: "Token World TREE3", priceUsd: 125.0, change24h: 4.88, category: "CRYPTO", source: "Token World ATS", lastUpdated: Date.now() },
  { symbol: "TW-EQ", name: "Token World NYSE", priceUsd: 52.5, change24h: 1.15, category: "EQUITY", source: "NYSE Hybrid Link", lastUpdated: Date.now() },
  { symbol: "EUR/USD", name: "Euro / US Dollar", priceUsd: 1.082, change24h: -0.12, category: "FIAT", source: "Forex Global", lastUpdated: Date.now() },
  { symbol: "USD/JPY", name: "US Dollar / Yen", priceUsd: 154.2, change24h: 0.35, category: "FIAT", source: "Forex Global", lastUpdated: Date.now() },
  { symbol: "GOLD", name: "Gold (Troy Oz)", priceUsd: 2748.6, change24h: 0.94, category: "COMMODITY", source: "World Spot", lastUpdated: Date.now() },
];

// Fullscreen API Utilities
export function isFullscreenActive(): boolean {
  if (typeof document === "undefined") return false;
  return Boolean(
    document.fullscreenElement ||
      (document as any).webkitFullscreenElement ||
      (document as any).mozFullScreenElement ||
      (document as any).msFullscreenElement
  );
}

export async function toggleFullscreen(): Promise<boolean> {
  if (typeof document === "undefined") return false;
  try {
    if (isFullscreenActive()) {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        await (document as any).webkitExitFullscreen();
      } else if ((document as any).mozCancelFullScreen) {
        await (document as any).mozCancelFullScreen();
      } else if ((document as any).msExitFullscreen) {
        await (document as any).msExitFullscreen();
      }
      return false;
    } else {
      const elem = document.documentElement;
      if (elem.requestFullscreen) {
        await elem.requestFullscreen();
      } else if ((elem as any).webkitRequestFullscreen) {
        await (elem as any).webkitRequestFullscreen();
      } else if ((elem as any).mozRequestFullScreen) {
        await (elem as any).mozRequestFullScreen();
      } else if ((elem as any).msRequestFullscreen) {
        await (elem as any).msRequestFullscreen();
      }
      return true;
    }
  } catch (err) {
    console.warn("Fullscreen toggle rejected or restricted by iframe permissions:", err);
    return isFullscreenActive();
  }
}

export function subscribeToFullscreen(callback: (active: boolean) => void): () => void {
  if (typeof document === "undefined") return () => {};
  const handler = () => callback(isFullscreenActive());
  document.addEventListener("fullscreenchange", handler);
  document.addEventListener("webkitfullscreenchange", handler);
  document.addEventListener("mozfullscreenchange", handler);
  document.addEventListener("MSFullscreenChange", handler);
  return () => {
    document.removeEventListener("fullscreenchange", handler);
    document.removeEventListener("webkitfullscreenchange", handler);
    document.removeEventListener("mozfullscreenchange", handler);
    document.removeEventListener("MSFullscreenChange", handler);
  };
}

// Swift Glide Settings Storage & Types
export type GlideSpeed = "snappy" | "smooth" | "cinematic";
export type ViewportDeviceMode = "auto" | "mobile" | "tablet" | "desktop" | "ultrawide";

export interface GlideSettings {
  speed: GlideSpeed;
  durationMs: number;
  autoGlideTicker: boolean;
  hapticFeedback: boolean;
  keyboardShortcuts: boolean;
  swipeGestures: boolean;
  viewportMode: ViewportDeviceMode;
  worldWideSync: boolean;
}

const GLIDE_SETTINGS_KEY = "tokenworld_glide_settings";

export function getStoredGlideSettings(): GlideSettings {
  const defaults: GlideSettings = {
    speed: "smooth",
    durationMs: 300,
    autoGlideTicker: true,
    hapticFeedback: true,
    keyboardShortcuts: true,
    swipeGestures: true,
    viewportMode: "auto",
    worldWideSync: true,
  };

  if (typeof window === "undefined") return defaults;
  try {
    const raw = localStorage.getItem(GLIDE_SETTINGS_KEY);
    if (raw) {
      return { ...defaults, ...JSON.parse(raw) };
    }
  } catch {
    // Ignore
  }
  return defaults;
}

export function saveStoredGlideSettings(settings: GlideSettings): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(GLIDE_SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Ignore
  }
}

// Swift Glide Scroll Helpers (Up, Down, Left, Right)
export function glideToTop(smooth = true) {
  if (typeof window === "undefined") return;
  window.scrollTo({ top: 0, behavior: smooth ? "smooth" : "auto" });
}

export function glideToBottom(smooth = true) {
  if (typeof window === "undefined") return;
  window.scrollTo({
    top: document.documentElement.scrollHeight || document.body.scrollHeight,
    behavior: smooth ? "smooth" : "auto",
  });
}

export function glideToElement(elementId: string, offset = 80) {
  if (typeof window === "undefined") return;
  const el = document.getElementById(elementId);
  if (el) {
    const top = el.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior: "smooth" });
  }
}
