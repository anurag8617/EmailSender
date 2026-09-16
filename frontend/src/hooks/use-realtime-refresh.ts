"use client";

import { useEffect, useRef } from "react";
import { subscribeRealtime, type RealtimeEvent } from "@/lib/realtime";

type RealtimeRefreshOptions = {
  enabled?: boolean;
  shouldRefresh?: (event: RealtimeEvent) => boolean;
  cooldownMs?: number;
};

export function useRealtimeRefresh(
  handler: () => void,
  { enabled = true, shouldRefresh, cooldownMs = 1000 }: RealtimeRefreshOptions = {}
) {
  const handlerRef = useRef(handler);
  const shouldRefreshRef = useRef(shouldRefresh);

  useEffect(() => {
    handlerRef.current = handler;
    shouldRefreshRef.current = shouldRefresh;
  }, [handler, shouldRefresh]);

  useEffect(() => {
    if (!enabled) return;
    let cooldownUntil = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const unsubscribe = subscribeRealtime((event) => {
      if (shouldRefreshRef.current && !shouldRefreshRef.current(event)) return;
      const now = Date.now();
      if (now < cooldownUntil) return;
      cooldownUntil = now + cooldownMs;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => handlerRef.current(), 0);
    });

    return () => {
      unsubscribe();
      if (timer) clearTimeout(timer);
    };
  }, [enabled, cooldownMs]);
}