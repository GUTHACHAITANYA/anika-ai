import React from "react";
import { AlertTriangle, Database, HelpCircle } from "lucide-react";

interface SkeletonProps {
  className?: string;
  count?: number;
}

export function SkeletonLoader({ className = "", count = 1 }: SkeletonProps) {
  return (
    <div className="space-y-2 w-full animate-pulse select-none">
      {Array.from({ length: count }).map((_, i) => (
        <div 
          key={i} 
          className={`h-4 bg-slate-800/60 rounded-xl border border-slate-700/20 ${className}`} 
        />
      ))}
    </div>
  );
}

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({ 
  title = "Authentication or Query Fault", 
  message = "A transient sandbox connection issue was detected. Please check credentials or retry.", 
  onRetry 
}: ErrorStateProps) {
  return (
    <div className="p-6 bg-rose-950/10 border border-rose-500/15 rounded-3xl text-center select-none space-y-3.5 max-w-sm mx-auto my-4">
      <div className="w-10 h-10 rounded-full bg-rose-500/10 border border-rose-500/25 flex items-center justify-center text-rose-450 mx-auto">
        <AlertTriangle className="w-5 h-5 text-rose-400" />
      </div>
      <div className="space-y-1">
        <h4 className="text-xs font-black text-rose-400 uppercase tracking-widest">{title}</h4>
        <p className="text-[10.5px] text-slate-400 leading-relaxed font-medium">{message}</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-rose-550/20 hover:bg-rose-550/30 border border-rose-500/30 hover:border-rose-500/40 text-rose-300 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer"
        >
          Retry Connection
        </button>
      )}
    </div>
  );
}

interface EmptyStateProps {
  title?: string;
  description?: string;
  actionButton?: React.ReactNode;
}

export function EmptyState({ 
  title = "No Records Discovered", 
  description = "Connect accounts or scan invoices to compile intelligent ledger visualizations.", 
  actionButton 
}: EmptyStateProps) {
  return (
    <div className="p-8 bg-slate-900/15 border border-slate-850 rounded-3xl text-center select-none space-y-4 max-w-sm mx-auto my-4">
      <div className="w-12 h-12 rounded-full bg-slate-950 border border-slate-900 flex items-center justify-center text-slate-550 mx-auto">
        <Database className="w-5 h-5 text-slate-500" />
      </div>
      <div className="space-y-1.5">
        <h4 className="text-xs font-black text-slate-300 uppercase tracking-widest">{title}</h4>
        <p className="text-[10.5px] text-slate-450 leading-relaxed font-semibold">{description}</p>
      </div>
      {actionButton && (
        <div className="pt-1.5 flex justify-center">
          {actionButton}
        </div>
      )}
    </div>
  );
}
