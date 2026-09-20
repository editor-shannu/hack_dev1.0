'use client';

import React from 'react';
import { ShieldAlert, RefreshCw } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 font-sans antialiased">
        <div className="max-w-md w-full bg-slate-900 border border-rose-500/20 rounded-2xl p-8 text-center shadow-2xl">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-rose-500/10 text-rose-400 mb-6">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Critical System Error</h2>
          <p className="text-sm text-slate-400 mb-6">
            A critical application error occurred. Your health records and stored prescriptions are preserved in local storage.
          </p>
          <button
            onClick={() => reset()}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold text-sm transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            Reload Application
          </button>
        </div>
      </body>
    </html>
  );
}
