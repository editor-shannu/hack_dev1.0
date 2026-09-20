'use client';

import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { LoginPage } from '@/components/auth/LoginPage';
import { Pill, ArrowRight, Shield, Clock, Calendar, CheckCircle2, Stethoscope, Sparkles } from 'lucide-react';
import gsap from 'gsap';

// Code-split heavy Three.js canvas so it does not block initial critical path rendering
const ClinicalCanvas3D = dynamic(
  () => import('@/components/landing/ClinicalCanvas3D').then((m) => m.ClinicalCanvas3D),
  {
    ssr: false,
    loading: () => <div className="absolute inset-0 bg-slate-950/40 pointer-events-none" />,
  }
);

export function LandingPage() {
  const [showLoginPage, setShowLoginPage] = useState(false);
  const cardsContainerRef = useRef<HTMLDivElement>(null);
  const card1Ref = useRef<HTMLDivElement>(null);
  const card2Ref = useRef<HTMLDivElement>(null);
  const card3Ref = useRef<HTMLDivElement>(null);
  const card4Ref = useRef<HTMLDivElement>(null);

  // GSAP 3D Floating & Mouse Parallax for Background Prescription Cards
  useEffect(() => {
    // 1. Continuous gentle floating levitation
    const ctx = gsap.context(() => {
      gsap.to([card1Ref.current, card3Ref.current], {
        y: '+=15',
        rotationZ: '-=2',
        duration: 4.5,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });

      gsap.to([card2Ref.current, card4Ref.current], {
        y: '-=18',
        rotationZ: '+=2.5',
        duration: 5.2,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
        delay: 0.5,
      });
    });

    // 2. Mouse 3D tilt tracking
    const handleMouseMove = (e: MouseEvent) => {
      const { innerWidth, innerHeight } = window;
      const mouseX = (e.clientX / innerWidth - 0.5) * 2;
      const mouseY = (e.clientY / innerHeight - 0.5) * 2;

      if (cardsContainerRef.current) {
        gsap.to(cardsContainerRef.current, {
          rotationY: mouseX * 8,
          rotationX: -mouseY * 6,
          x: mouseX * 20,
          y: mouseY * 15,
          duration: 1.2,
          ease: 'power2.out',
          transformPerspective: 1200,
          transformStyle: 'preserve-3d',
        });
      }
    };

    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      ctx.revert();
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  if (showLoginPage) {
    return <LoginPage onSwitchToLanding={() => setShowLoginPage(false)} />;
  }

  return (
    <div className="relative min-h-screen w-full bg-gradient-to-br from-[#0B58B6] via-[#1B89E5] to-[#073D7C] overflow-hidden flex flex-col justify-between font-sans selection:bg-[#2098F2] selection:text-white">
      {/* 1. Ambient Radial Glow Orbs & Three.js 3D Floating Scene */}
      <ClinicalCanvas3D />

      <div
        className="absolute -top-[200px] -left-[200px] w-[1300px] h-[1300px] rounded-full pointer-events-none z-0"
        style={{
          background: 'radial-gradient(circle, rgba(32, 152, 241, 0.45) 0%, rgba(32, 152, 241, 0.15) 50%, transparent 75%)',
          filter: 'blur(140px)',
        }}
      />
      <div
        className="absolute -bottom-[250px] -right-[150px] w-[1000px] h-[1000px] rounded-full pointer-events-none z-0"
        style={{
          background: 'radial-gradient(circle, rgba(32, 152, 242, 0.3) 0%, transparent 70%)',
          filter: 'blur(120px)',
        }}
      />

      {/* 2. Background Rotated Cards (-25deg) with Interactive 3D Parallax */}
      <div
        ref={cardsContainerRef}
        className="absolute inset-0 pointer-events-none overflow-hidden z-0 opacity-25 hover:opacity-30 transition-opacity will-change-transform"
      >
        {/* Card 1: Top-Center / Left (transformed -25deg) */}
        <div
          ref={card1Ref}
          className="absolute -top-16 left-[25%] w-[680px] h-[640px] rounded-3xl bg-white/95 border border-white/60 p-6 hidden md:flex flex-col gap-4 will-change-transform"
          style={{
            transform: 'rotate(-25deg)',
            boxShadow: '20px 10px 50px rgba(0, 0, 0, 0.25)',
          }}
        >
          {/* Mockup Header: Patient & Clinic banner */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0F58B6] flex items-center justify-center font-bold">
                <Stethoscope className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800">Orthopedic &amp; Clinical Health Center</p>
                <p className="text-[10px] text-slate-400">Prescription Verification &amp; Medication Schedule</p>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-bold border border-emerald-200">
              Active Rx
            </span>
          </div>

          {/* Wait for Documents / Processing Card Banner */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50 to-sky-50 border border-blue-100 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-500/15 flex items-center justify-center text-[#0F58B6]">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">Wait For Prescription Verification</p>
              <p className="text-[11px] text-slate-500">Organizing prescription schedule and dose intervals</p>
            </div>
          </div>

          {/* Mock Medication Items */}
          <div className="space-y-2 pt-1">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Pill className="w-4 h-4 text-blue-600" />
                <div>
                  <p className="text-xs font-bold text-slate-800">Amoxicillin 500mg</p>
                  <p className="text-[10px] text-slate-400">TDS · 1-0-1 Post Meal</p>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">08:00 AM</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Pill className="w-4 h-4 text-emerald-600" />
                <div>
                  <p className="text-xs font-bold text-slate-800">Metformin 500mg</p>
                  <p className="text-[10px] text-slate-400">BD · With Breakfast &amp; Dinner</p>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">01:00 PM</span>
            </div>
          </div>
        </div>

        {/* Card 2: Top-Right (transformed -25deg) - Calendar & Month Schedule */}
        <div
          ref={card2Ref}
          className="absolute -top-32 right-[-5%] w-[620px] h-[600px] rounded-3xl bg-white/95 border border-white/60 p-6 hidden lg:flex flex-col gap-4 will-change-transform"
          style={{
            transform: 'rotate(-25deg)',
            boxShadow: '20px 10px 50px rgba(0, 0, 0, 0.25)',
          }}
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-bold text-slate-800">Medication Routine Calendar</span>
            </div>
            <span className="text-[10px] font-bold text-slate-400">October 2026</span>
          </div>

          <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold text-slate-400">
            <span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span>
          </div>
          <div className="grid grid-cols-7 gap-2 text-center text-xs">
            {Array.from({ length: 28 }).map((_, i) => (
              <div
                key={i}
                className={`h-9 rounded-xl flex items-center justify-center font-bold ${
                  i === 14
                    ? 'bg-[#2098F2] text-white shadow-md'
                    : i === 18
                    ? 'bg-emerald-500 text-white shadow-md'
                    : 'bg-slate-50 text-slate-600'
                }`}
              >
                {i + 1}
              </div>
            ))}
          </div>
        </div>

        {/* Card 3: Bottom-Left (transformed -25deg) */}
        <div
          ref={card3Ref}
          className="absolute bottom-[-180px] -left-20 w-[640px] h-[580px] rounded-3xl bg-white/95 border border-white/60 p-6 hidden md:flex flex-col gap-4 will-change-transform"
          style={{
            transform: 'rotate(-25deg)',
            boxShadow: '20px 10px 50px rgba(0, 0, 0, 0.25)',
          }}
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <span className="text-xs font-bold text-slate-800">Daily Medicine Schedule</span>
            <span className="text-[10px] font-bold text-emerald-600">Active</span>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-medium">
            ✓ Doses scheduled across active prescriptions
          </div>
        </div>

        {/* Card 4: Bottom-Right (transformed -25deg) - Clinical Care Roster */}
        <div
          ref={card4Ref}
          className="absolute -bottom-36 right-[18%] w-[650px] h-[550px] rounded-3xl bg-white/95 border border-white/60 p-6 hidden lg:flex flex-col gap-4 will-change-transform"
          style={{
            transform: 'rotate(-25deg)',
            boxShadow: '20px 10px 50px rgba(0, 0, 0, 0.25)',
          }}
        >
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="text-xs font-bold text-slate-800">Prescribing Physicians</span>
            <span className="text-[10px] text-blue-600 font-semibold">4 Registered</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                DR
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800">Dr. Darlene Robertson</p>
                <p className="text-[10px] text-slate-400">Head Surgeon</p>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                DS
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800">Dr. Schlimmer</p>
                <p className="text-[10px] text-slate-400">Cardiologist</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Top Clean Navigation Header */}
      <header className="relative z-20 w-full max-w-7xl mx-auto px-4 sm:px-6 pt-4 sm:pt-6 flex items-center justify-between">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-2xl bg-white shadow-md flex items-center justify-center border border-white/80 shrink-0">
            <Pill className="w-5 h-5 sm:w-6 sm:h-6 text-[#0F58B6] transform -rotate-45" />
          </div>
          <div>
            <span className="text-xl sm:text-2xl font-black tracking-tight text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
              Prescriptime
            </span>
            <span className="hidden sm:inline-block ml-2.5 px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-bold tracking-wider backdrop-blur-md border border-white/30">
              DIGITAL PRESCRIPTION EDITION
            </span>
          </div>
        </div>
      </header>

      {/* 4. Center Main Stage: Hero Typography (Left) & Crisp Card (Right) */}
      <main className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-12 lg:py-20 my-auto flex flex-col lg:flex-row items-center lg:items-center justify-between gap-8 lg:gap-12">
        
        {/* Left / Center: Hero Typography with High Contrast */}
        <div className="w-full lg:flex-1 lg:max-w-3xl xl:max-w-4xl space-y-3 sm:space-y-4 text-center lg:text-left min-w-0">
          {/* Subtitle Line 1: PRESCRIPTION ORGANIZER & MEDICINE SCHEDULES */}
          <div className="flex items-center justify-center lg:justify-start">
            <span className="px-3 sm:px-3.5 py-1 rounded-full bg-white/15 text-sky-100 font-extrabold text-[10px] sm:text-xs md:text-sm uppercase tracking-wider sm:tracking-[0.2em] backdrop-blur-md border border-white/25 shadow-sm text-center leading-tight">
              PRESCRIPTION ORGANIZER &amp; MEDICINE SCHEDULES
            </span>
          </div>

          {/* Main Huge Brand Title: PRESCRIPTIME (whitespace-nowrap ensures 'E' never wraps down) */}
          <h1 className="text-3xl xs:text-4xl sm:text-6xl md:text-7xl lg:text-[76px] xl:text-[92px] font-black text-white tracking-tighter leading-none drop-shadow-[0_8px_30px_rgba(0,0,0,0.45)] select-none whitespace-nowrap">
            PRESCRIPTIME
          </h1>

          {/* Subtitle Line 3: DIGITAL PRESCRIPTION EDITION */}
          <div className="pt-1">
            <p className="text-base xs:text-lg sm:text-xl md:text-2xl font-black text-white uppercase tracking-wider sm:tracking-[0.2em] drop-shadow-[0_4px_12px_rgba(0,0,0,0.35)]">
              DIGITAL PRESCRIPTION EDITION
            </p>
          </div>

          {/* Clean Description */}
          <p className="text-xs sm:text-sm md:text-base text-white/95 max-w-lg mx-auto lg:mx-0 font-medium drop-shadow-[0_2px_8px_rgba(0,0,0,0.3)] leading-relaxed pt-1">
            Digitally organize doctor prescriptions, decipher handwriting, manage automated dose schedules, and track medication routines.
          </p>
        </div>

        {/* Right: Crisp, High-Contrast Frosted Card with GET STARTED button */}
        <div className="w-full lg:w-auto flex justify-center">
          <div
            className="w-full max-w-[480px] lg:w-[500px] rounded-[24px] sm:rounded-[32px] p-5 sm:p-8 md:p-9 relative overflow-hidden transition-all duration-300 hover:shadow-2xl bg-white/95 backdrop-blur-2xl border border-white shadow-[0_25px_60px_rgba(0,0,0,0.25)]"
          >
            {/* Ambient inner soft sheen */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-blue-100/40 rounded-full blur-2xl pointer-events-none" />

            <div className="relative z-10 space-y-4 sm:space-y-6">
              {/* Header inside frosted card */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 rounded-full bg-blue-50 border border-blue-200">
                  <div className="w-2 sm:w-2.5 h-2 sm:h-2.5 rounded-full bg-blue-500 animate-pulse" />
                  <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-blue-800">
                    Prescription Organizer
                  </span>
                </div>
                <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-widest font-mono">
                  Prescriptime
                </span>
              </div>

              {/* Action Title inside card */}
              <div className="space-y-1 sm:space-y-2">
                <h3 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
                  Manage Your Prescriptions
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
                  Sign in to view your daily medicine schedules, active prescriptions, and dose reminders.
                </p>
              </div>

              {/* The #2098F2 Hero Pill Button renamed to GET STARTED */}
              <button
                type="button"
                onClick={() => setShowLoginPage(true)}
                id="landing-hero-standard-login-btn"
                className="w-full h-[58px] sm:h-[72px] rounded-[20px] sm:rounded-[28px] bg-[#2098F2] hover:bg-[#1588de] active:scale-[0.98] text-white font-extrabold text-xl sm:text-2xl md:text-3xl flex items-center justify-center gap-3 sm:gap-4 shadow-xl shadow-blue-500/35 transition-all duration-200 group cursor-pointer border border-white/40"
              >
                <span className="tracking-wider uppercase">GET STARTED</span>
                <ArrowRight className="w-6 h-6 sm:w-7 sm:h-7 text-white transform group-hover:translate-x-2 transition-transform" />
              </button>

              {/* Zero manual entry trust note */}
              <div className="pt-2 flex items-center justify-end text-xs text-slate-500 font-semibold border-t border-slate-100/80">
                <span className="text-[10px] sm:text-[11px] text-slate-500 font-mono font-medium">
                  Zero Manual Entry
                </span>
              </div>
            </div>
          </div>
        </div>

      </main>

      {/* 5. Minimalist Bottom Footer */}
      <footer className="relative z-20 w-full max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 border-t border-white/20 flex flex-col sm:flex-row items-center justify-between text-[11px] sm:text-xs text-white/90 gap-2 text-center sm:text-left drop-shadow-sm">
        <p>© 2026 Prescriptime. Digital Prescription Organizer &amp; Medicine Schedules.</p>
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 text-[10px] sm:text-[11px]">
          <span>AI Prescription Vision</span>
          <span>•</span>
          <span>Medicine Schedule Overview</span>
          <span>•</span>
          <span>Built on Firebase</span>
        </div>
      </footer>
    </div>
  );
}

