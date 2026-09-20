'use client';

import React from 'react';
import { LaserScanner } from '../ui/LaserScanner';
import { FileText, Cpu, Check, ShieldCheck, Search, Activity } from 'lucide-react';

interface OCRScanProgressProps {
  previewUrl?: string;
  fileName: string;
  progressPercent: number; // 0 to 100
  statusMessage: string;
  isPdf?: boolean;
}

export const OCRScanProgress: React.FC<OCRScanProgressProps> = ({
  previewUrl,
  fileName,
  progressPercent,
  statusMessage,
  isPdf = false,
}) => {
  const steps = [
    { label: 'Optical Reading', threshold: 30, icon: Search },
    { label: 'Document Classifier (Rx vs Lab vs Scan)', threshold: 75, icon: Activity },
    { label: 'Entity & Dosage Extraction', threshold: 95, icon: ShieldCheck },
  ];

  return (
    <div className="flex flex-col items-center justify-center p-4 sm:p-6 space-y-6">
      {/* Visual Scanning Viewport */}
      <div className="relative w-full max-w-md h-64 rounded-2xl overflow-hidden border border-cyber-cyan/30 bg-slate-950/80 shadow-2xl flex items-center justify-center">
        {previewUrl && !isPdf ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt="Prescription Document Preview"
            className="w-full h-full object-contain filter contrast-125 opacity-70"
          />
        ) : (
          <div className="flex flex-col items-center text-center p-4 space-y-2">
            <div className="w-16 h-16 rounded-2xl bg-cyber-cyan/10 border border-cyber-cyan/20 flex items-center justify-center text-cyber-cyan">
              <FileText className="w-8 h-8" />
            </div>
            <p className="text-sm font-medium text-slate-300 truncate max-w-xs">{fileName}</p>
            <p className="text-xs text-slate-500 font-mono">
              {isPdf ? 'Multi-page Medical PDF Document' : 'Document Ingestion Stream'}
            </p>
          </div>
        )}

        {/* GSAP Laser Scan Sweep */}
        <LaserScanner active={true} scanProgress={progressPercent} />
      </div>

      {/* Progress Metrics & Status */}
      <div className="w-full max-w-md space-y-4">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-cyber-cyan font-mono truncate max-w-[80%]">
            <Cpu className="w-4 h-4 animate-spin-slow flex-shrink-0" />
            <span className="truncate">{statusMessage}</span>
          </div>
          <span className="font-mono font-bold text-white">{progressPercent}%</span>
        </div>

        {/* Animated Progress Bar */}
        <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden border border-white/5">
          <div
            className="h-full bg-gradient-to-r from-cyber-cyan via-teal-400 to-cyber-emerald transition-all duration-300 shadow-[0_0_12px_#00f2fe]"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* 3-Stage Classification Pipeline Chips */}
        <div className="grid grid-cols-3 gap-2 pt-1">
          {steps.map((s, idx) => {
            const isCompleted = progressPercent >= s.threshold;
            const isCurrent =
              progressPercent < s.threshold &&
              (idx === 0 || progressPercent >= steps[idx - 1].threshold);
            return (
              <div
                key={idx}
                className={`p-2 rounded-xl border text-center transition-all flex flex-col items-center gap-1 ${
                  isCompleted
                    ? 'bg-cyber-emerald/10 border-cyber-emerald/30 text-cyber-emerald'
                    : isCurrent
                    ? 'bg-cyber-cyan/10 border-cyber-cyan/30 text-cyber-cyan animate-pulse'
                    : 'bg-slate-950/40 border-white/5 text-slate-500'
                }`}
              >
                <div className="w-4 h-4 flex items-center justify-center">
                  {isCompleted ? <Check className="w-3.5 h-3.5" /> : <s.icon className="w-3.5 h-3.5" />}
                </div>
                <span className="text-[10px] font-mono leading-tight">{s.label}</span>
              </div>
            );
          })}
        </div>

        <p className="text-[11px] text-slate-400 text-center font-mono">
          Shield verification: validating typography, medical classification &amp; clinical entities
        </p>
      </div>
    </div>
  );
};
