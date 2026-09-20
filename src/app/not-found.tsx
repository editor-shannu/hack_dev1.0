import React from 'react';
import Link from 'next/link';
import { Pill, Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-900/80 border border-slate-800 rounded-2xl p-8 text-center shadow-xl">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-teal-500/10 text-teal-400 mb-6">
          <Pill className="w-8 h-8" />
        </div>
        <h1 className="text-4xl font-extrabold text-white tracking-tight mb-2">404</h1>
        <h2 className="text-lg font-semibold text-slate-200 mb-2">Page Not Found</h2>
        <p className="text-sm text-slate-400 mb-6">
          The prescription, schedule, or page you were looking for doesn't exist or has moved.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold text-sm transition-all"
        >
          <Home className="w-4 h-4" />
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}
