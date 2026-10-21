import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "./api";

/** Polls an endpoint; returns data, error and a manual refresh. Pauses while the tab is hidden. */
export function usePoll<T>(path: string | null, intervalMs = 3000, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const live = useRef(true);

  const refresh = useCallback(async () => {
    if (!path) return;
    try {
      const d = await api<T>(path);
      if (live.current) { setData(d); setError(null); }
    } catch (e) {
      if (live.current) setError((e as Error).message);
    }
  }, [path, ...deps]);

  useEffect(() => {
    live.current = true;
    setData(null);
    refresh();
    if (!intervalMs) return () => { live.current = false; };
    const id = setInterval(() => { if (!document.hidden) refresh(); }, intervalMs);
    return () => { live.current = false; clearInterval(id); };
  }, [refresh, intervalMs]);

  return { data, error, refresh };
}
