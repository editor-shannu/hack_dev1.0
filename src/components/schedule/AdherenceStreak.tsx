'use client';

import React from 'react';
import { Flame, Award, CheckCircle2, TrendingUp, Clock } from 'lucide-react';

interface AdherenceStreakProps {
  currentStreakDays: number;
  bestStreakDays: number;
  adherenceRate: number; // 0 to 100
  takenCount: number;
  totalCount: number;
  dateLabel?: string;
}

export const AdherenceStreak: React.FC<AdherenceStreakProps> = ({
  currentStreakDays,
  bestStreakDays,
  adherenceRate,
  takenCount,
  totalCount,
  dateLabel = 'today',
}) => {
  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const hasDoses = totalCount > 0;
  const hasRealStreak = currentStreakDays > 0;

  // If user has no active routine set for this date, show clean informative empty state
  if (!hasDoses) {
    return (
      <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
        <div className="w-11 h-11 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900/50 flex items-center justify-center flex-shrink-0">
          <Clock className="w-5 h-5 text-[#0F58B6] dark:text-blue-400" />
        </div>
        <div>
          <p className="text-sm font-bold text-slate-800 dark:text-white">No routine scheduled for {dateLabel}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Configure your medication routine using &ldquo;Set Reminders &amp; Schedule&rdquo; to start recording date-wise adherence trends.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        {/* Left: Streak & Today's Adherence Rate */}
        <div className="flex items-center gap-5">
          {/* Radial Adherence Meter */}
          <div className="relative flex items-center justify-center w-20 h-20">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-slate-100"
                strokeWidth="3.2"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="text-emerald-500 transition-all duration-700 ease-out"
                strokeDasharray={`${adherenceRate}, 100`}
                strokeWidth="3.2"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-base font-bold text-slate-900 font-mono">
                {adherenceRate}%
              </span>
              <span className="text-[9px] uppercase tracking-wider text-slate-500 font-mono font-semibold truncate max-w-[55px] text-center">
                {dateLabel}
              </span>
            </div>
          </div>

          {/* Streak Info */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="p-1 rounded-md bg-amber-100 text-amber-600">
                <Flame className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                {hasRealStreak
                  ? `${currentStreakDays} Day Adherence Streak!`
                  : 'Daily Adherence Progress'}
              </h3>
            </div>
            <p className="text-xs text-slate-600">
              {`${takenCount} of ${totalCount} scheduled doses logged for ${dateLabel}. Keep up the rhythm!`}
            </p>
            <div className="flex items-center gap-3 mt-2 text-[11px] font-mono text-slate-500">
              {bestStreakDays > 0 && (
                <>
                  <span className="flex items-center gap-1 font-semibold">
                    <Award className="w-3.5 h-3.5 text-[#0F58B6]" />
                    Best Streak: {bestStreakDays} Days
                  </span>
                  <span>·</span>
                </>
              )}
              {adherenceRate > 0 && (
                <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>Optimal Efficacy Range</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Weekly Check-in Pills — only shown when real streak data exists */}
        {hasRealStreak && (
          <div className="flex flex-col items-start md:items-end">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-bold mb-2">
              Weekly Routine Consistency
            </span>
            <div className="flex items-center gap-2">
              {days.map((day, idx) => {
                // Determine today's day index (0 = Monday, 1 = Tuesday ... 6 = Sunday)
                const now = new Date();
                const jsDay = now.getDay();
                const todayIndex = jsDay === 0 ? 6 : jsDay - 1;
                const isToday = idx === todayIndex;
                const isPast = idx < todayIndex;
                const isFuture = idx > todayIndex;

                // Today is completed if adherence is 100% or all scheduled doses logged taken
                const isTodayCompleted = isToday && (adherenceRate >= 100 || (takenCount > 0 && takenCount === totalCount));

                // Past days are completed if within the active streak
                const daysBack = todayIndex - idx;
                const isPastCompleted = isPast && daysBack < currentStreakDays;
                const isCompleted = isTodayCompleted || isPastCompleted;

                return (
                  <div key={idx} className="flex flex-col items-center gap-1">
                    <div
                      title={isToday ? `Today (${day}) - ${isCompleted ? 'Completed' : 'In Progress'}` : `${day} - ${isCompleted ? 'Completed' : isPast ? 'Missed' : 'Upcoming'}`}
                      className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-mono font-bold transition-all ${
                        isCompleted
                          ? 'bg-emerald-500 text-white shadow-sm'
                          : isToday
                          ? 'bg-blue-50 text-[#0F58B6] border-2 border-[#0F58B6] font-extrabold'
                          : 'bg-slate-100 text-slate-400 border border-slate-200'
                      }`}
                    >
                      {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : day}
                    </div>
                    <span className={`text-[9px] font-mono font-semibold ${isToday ? 'text-[#0F58B6] font-bold underline' : 'text-slate-400'}`}>
                      {day}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
