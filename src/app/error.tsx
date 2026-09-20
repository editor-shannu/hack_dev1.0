'use client';

import React, { useEffect } from 'react';
import { AlertTriangle, RefreshCw, Home, ShieldAlert } from 'lucide-react';

export default function GlobalErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log exception safely without leaking PII
    console.error('Prescriptime unhandled client error boundary caught exception:', error.message, error.digest);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 selection:bg-teal-500/30">
      <div className="max-w-md w-full bg-slate-900/90 backdrop-blur-xl border border-rose-500/20 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-rose-950/30 text-center relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 mb-6 shadow-inner">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight mb-2">
          Something interrupted your routine
        </h2>

        <p className="text-sm text-slate-400 mb-6 leading-relaxed">
          Prescriptime encountered an unexpected error while loading this view. Your stored prescriptions and adherence data remain safe in offline storage.
        </p>

        {error?.digest && (
          <div className="mb-6 p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 text-xs text-slate-500 font-mono select-all">
            Incident ID: {error.digest}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => reset()}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold text-sm transition-all duration-200 shadow-lg shadow-teal-500/20 active:scale-[0.98]"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>

          <button
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.location.href = '/';
              }
            }}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-sm border border-slate-700 transition-all duration-200 active:scale-[0.98]"
          >
            <Home className="w-4 h-4" />
            Go to Home
          </button>
        </div>
      </div>
    </div>
  );
}
