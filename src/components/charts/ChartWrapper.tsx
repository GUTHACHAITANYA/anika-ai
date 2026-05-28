import React, { useState, useEffect, useRef } from "react";
import { BarChart3 } from "lucide-react";

/**
 * Custom Hook to track if the container element is ready with non-zero dimensions.
 * This delays rendering the Recharts component until the parent div has has a valid measured size.
 */
export function useChartReady() {
  const [isReady, setIsReady] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    // Direct width/height check first
    const rect = element.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      setIsReady(true);
    }

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setIsReady(true);
        }
      }
    });

    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, []);

  return { isReady, containerRef };
}

interface EmptyChartStateProps {
  message?: string;
  icon?: React.ReactNode;
}

/**
 * Muted empty state for charts
 */
export function EmptyChartState({ message = "No analytical data available in this interval.", icon }: EmptyChartStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full p-4 text-center bg-slate-950/25 border border-slate-800/40 rounded-2xl min-h-[140px]" id="empty-chart-container">
      {icon || <BarChart3 className="w-7 h-7 text-slate-500 mb-2 stroke-[1.5]" id="empty-chart-icon" />}
      <p className="text-[11px] text-slate-400 font-medium max-w-[220px]" id="empty-chart-message">{message}</p>
    </div>
  );
}

interface ChartWrapperProps {
  height: number;
  data: any[] | undefined | null;
  emptyMessage?: string;
  loading?: boolean;
  children: React.ReactNode;
}

/**
 * Reusable layout wrapper for Recharts elements.
 * Forces a fixed-height parent and guards against non-existent or narrow dimensions.
 */
export default function ChartWrapper({ height, data, emptyMessage, loading = false, children }: ChartWrapperProps) {
  const { isReady, containerRef } = useChartReady();

  const isEmpty = !data || data.length === 0;

  return (
    <div 
      ref={containerRef} 
      style={{ height }} 
      className="w-full relative overflow-hidden"
      id="chart-wrapper-container"
    >
      {loading ? (
        <div className="flex items-center justify-center h-full w-full" id="chart-loading-indicator">
          <div className="w-5 h-5 border-2 border-violet-500/20 border-t-violet-500 rounded-full animate-spin" />
        </div>
      ) : isEmpty ? (
        <EmptyChartState message={emptyMessage} />
      ) : !isReady ? (
        <div className="flex items-center justify-center h-full w-full" id="chart-measuring-indicator">
          <div className="w-4 h-4 border-2 border-slate-850 border-t-slate-500 rounded-full animate-spin" />
        </div>
      ) : (
        children
      )}
    </div>
  );
}
