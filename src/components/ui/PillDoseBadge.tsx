'use client';

import React from 'react';
import { CheckCircle2, Clock, XCircle, AlertCircle } from 'lucide-react';

interface PillDoseBadgeProps {
  status: 'pending' | 'taken' | 'skipped' | 'snoozed';
  time?: string;
  size?: 'sm' | 'md';
}

export const PillDoseBadge: React.FC<PillDoseBadgeProps> = ({ status, time, size = 'md' }) => {
  const configs = {
    taken: {
      bg: 'bg-emerald-50 text-emerald-700 border-emerald-300',
      icon: CheckCircle2,
      label: 'Taken',
    },
    pending: {
      bg: 'bg-blue-50 text-[#0F58B6] border-blue-200',
      icon: Clock,
      label: 'Due',
    },
    skipped: {
      bg: 'bg-slate-100 text-slate-500 border-slate-200',
      icon: XCircle,
      label: 'Skipped',
    },
    snoozed: {
      bg: 'bg-amber-50 text-amber-700 border-amber-300',
      icon: AlertCircle,
      label: 'Snoozed',
    },
  };

  const current = configs[status] || configs.pending;
  const Icon = current.icon;

  const sizeClasses = size === 'sm' ? 'text-[11px] px-2 py-0.5' : 'text-xs px-2.5 py-1';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-medium font-mono ${current.bg} ${sizeClasses}`}
    >
      <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      <span>{current.label}</span>
      {time && <span className="opacity-75">· {time}</span>}
    </span>
  );
};
