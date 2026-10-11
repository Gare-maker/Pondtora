import React, { useState, useEffect, useRef, useCallback } from "react";
import { ArrowDown, RotateCw, Check, Loader2 } from "lucide-react";

interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void;
  children: React.ReactNode;
  containerRef?: React.RefObject<HTMLElement | null>;
  disabled?: boolean;
  pullThreshold?: number;
}

export default function PullToRefresh({
  onRefresh,
  children,
  containerRef,
  disabled = false,
  pullThreshold = 65,
}: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const startYRef = useRef(0);
  const startXRef = useRef(0);
  const isDraggingRef = useRef(false);
  const canPullRef = useRef(false);

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (disabled || isRefreshing) return;

      const target = e.target as HTMLElement | null;
      // Do not initiate pull-to-refresh if touching form inputs or sliders
      if (target && target.closest("input, select, textarea, [role='slider'], button")) {
        return;
      }

      const scrollContainer = containerRef?.current || document.documentElement;
      const scrollTop = scrollContainer.scrollTop || window.scrollY || 0;

      // Only allow pull-to-refresh when strictly at the very top of the page
      if (scrollTop <= 1) {
        canPullRef.current = true;
        startYRef.current = e.touches[0].clientY;
        startXRef.current = e.touches[0].clientX;
        isDraggingRef.current = false;
      } else {
        canPullRef.current = false;
      }
    },
    [disabled, isRefreshing, containerRef]
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!canPullRef.current || disabled || isRefreshing) return;

      const currentY = e.touches[0].clientY;
      const currentX = e.touches[0].clientX;
      const dy = currentY - startYRef.current;
      const dx = currentX - startXRef.current;

      // If user is swiping horizontally, cancel gesture so tabs/sliders work smoothly
      if (Math.abs(dx) > Math.abs(dy)) {
        canPullRef.current = false;
        setPullDistance(0);
        return;
      }

      // If scrolling downward into page content, cancel gesture
      if (dy <= 0) {
        setPullDistance(0);
        return;
      }

      // Re-verify that container is still at top
      const scrollContainer = containerRef?.current || document.documentElement;
      const scrollTop = scrollContainer.scrollTop || window.scrollY || 0;
      if (scrollTop > 2) {
        canPullRef.current = false;
        setPullDistance(0);
        return;
      }

      isDraggingRef.current = true;
      // Fluid resistance curve
      const resistanceDistance = Math.min(95, Math.pow(dy, 0.85) * 1.8);
      setPullDistance(resistanceDistance);

      if (e.cancelable && dy > 10) {
        e.preventDefault();
      }
    },
    [disabled, isRefreshing, containerRef]
  );

  const handleTouchEnd = useCallback(async () => {
    if (!canPullRef.current || !isDraggingRef.current || disabled || isRefreshing) {
      canPullRef.current = false;
      isDraggingRef.current = false;
      setPullDistance(0);
      return;
    }

    canPullRef.current = false;
    isDraggingRef.current = false;

    if (pullDistance >= pullThreshold) {
      setIsRefreshing(true);
      setPullDistance(52); // Hold indicator at resting height

      // Micro haptic pulse if supported
      try {
        if (typeof navigator !== "undefined" && "vibrate" in navigator) {
          navigator.vibrate(10);
        }
      } catch {}

      try {
        const startTime = Date.now();
        await onRefresh();
        // Ensure indicator stays visible for at least 500ms so the user sees the refresh action
        const elapsed = Date.now() - startTime;
        if (elapsed < 500) {
          await new Promise(r => setTimeout(r, 500 - elapsed));
        }
        setIsSuccess(true);
        await new Promise(r => setTimeout(r, 600));
      } catch (err) {
        console.warn("Pull-to-refresh execution note:", err);
      } finally {
        setIsSuccess(false);
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }, [disabled, isRefreshing, pullDistance, pullThreshold, onRefresh]);

  useEffect(() => {
    const el = containerRef?.current || window;
    const options: AddEventListenerOptions = { passive: false };

    el.addEventListener("touchstart", handleTouchStart as any, { passive: true });
    el.addEventListener("touchmove", handleTouchMove as any, options);
    el.addEventListener("touchend", handleTouchEnd as any, { passive: true });
    el.addEventListener("touchcancel", handleTouchEnd as any, { passive: true });

    return () => {
      el.removeEventListener("touchstart", handleTouchStart as any);
      el.removeEventListener("touchmove", handleTouchMove as any);
      el.removeEventListener("touchend", handleTouchEnd as any);
      el.removeEventListener("touchcancel", handleTouchEnd as any);
    };
  }, [containerRef, handleTouchStart, handleTouchMove, handleTouchEnd]);

  const isTriggered = pullDistance >= pullThreshold;
  const showIndicator = pullDistance > 0 || isRefreshing;

  return (
    <div className="relative w-full flex-1 flex flex-col min-h-full">
      {/* Pull Indicator Pill */}
      {showIndicator && (
        <div
          className="absolute top-2 left-0 right-0 z-40 flex justify-center pointer-events-none transition-transform duration-150 ease-out"
          style={{
            transform: `translateY(${Math.max(0, pullDistance - 44)}px)`,
            opacity: Math.min(1, Math.max(0, (pullDistance - 10) / 35)),
          }}
        >
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 text-white text-xs font-semibold shadow-xl border border-slate-700/80 backdrop-blur-md transition-all">
            {isSuccess ? (
              <>
                <Check size={14} className="text-emerald-400 stroke-[3]" />
                <span className="text-emerald-300 font-bold">Records Updated ✓</span>
              </>
            ) : isRefreshing ? (
              <>
                <Loader2 size={14} className="text-emerald-400 animate-spin" />
                <span>Refreshing live data…</span>
              </>
            ) : isTriggered ? (
              <>
                <RotateCw size={14} className="text-emerald-400 animate-spin" />
                <span className="text-emerald-300 font-bold">Release to refresh</span>
              </>
            ) : (
              <>
                <ArrowDown
                  size={14}
                  className="text-slate-300 transition-transform duration-100"
                  style={{ transform: `rotate(${Math.min(180, (pullDistance / pullThreshold) * 180)}deg)` }}
                />
                <span className="text-slate-300">Pull down to refresh</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Main Page Content */}
      <div
        className="flex-1 flex flex-col w-full transition-transform duration-150 ease-out"
        style={{
          transform: pullDistance > 0 ? `translateY(${pullDistance * 0.4}px)` : undefined,
        }}
      >
        {children}
      </div>
    </div>
  );
}
