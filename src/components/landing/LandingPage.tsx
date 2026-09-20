'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { LoginPage } from '@/components/auth/LoginPage';
import {
  ArrowRight,
  Play,
  X,
  Shield,
  Zap,
  Heart,
  Users,
  Activity,
  Check,
  Calendar,
  Bell,
  BarChart3,
  Camera,
  FolderLock,
  ExternalLink,
} from 'lucide-react';

export function LandingPage() {
  const [showLoginPage, setShowLoginPage] = useState(false);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [activeInfoModal, setActiveInfoModal] = useState<'privacy' | 'terms' | 'contact' | null>(null);

  // Close modal on Escape key press
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
    <div className="relative min-h-screen w-full bg-[#070D18] text-white font-sans overflow-x-hidden selection:bg-[#2098F2] selection:text-white flex flex-col justify-between">
      {/* 1. Full-Bleed Atmospheric Background Plate (Image 2) */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <Image
          src="/images/landing-bg.jpg"
          alt="Prescriptime Clinic & Medicine Organization Atmosphere"
          fill
          priority
          className="object-cover object-center"
          sizes="100vw"
        />
        {/* Subtle Vignette & Dark Contrast Scrim on Left for Typography Legibility */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#070D18]/90 via-[#070D18]/70 to-transparent lg:to-transparent pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#070D18] via-transparent to-[#070D18]/40 pointer-events-none" />
      </div>

      {/* 2. Top Header Navigation */}
      <header className="relative z-20 w-full max-w-[1440px] mx-auto px-6 sm:px-10 lg:px-14 pt-6 sm:pt-8 flex items-center justify-between">
        {/* Brand Logo & Tagline (Pill icon with blue and white) */}
        <div className="flex items-center gap-3 group cursor-pointer" onClick={() => setShowLoginPage(false)}>
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#2098F2] to-[#0F58B6] p-0.5 shadow-lg shadow-blue-500/25 flex items-center justify-center">
            <div className="w-full h-full rounded-[14px] bg-[#0A1628] flex items-center justify-center relative overflow-hidden">
              {/* Modern Diagonal Capsule / Pill Icon */}
              <div className="w-6 h-3.5 rounded-full border-2 border-white transform -rotate-45 relative flex overflow-hidden shadow-sm">
                <div className="w-1/2 h-full bg-[#2098F2]" />
                <div className="w-1/2 h-full bg-white" />
              </div>
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-xl sm:text-2xl font-black tracking-tight text-white leading-none">
              Prescriptime
            </span>
            <span className="text-[11px] sm:text-xs text-sky-200/80 font-medium tracking-wide mt-1">
              Your Health. Organized.
            </span>
          </div>
        </div>

        {/* Top Right Quick Sign In */}
        <button
          type="button"
          onClick={() => setShowLoginPage(true)}
          className="px-4 sm:px-5 py-2 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-xs sm:text-sm font-bold text-white backdrop-blur-md border border-white/20 transition-all duration-200 cursor-pointer shadow-sm"
        >
          Sign In
        </button>
      </header>

      {/* 3. Hero Main Stage */}
      <main className="relative z-10 w-full max-w-[1440px] mx-auto px-6 sm:px-10 lg:px-14 py-8 sm:py-12 my-auto grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
        
        {/* LEFT COLUMN: Hero Copy & Actions */}
        <div className="lg:col-span-6 xl:col-span-5 space-y-6 sm:space-y-7 text-left">
          
          {/* Tagline Pill Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#0D1B30]/80 border border-[#2098F2]/30 backdrop-blur-xl shadow-lg shadow-blue-900/30">
            <div className="w-5 h-5 rounded-full bg-[#2098F2]/20 flex items-center justify-center text-[#2098F2]">
              <Activity className="w-3.5 h-3.5 animate-pulse" />
            </div>
            <span className="text-[11px] sm:text-xs font-extrabold uppercase tracking-wider text-sky-200">
              From Prescriptions to a Healthier Tomorrow
            </span>
          </div>

          {/* Main Huge Typography Headline */}
          <div className="space-y-1">
            <h1 className="text-4xl sm:text-6xl xl:text-[68px] font-black text-white tracking-tight leading-[1.08] drop-shadow-[0_4px_24px_rgba(0,0,0,0.5)]">
              More Than <br />
              Prescriptions. <br />
              <span className="text-[#2098F2] drop-shadow-[0_0_35px_rgba(32,152,242,0.6)]">
                A Healthier You.
              </span>
            </h1>
          </div>

          {/* Explanatory Subtitle */}
          <p className="text-sm sm:text-base md:text-lg text-slate-300 font-normal leading-relaxed max-w-lg drop-shadow-sm">
            Prescriptime helps you digitize, organize, and stay on top of your medicines — so you and your loved ones live healthier, worry-free.
          </p>

          {/* Call to Action Buttons */}
          <div className="flex flex-wrap items-center gap-4 pt-2">
            {/* Primary Action: Get Started */}
            <button
              type="button"
              id="hero-get-started-btn"
              onClick={() => setShowLoginPage(true)}
              className="h-[52px] sm:h-[58px] px-8 sm:px-10 rounded-full bg-[#2098F2] hover:bg-[#1985d8] active:scale-[0.97] text-white font-black text-base sm:text-lg flex items-center gap-3 shadow-xl shadow-blue-500/35 transition-all duration-200 cursor-pointer group border border-white/20"
            >
              <span>Get Started</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1.5 transition-transform" />
            </button>

            {/* Secondary Action: Watch Video Modal Trigger */}
            <button
              type="button"
              id="hero-watch-video-btn"
              onClick={() => setIsVideoModalOpen(true)}
              className="h-[52px] sm:h-[58px] px-6 sm:px-8 rounded-full bg-slate-900/60 hover:bg-slate-800/80 active:scale-[0.97] text-white font-bold text-sm sm:text-base flex items-center gap-3 backdrop-blur-xl border border-white/25 shadow-lg shadow-black/30 transition-all duration-200 cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                <Play className="w-4 h-4 fill-white text-white ml-0.5" />
              </div>
              <span>Watch Video</span>
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: 3D Smartphone, Floating Glass Cards & Pedestal Showcase (Image 1) */}
        <div className="lg:col-span-6 xl:col-span-7 relative flex items-center justify-center lg:justify-end">
          <div className="relative w-full max-w-[620px] aspect-[4/3] sm:aspect-[16/11] rounded-3xl overflow-hidden shadow-2xl transition-all duration-500 hover:scale-[1.01]">
            {/* High-Resolution 3D Render Composite */}
            <Image
              src="/images/landing-composite.jpg"
              alt="Prescriptime Mobile Medication App & 3D Interactive Showcase"
              fill
              priority
              className="object-cover object-right sm:object-center"
              sizes="(max-width: 1024px) 100vw, 680px"
            />
            {/* Soft border and inner glass ambient glow */}
            <div className="absolute inset-0 rounded-3xl border border-white/20 pointer-events-none shadow-[inset_0_0_30px_rgba(32,152,242,0.15)]" />
          </div>
        </div>

      </main>

      {/* 4. Bottom Value Proposition Ribbon & Clinical Quote */}
      <section className="relative z-10 w-full max-w-[1440px] mx-auto px-6 sm:px-10 lg:px-14 py-4 sm:py-6">
        <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-[#091426]/75 backdrop-blur-xl border border-white/15 shadow-2xl flex flex-col xl:flex-row items-center justify-between gap-6">
          
          {/* 4 Value Pillars */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 w-full xl:w-auto flex-1">
            {/* 1. Secure & Private */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#0B254A] border border-[#2098F2]/30 flex items-center justify-center text-[#2098F2] flex-shrink-0 shadow-sm">
                <Shield className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs sm:text-sm font-black text-white leading-snug">Secure &amp; Private</h4>
                <p className="text-[11px] sm:text-xs text-slate-400 font-medium truncate">Your data, your control</p>
              </div>
            </div>

            {/* 2. AI-Powered */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#0B254A] border border-[#2098F2]/30 flex items-center justify-center text-[#2098F2] flex-shrink-0 shadow-sm">
                <Zap className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs sm:text-sm font-black text-white leading-snug">AI-Powered</h4>
                <p className="text-[11px] sm:text-xs text-slate-400 font-medium truncate">Smart &amp; accurate</p>
              </div>
            </div>

            {/* 3. Built for You */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#0B254A] border border-[#2098F2]/30 flex items-center justify-center text-[#2098F2] flex-shrink-0 shadow-sm">
                <Heart className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs sm:text-sm font-black text-white leading-snug">Built for You</h4>
                <p className="text-[11px] sm:text-xs text-slate-400 font-medium truncate">Simple. Reliable. Effective.</p>
              </div>
            </div>

            {/* 4. For Families */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#0B254A] border border-[#2098F2]/30 flex items-center justify-center text-[#2098F2] flex-shrink-0 shadow-sm">
                <Users className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs sm:text-sm font-black text-white leading-snug">For Families</h4>
                <p className="text-[11px] sm:text-xs text-slate-400 font-medium truncate">Care for the ones you love</p>
              </div>
            </div>
          </div>

          {/* Vertical Separator (Desktop) */}
          <div className="hidden xl:block w-[1px] h-10 bg-white/20 mx-2" />

          {/* Inspirational Quote on Right */}
          <div className="w-full xl:w-auto text-center xl:text-right border-t xl:border-t-0 pt-3 xl:pt-0 border-white/10">
            <p className="text-xs sm:text-sm font-semibold text-slate-200 italic">
              &ldquo;Good health gives you the freedom to do more.&rdquo;
            </p>
            <div className="w-12 h-0.5 bg-[#2098F2] rounded-full mx-auto xl:ml-auto xl:mr-0 mt-1.5" />
          </div>

        </div>
      </section>

      {/* 5. Minimalist Clean Footer */}
      <footer className="relative z-10 w-full max-w-[1440px] mx-auto px-6 sm:px-10 lg:px-14 py-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-3">
        <p>© 2026 Prescriptime. All rights reserved.</p>
        <div className="flex items-center gap-4 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveInfoModal('privacy')}
            className="hover:text-white transition-colors cursor-pointer"
          >
            Privacy
          </button>
          <span>|</span>
          <button
            type="button"
            onClick={() => setActiveInfoModal('terms')}
            className="hover:text-white transition-colors cursor-pointer"
          >
            Terms
          </button>
          <span>|</span>
          <button
            type="button"
            onClick={() => setActiveInfoModal('contact')}
            className="hover:text-white transition-colors cursor-pointer"
          >
            Contact
          </button>
        </div>
      </footer>

      {/* 6. Video Modal Popup (Mini Pop Up Showing YouTube Video + Close Option) */}
      {isVideoModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md animate-fadeIn"
          onClick={() => setIsVideoModalOpen(false)}
        >
          <div
            className="relative w-full max-w-4xl rounded-3xl bg-[#0A1322] border border-[#2098F2]/40 shadow-[0_25px_70px_rgba(0,0,0,0.8)] overflow-hidden animate-scaleUp"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header Bar */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/15 bg-[#0D1A2D]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#2098F2]/20 flex items-center justify-center text-[#2098F2]">
                  <Play className="w-4 h-4 fill-[#2098F2]" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-white">Prescriptime Product Overview</h3>
                  <p className="text-[11px] text-slate-400">Discover smart prescription organization &amp; dose tracking</p>
                </div>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => setIsVideoModalOpen(false)}
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-white flex items-center justify-center transition-all cursor-pointer"
                aria-label="Close video player"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Responsive 16:9 YouTube Video Player */}
            <div className="relative w-full aspect-video bg-black">
              <iframe
                src="https://www.youtube.com/embed/9No-FiEInLA?autoplay=1&rel=0"
                title="Prescriptime Digital Prescription Overview Video"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 w-full h-full"
              />
            </div>

            {/* Modal Footer Call to Action */}
            <div className="px-6 py-4 bg-[#091424] flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-white/10">
              <p className="text-xs text-slate-300 text-center sm:text-left">
                Ready to take control of your medication schedules and prescriptions?
              </p>
              <button
                type="button"
                onClick={() => {
                  setIsVideoModalOpen(false);
                  setShowLoginPage(true);
                }}
                className="px-5 py-2 rounded-full bg-[#2098F2] hover:bg-[#1885d8] text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-2"
              >
                <span>Get Started Free</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Informational Dialog (Privacy / Terms / Contact) */}
      {activeInfoModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setActiveInfoModal(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-[#0D192E] border border-white/20 p-6 shadow-2xl text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <h3 className="text-lg font-black text-white capitalize">{activeInfoModal} Information</h3>
              <button
                type="button"
                onClick={() => setActiveInfoModal(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {activeInfoModal === 'privacy' && (
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Your medical prescriptions, records, and schedules are strictly private and encrypted. Prescriptime adheres to zero-trust data access standards and never shares clinical patient details with third parties.
              </p>
            )}
            {activeInfoModal === 'terms' && (
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Prescriptime provides medication organization, reminder assistance, and clinical text extraction. It is intended for informational support and does not replace direct professional medical diagnosis or emergency healthcare advice.
              </p>
            )}
            {activeInfoModal === 'contact' && (
              <div className="text-xs sm:text-sm text-slate-300 space-y-2">
                <p>Have questions, clinical inquiries, or feature suggestions?</p>
                <p className="font-semibold text-sky-400">support@prescriptime.app</p>
                <p className="text-slate-400 text-xs">Available Monday–Friday, 9:00 AM – 6:00 PM IST.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
