import { useState, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

/**
 * Pull-to-refresh hook. Pass queryKeys to invalidate on refresh.
 * Returns { refreshing, pullDistance } for optional UI indicator.
 */
export function usePullToRefresh(queryKeys = []) {
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startYRef = useRef(null);
  const THRESHOLD = 80;

  useEffect(() => {
    const onTouchStart = (e) => {
      if (window.scrollY === 0) {
        startYRef.current = e.touches[0].clientY;
      }
    };

    const onTouchMove = (e) => {
      if (startYRef.current === null) return;
      const delta = e.touches[0].clientY - startYRef.current;
      if (delta > 0 && window.scrollY === 0) {
        setPullDistance(Math.min(delta, THRESHOLD * 1.5));
      }
    };

    const onTouchEnd = async () => {
      if (pullDistance >= THRESHOLD) {
        setRefreshing(true);
        setPullDistance(0);
        await Promise.all(queryKeys.map((key) => queryClient.invalidateQueries({ queryKey: key })));
        setRefreshing(false);
      } else {
        setPullDistance(0);
      }
      startYRef.current = null;
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd);

    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [pullDistance, queryClient, queryKeys]);

  return { refreshing, pullDistance };
}