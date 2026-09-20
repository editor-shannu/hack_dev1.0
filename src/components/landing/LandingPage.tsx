'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { LoginPage } from '@/components/auth/LoginPage';
import {
  ArrowRight,
  Play,
  X,
  Shield,
  Cpu,
  Globe,
  Users,
  Pill,
  Calendar,
  BarChart2,
  FileText,
  Bell,
  Check,
  ChevronRight,
  Home,
  Clock,
  MoreHorizontal,
  Camera,
  Wifi,
  Battery,
} from 'lucide-react';

export function LandingPage() {
  const [showLoginPage, setShowLoginPage] = useState(false);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [activeInfoModal, setActiveInfoModal] = useState<'privacy' | 'terms' | 'contact' | null>(null);

  // Close modals on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsVideoModalOpen(false);
        setActiveInfoModal(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (showLoginPage) {
    return <LoginPage onSwitchToLanding={() => setShowLoginPage(false)} />;
  }

  return (
    <div className="relative h-screen w-full text-white font-sans overflow-hidden selection:bg-[#2098F2] selection:text-white flex flex-col bg-[#030914]">

      {/* ── BACKGROUND LAYER: CLEAN AMBIENT ROOM & LIGHTING ── */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        {/* Clean background photo of cozy home with family on the right, no text or phones */}
        <Image
          src="/images/landing-clean-bg.jpg"
          alt="Prescriptime Ambient Atmosphere"
          fill
          priority
          quality={95}
          className="object-cover object-center"
          sizes="100vw"
        />

        {/* Deep cinematic overlay & left shadow for perfect text contrast */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#030914] via-[#040D1E]/85 via-45% to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#030914] via-transparent to-[#030914]/40" />

        {/* Subtle cyan ambient glows behind center mockup */}
        <div className="absolute top-1/2 left-[55%] -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-[#2098F2]/15 rounded-full blur-[130px] pointer-events-none" />
        <div className="absolute bottom-16 left-[58%] -translate-x-1/2 w-[350px] h-[120px] bg-sky-400/20 rounded-full blur-[80px] pointer-events-none" />
      </div>

      {/* ── HEADER ── */}
      <header className="relative z-20 w-full px-6 sm:px-10 lg:px-16 pt-5 sm:pt-6 flex items-center justify-between flex-shrink-0">
        <div
          className="flex items-center gap-2.5 cursor-pointer select-none"
          onClick={() => setShowLoginPage(false)}
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#2098F2] to-[#0F58B6] flex items-center justify-center shadow-lg shadow-blue-500/30">
            <div className="w-5 h-3 rounded-full border-2 border-white transform -rotate-45 flex overflow-hidden">
              <div className="w-1/2 h-full bg-[#2098F2]" />
              <div className="w-1/2 h-full bg-white" />
            </div>
          </div>
          <div>
            <div className="text-[17px] font-black tracking-tight text-white leading-none">Prescriptime</div>
            <div className="text-[10px] text-sky-300/80 font-medium tracking-wide">Your Health. Organized.</div>
          </div>
        </div>
      </header>

      {/* ── MAIN VIEWPORT CONTENT ── */}
      <main className="relative z-10 flex-1 w-full flex items-center min-h-0 px-6 sm:px-10 lg:px-16">
        <div className="w-full h-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 items-center gap-6 xl:gap-8">

          {/* ════ LEFT COLUMN: COPY & ACTIONS (cols 1..6) ════ */}
          <div className="lg:col-span-6 flex flex-col gap-3 sm:gap-3.5 py-2 z-20 max-w-xl">
            {/* Tagline */}
            <p className="text-[10px] sm:text-[11px] font-bold tracking-[0.22em] text-slate-400 uppercase font-sans flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2098F2] animate-pulse" />
              FROM PRESCRIPTIONS TO A HEALTHIER TOMORROW
            </p>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-[46px] xl:text-[52px] font-serif font-black tracking-tight leading-[1.08] text-white">
              More Than <br />
              Prescriptions.<br />
              <span className="text-[#2098F2] font-sans font-black">A Healthier You.</span>
            </h1>

            {/* Subtitle */}
            <p className="text-xs sm:text-sm lg:text-[14.5px] text-slate-300/90 leading-relaxed max-w-[480px]">
              Prescriptime helps you digitize, organize, and stay on top of your medicines — so you and your loved ones live healthier, worry-free.
            </p>

            {/* Primary Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                id="hero-get-started-btn"
                onClick={() => setShowLoginPage(true)}
                className="h-[46px] sm:h-[50px] px-7 sm:px-8 rounded-full bg-[#2098F2] hover:bg-[#1985d8] active:scale-[0.97] text-white font-black text-xs sm:text-sm lg:text-base flex items-center gap-2.5 shadow-xl shadow-blue-500/35 transition-all duration-200 cursor-pointer group"
              >
                <span>Get Started</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                type="button"
                id="hero-watch-video-btn"
                onClick={() => setIsVideoModalOpen(true)}
                className="h-[46px] sm:h-[50px] px-5 sm:px-7 rounded-full bg-white/10 hover:bg-white/15 active:scale-[0.97] text-white font-bold text-xs sm:text-sm lg:text-base flex items-center gap-2.5 border border-white/20 backdrop-blur-md transition-all duration-200 cursor-pointer group"
              >
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Play className="w-3 sm:w-3.5 h-3 sm:h-3.5 fill-white text-white ml-0.5" />
                </div>
                <span>Watch Video</span>
              </button>
            </div>

            {/* 4 Mini Feature Pills in one clean row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2 pt-2 w-full max-w-lg">
              <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-xl bg-white/[0.06] border border-white/10 backdrop-blur-md text-[10px] font-medium text-slate-200 justify-center">
                <div className="w-4 h-4 rounded-md bg-[#0F3563] flex items-center justify-center text-[#2098F2] flex-shrink-0">
                  <Pill className="w-2.5 h-2.5" />
                </div>
                <span className="truncate">Organize Meds</span>
              </div>
              <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-xl bg-white/[0.06] border border-white/10 backdrop-blur-md text-[10px] font-medium text-slate-200 justify-center">
                <div className="w-4 h-4 rounded-md bg-[#0F3563] flex items-center justify-center text-[#2098F2] flex-shrink-0">
                  <Calendar className="w-2.5 h-2.5" />
                </div>
                <span className="truncate">Track Adherence</span>
              </div>
              <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-xl bg-white/[0.06] border border-white/10 backdrop-blur-md text-[10px] font-medium text-slate-200 justify-center">
                <div className="w-4 h-4 rounded-md bg-[#0F3563] flex items-center justify-center text-[#2098F2] flex-shrink-0">
                  <BarChart2 className="w-2.5 h-2.5" />
                </div>
                <span className="truncate">Stay Informed</span>
              </div>
              <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-xl bg-white/[0.06] border border-white/10 backdrop-blur-md text-[10px] font-medium text-slate-200 justify-center">
                <div className="w-4 h-4 rounded-md bg-[#0F3563] flex items-center justify-center text-[#2098F2] flex-shrink-0">
                  <Users className="w-2.5 h-2.5" />
                </div>
                <span className="truncate">For Families</span>
              </div>
            </div>
          </div>

          {/* ════ RIGHT COLUMN: RE-CREATED 3D PHONE MOCKUP & 4 GLOWING FLOATING CARDS (cols 7..12) ════ */}
          <div className="hidden lg:flex lg:col-span-6 h-full items-center justify-center relative select-none">

            {/* Elegant cursive quote over the family background */}
            <div className="absolute right-0 top-1/4 z-10 pointer-events-none transform -rotate-3 text-right">
              <span className="font-serif italic text-amber-100/90 text-xl xl:text-2xl leading-relaxed tracking-wide drop-shadow-[0_2px_12px_rgba(0,0,0,0.95)] block font-normal whitespace-nowrap">
                Care Today <br />
                for Brighter Tomorrows
              </span>
            </div>

            {/* Glowing Center Stage Container with 3 flex items: Left Cards, Phone, Right Cards */}
            <div className="relative flex items-center justify-center gap-3 xl:gap-4 z-20">

              {/* ── LEFT FLOATING CARDS COLUMN ── */}
              <div className="flex flex-col justify-between gap-24 z-30 flex-shrink-0 -mr-2">
                {/* Card 1: Scan Prescription */}
                <div className="w-36 xl:w-40 p-2.5 rounded-2xl bg-[#091B33]/90 border border-sky-400/50 backdrop-blur-xl shadow-[0_12px_30px_rgba(0,0,0,0.7),0_0_20px_rgba(32,152,242,0.4)] flex flex-col gap-1.5 transform hover:-translate-y-1 transition-transform">
                  <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-[#2098F2] to-[#0A4BA3] flex items-center justify-center text-white shadow-md shadow-blue-500/40">
                    <FileText className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white leading-tight">Scan Prescription</div>
                    <div className="text-[9.5px] text-slate-300/80 leading-snug mt-0.5">Upload or take a photo</div>
                  </div>
                </div>

                {/* Card 2: Organize Medicines */}
                <div className="w-36 xl:w-40 p-2.5 rounded-2xl bg-[#091B33]/90 border border-sky-400/50 backdrop-blur-xl shadow-[0_12px_30px_rgba(0,0,0,0.7),0_0_20px_rgba(32,152,242,0.4)] flex flex-col gap-1.5 transform hover:-translate-y-1 transition-transform">
                  <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-[#2098F2] to-[#0A4BA3] flex items-center justify-center text-white shadow-md shadow-blue-500/40">
                    <Pill className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white leading-tight">Organize Medicines</div>
                    <div className="text-[9.5px] text-slate-300/80 leading-snug mt-0.5">All in one place</div>
                  </div>
                </div>
              </div>

              {/* ── CENTER: PHONE MOCKUP WITH 3D PEDESTAL ── */}
              <div className="relative flex items-center justify-center flex-shrink-0">

                {/* 3D Glowing Pedestal Base */}
                <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 w-64 h-12 rounded-[100%] bg-gradient-to-b from-[#2098F2]/70 via-[#0A4BA3]/30 to-transparent border border-sky-400/50 blur-[1px] shadow-[0_0_50px_rgba(32,152,242,0.8)] pointer-events-none" />

                {/* Smartphone Device Frame */}
                <div className="relative w-[265px] xl:w-[285px] h-[510px] xl:h-[540px] rounded-[38px] bg-slate-950 p-2 border-[2.5px] border-slate-700 shadow-[0_30px_80px_rgba(0,0,0,0.95),0_0_40px_rgba(32,152,242,0.25)] ring-1 ring-white/20 z-20 flex flex-col overflow-hidden">

                  {/* Inner Screen Bezel */}
                  <div className="w-full h-full rounded-[30px] bg-[#071324] border border-white/10 flex flex-col overflow-hidden relative text-white">

                    {/* Top Status Bar with Dynamic Island */}
                    <div className="w-full px-4 pt-2 pb-0.5 flex items-center justify-between text-[10px] text-slate-300 z-10 flex-shrink-0">
                      <span className="font-semibold">9:41</span>
                      <div className="w-16 h-3.5 bg-black rounded-full mx-auto flex items-center justify-center gap-1 px-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-800" />
                        <div className="w-1 h-1 rounded-full bg-blue-500/60" />
                      </div>
                      <div className="flex items-center gap-1">
                        <Wifi className="w-2.5 h-2.5" />
                        <Battery className="w-3 h-3" />
                      </div>
                    </div>

                    {/* In-App Header */}
                    <div className="px-3 py-1 flex items-center justify-between flex-shrink-0">
                      <div className="flex items-center gap-1.5">
                        <div className="w-4 h-4 rounded bg-[#2098F2] flex items-center justify-center shadow-sm p-0.5">
                          <div className="w-2 h-1 rounded-full border border-white -rotate-45" />
                        </div>
                        <span className="text-[11px] font-black tracking-tight">Prescriptime</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-4.5 h-4.5 rounded-full bg-white/10 flex items-center justify-center relative">
                          <Bell className="w-2.5 h-2.5 text-slate-300" />
                          <span className="absolute top-0 right-0 w-1 h-1 bg-[#2098F2] rounded-full" />
                        </div>
                        <div className="w-4.5 h-4.5 rounded-full bg-gradient-to-tr from-sky-400 to-indigo-500 border border-white/30 flex items-center justify-center text-[8px] font-bold">
                          SK
                        </div>
                      </div>
                    </div>

                    {/* In-App Greeting */}
                    <div className="px-3 pt-0.5 flex-shrink-0">
                      <div className="text-[11px] font-bold text-white leading-tight">Good Morning,</div>
                      <div className="text-[8.5px] text-sky-300/80">Stay on track, stay healthy!</div>
                    </div>

                    {/* Calendar Strip */}
                    <div className="px-3 py-1 grid grid-cols-5 gap-1 flex-shrink-0">
                      {[
                        { day: 'Mon', date: '15' },
                        { day: 'Tue', date: '16' },
                        { day: 'Wed', date: '17', active: true },
                        { day: 'Thu', date: '18' },
                        { day: 'Fri', date: '19' },
                      ].map((item) => (
                        <div
                          key={item.day}
                          className={`rounded-lg py-0.5 text-center flex flex-col items-center transition-all ${
                            item.active
                              ? 'bg-[#2098F2] text-white shadow-md shadow-blue-500/40'
                              : 'bg-white/5 text-slate-400'
                          }`}
                        >
                          <span className="text-[7.5px] font-medium">{item.day}</span>
                          <span className="text-[9.5px] font-bold leading-tight">{item.date}</span>
                        </div>
                      ))}
                    </div>

                    {/* Card: Today's Medicines with Radial Progress */}
                    <div className="mx-3 p-1.5 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-between flex-shrink-0">
                      <div>
                        <div className="text-[9.5px] font-bold text-white">Today&apos;s Medicines</div>
                        <div className="text-[8.5px] text-emerald-400 flex items-center gap-1 mt-0.5">
                          <Check className="w-2 h-2" />
                          <span>3/4 taken</span>
                        </div>
                      </div>
                      <div className="relative w-7 h-7 flex items-center justify-center">
                        <svg className="w-7 h-7 transform -rotate-90" viewBox="0 0 36 36">
                          <path
                            className="text-white/10"
                            strokeWidth="3.5"
                            stroke="currentColor"
                            fill="none"
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          />
                          <path
                            className="text-[#2098F2]"
                            strokeDasharray="75, 100"
                            strokeWidth="3.5"
                            strokeLinecap="round"
                            stroke="currentColor"
                            fill="none"
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          />
                        </svg>
                        <span className="absolute text-[8px] font-extrabold text-white">75%</span>
                      </div>
                    </div>

                    {/* Medicines List */}
                    <div className="px-3 py-1 flex-1 flex flex-col gap-1 overflow-hidden">
                      {/* Med 1 */}
                      <div className="px-2 py-1 rounded-lg bg-white/[0.04] border border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <div className="w-4.5 h-4.5 rounded-md bg-blue-500/20 text-[#2098F2] flex items-center justify-center">
                            <Pill className="w-2.5 h-2.5" />
                          </div>
                          <div>
                            <div className="text-[9px] font-bold text-white leading-tight">Paracetamol 500mg</div>
                            <div className="text-[7.5px] text-slate-400">1 tablet • 8:00 AM</div>
                          </div>
                        </div>
                        <div className="w-3 h-3 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                          <Check className="w-2 h-2" />
                        </div>
                      </div>

                      {/* Med 2 */}
                      <div className="px-2 py-1 rounded-lg bg-white/[0.04] border border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <div className="w-4.5 h-4.5 rounded-md bg-rose-500/20 text-rose-400 flex items-center justify-center">
                            <Pill className="w-2.5 h-2.5" />
                          </div>
                          <div>
                            <div className="text-[9px] font-bold text-white leading-tight">Amlodipine 5mg</div>
                            <div className="text-[7.5px] text-slate-400">1 tablet • 2:00 PM</div>
                          </div>
                        </div>
                        <div className="w-3 h-3 rounded-full border border-slate-600" />
                      </div>

                      {/* Med 3 */}
                      <div className="px-2 py-1 rounded-lg bg-white/[0.04] border border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <div className="w-4.5 h-4.5 rounded-md bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                            <Pill className="w-2.5 h-2.5" />
                          </div>
                          <div>
                            <div className="text-[9px] font-bold text-white leading-tight">Metformin 500mg</div>
                            <div className="text-[7.5px] text-slate-400">1 tablet • 8:00 PM</div>
                          </div>
                        </div>
                        <div className="w-3 h-3 rounded-full border border-slate-600" />
                      </div>

                      {/* Next Follow-Up Banner */}
                      <div className="px-2 py-1 rounded-lg bg-sky-950/40 border border-sky-500/20 flex items-center justify-between mt-auto">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-2.5 h-2.5 text-[#2098F2]" />
                          <div>
                            <div className="text-[7px] font-bold text-sky-300 uppercase tracking-wider">Next Follow-Up</div>
                            <div className="text-[8px] text-white">12 Oct 2026 • Dr. S. Kumar</div>
                          </div>
                        </div>
                        <ChevronRight className="w-2.5 h-2.5 text-slate-400" />
                      </div>
                    </div>

                    {/* App Bottom Tab Bar */}
                    <div className="w-full px-2.5 py-1 bg-[#050E1A] border-t border-white/10 flex items-center justify-between text-[7.5px] text-slate-400 flex-shrink-0">
                      <div className="flex flex-col items-center text-[#2098F2]">
                        <Home className="w-2.5 h-2.5" />
                        <span className="text-[7px] mt-0.5">Home</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <FileText className="w-2.5 h-2.5" />
                        <span className="text-[7px] mt-0.5">Records</span>
                      </div>
                      <div className="-mt-2.5 w-6 h-6 rounded-full bg-gradient-to-tr from-[#2098F2] to-sky-400 text-white flex items-center justify-center shadow-lg shadow-blue-500/50">
                        <Camera className="w-3 h-3" />
                      </div>
                      <div className="flex flex-col items-center">
                        <Clock className="w-2.5 h-2.5" />
                        <span className="text-[7px] mt-0.5">Reminders</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <MoreHorizontal className="w-2.5 h-2.5" />
                        <span className="text-[7px] mt-0.5">More</span>
                      </div>
                    </div>

                  </div>
                </div>

              </div>

              {/* ── RIGHT FLOATING CARDS COLUMN ── */}
              <div className="flex flex-col justify-between gap-24 z-30 flex-shrink-0 -ml-2">
                {/* Card 3: Smart Reminders */}
                <div className="w-36 xl:w-40 p-2.5 rounded-2xl bg-[#091B33]/90 border border-sky-400/50 backdrop-blur-xl shadow-[0_12px_30px_rgba(0,0,0,0.7),0_0_20px_rgba(32,152,242,0.4)] flex flex-col gap-1.5 transform hover:-translate-y-1 transition-transform">
                  <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-[#2098F2] to-[#0A4BA3] flex items-center justify-center text-white shadow-md shadow-blue-500/40">
                    <Bell className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white leading-tight">Smart Reminders</div>
                    <div className="text-[9.5px] text-slate-300/80 leading-snug mt-0.5">Never miss a dose</div>
                  </div>
                </div>

                {/* Card 4: Track Progress */}
                <div className="w-36 xl:w-40 p-2.5 rounded-2xl bg-[#091B33]/90 border border-sky-400/50 backdrop-blur-xl shadow-[0_12px_30px_rgba(0,0,0,0.7),0_0_20px_rgba(32,152,242,0.4)] flex flex-col gap-1.5 transform hover:-translate-y-1 transition-transform">
                  <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-[#2098F2] to-[#0A4BA3] flex items-center justify-center text-white shadow-md shadow-blue-500/40">
                    <BarChart2 className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white leading-tight">Track Progress</div>
                    <div className="text-[9.5px] text-slate-300/80 leading-snug mt-0.5">Stay healthier, longer</div>
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>
      </main>

      {/* ── BOTTOM VALUE RIBBON (4 Columns) ── */}
      <section className="relative z-20 w-full px-6 sm:px-10 lg:px-16 pb-2 sm:pb-3 flex-shrink-0">
        <div className="rounded-2xl bg-[#071326]/80 border border-white/10 backdrop-blur-xl px-5 sm:px-8 py-3 sm:py-3.5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 w-full">
            {[
              { icon: <Shield className="w-4 h-4" />, title: 'Secure & Private', sub: 'Your data, your control' },
              { icon: <Cpu className="w-4 h-4" />, title: 'AI-Powered', sub: 'Smart, accurate, reliable' },
              { icon: <Users className="w-4 h-4" />, title: 'For Families', sub: 'Care for the ones you love' },
              { icon: <Globe className="w-4 h-4" />, title: 'Accessible', sub: 'Designed for everyone' },
            ].map(({ icon, title, sub }) => (
              <div key={title} className="flex items-center gap-3">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#082247] border border-[#2098F2]/40 flex items-center justify-center text-[#2098F2] shadow-sm shadow-blue-500/20 flex-shrink-0">
                  {icon}
                </div>
                <div className="min-w-0">
                  <div className="text-xs sm:text-[13px] font-black text-white leading-snug">{title}</div>
                  <div className="text-[10px] sm:text-[11px] text-slate-400 truncate">{sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="relative z-20 w-full px-6 sm:px-10 lg:px-16 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-400 flex-shrink-0">
        <div className="flex items-center gap-2 font-mono">
          <span className="font-extrabold tracking-widest text-[#2098F2]">PRESCRIPTIME</span>
          <span className="text-white/30 font-normal">|</span>
          <span className="text-slate-300 font-bold tracking-wider">DIGITAL HEALTH. REAL IMPACT.</span>
        </div>
        <div className="flex items-center gap-6 font-medium">
          {(['privacy', 'terms', 'contact'] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveInfoModal(key)}
              className="hover:text-white transition-colors cursor-pointer capitalize"
            >
              {key === 'privacy' ? 'Privacy' : key === 'terms' ? 'Terms' : 'Contact'}
            </button>
          ))}
        </div>
      </footer>

      {/* ── VIDEO MODAL ── */}
      {isVideoModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md"
          onClick={() => setIsVideoModalOpen(false)}
        >
          <div
            className="relative w-full max-w-4xl bg-[#091426] border border-white/20 rounded-3xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#0A1830]">
              <div className="flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-[#2098F2] animate-pulse" />
                <h3 className="text-sm font-bold text-white">Prescriptime Product Overview &amp; Demo</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsVideoModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer"
                aria-label="Close video modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Responsive YouTube Embed */}
            <div className="relative w-full aspect-video bg-black">
              <iframe
                className="w-full h-full"
                src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1&rel=0"
                title="Prescriptime Product Video"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 bg-[#0A1830] border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
              <span>Press Escape or click outside to close</span>
              <button
                type="button"
                onClick={() => { setIsVideoModalOpen(false); setShowLoginPage(true); }}
                className="px-4 py-1.5 rounded-full bg-[#2098F2] hover:bg-[#1985d8] text-white font-bold transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <span>Try Prescriptime</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── INFO MODALS (Privacy / Terms / Contact) ── */}
      {activeInfoModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md"
          onClick={() => setActiveInfoModal(null)}
        >
          <div
            className="relative w-full max-w-lg bg-[#0A1830] border border-white/15 rounded-3xl p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <h3 className="text-base font-bold text-white capitalize">
                {activeInfoModal === 'privacy' && 'Privacy Policy'}
                {activeInfoModal === 'terms' && 'Terms of Service'}
                {activeInfoModal === 'contact' && 'Contact Support'}
              </h3>
              <button
                type="button"
                onClick={() => setActiveInfoModal(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4 text-xs sm:text-sm text-slate-300 leading-relaxed max-h-[60vh] overflow-y-auto space-y-3">
              {activeInfoModal === 'privacy' && (
                <>
                  <p>Prescriptime takes your privacy with utmost seriousness. All prescription documents and health records are encrypted at rest and in transit.</p>
                  <p>Your medical data is never sold, shared with third-party advertisers, or used to train public AI models without your explicit consent.</p>
                  <p>You can export or permanently delete your stored records and account information at any time from your account settings.</p>
                </>
              )}
              {activeInfoModal === 'terms' && (
                <>
                  <p>By using Prescriptime, you agree that this application is designed as an organizational medication assistant and does not substitute for professional medical advice, diagnosis, or treatment.</p>
                  <p>Always verify prescription schedules and dosages with your licensed prescribing physician or pharmacist before taking medications.</p>
                  <p>Prescriptime is not liable for missed doses, device synchronization delays, or emergency situations. In an emergency, dial local emergency services immediately.</p>
                </>
              )}
              {activeInfoModal === 'contact' && (
                <>
                  <p>Need assistance or have feedback? Our care team is here to help:</p>
                  <div className="bg-white/5 rounded-2xl p-4 border border-white/10 space-y-2 text-xs">
                    <div><strong className="text-white">Email:</strong> support@prescriptime.app</div>
                    <div><strong className="text-white">Hours:</strong> Monday – Saturday, 9:00 AM – 7:00 PM IST</div>
                    <div><strong className="text-white">Location:</strong> Bangalore, India</div>
                  </div>
                </>
              )}
            </div>

            <div className="pt-4 border-t border-white/10 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveInfoModal(null)}
                className="px-5 py-2 rounded-full bg-white/10 hover:bg-white/15 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
