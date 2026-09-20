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
    <div className="relative min-h-screen w-full bg-[#060D1A] text-white font-sans overflow-x-hidden selection:bg-[#2098F2] selection:text-white flex flex-col justify-between">
      {/* 1. Full-Bleed Seamless Atmospheric Background Plate (Image 1 Scene with clean left side) */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <Image
          src="/images/landing-showcase-perfect.jpg"
          alt="Prescriptime Digital Prescription Organizer Atmospheric 3D Showcase"
          fill
          priority
          className="object-cover object-right lg:object-center"
          sizes="100vw"
          quality={95}
        />
        {/* Subtle Dark Vignette on Left for Maximum Typography Contrast on Smaller Screens */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#060D1A]/95 via-[#060D1A]/70 to-transparent lg:hidden pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#060D1A]/80 via-transparent to-[#060D1A]/30 lg:hidden pointer-events-none" />
      </div>

      {/* 2. Top Header Navigation */}
      <header className="relative z-20 w-full max-w-[1440px] mx-auto px-6 sm:px-10 lg:px-14 pt-6 sm:pt-8 flex items-center justify-between">
        {/* Brand Logo & Tagline (Pill icon with blue and white) */}
        <div
          className="flex items-center gap-3 group cursor-pointer"
          onClick={() => setShowLoginPage(false)}
        >
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
          className="px-5 py-2 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-xs sm:text-sm font-bold text-white backdrop-blur-md border border-white/20 transition-all duration-200 cursor-pointer shadow-sm hover:border-white/40"
        >
          Sign In
        </button>
      </header>

      {/* 3. Hero Main Stage */}
      <main className="relative z-10 w-full max-w-[1440px] mx-auto px-6 sm:px-10 lg:px-14 py-8 sm:py-16 my-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* LEFT COLUMN: Hero Copy & Actions */}
        <div className="lg:col-span-6 xl:col-span-5 space-y-6 sm:space-y-7 text-left">
          {/* Tagline Pill Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#0D1B30]/80 border border-[#2098F2]/30 backdrop-blur-xl shadow-lg shadow-blue-900/30">
            <div className="w-5 h-5 rounded-full bg-[#2098F2]/20 flex items-center justify-center text-[#2098F2]">
              <Activity className="w-3.5 h-3.5 animate-pulse" />
            </div>
            <span className="text-[11px] sm:text-xs font-extrabold uppercase tracking-wider text-sky-200">
              FROM PRESCRIPTIONS TO A HEALTHIER TOMORROW
            </span>
          </div>

          {/* Main Huge Typography Headline */}
          <div className="space-y-1">
            <h1 className="text-4xl sm:text-5xl xl:text-[62px] font-black text-white tracking-tight leading-[1.08] drop-shadow-[0_4px_24px_rgba(0,0,0,0.6)]">
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
              className="h-[52px] sm:h-[56px] px-8 sm:px-10 rounded-full bg-[#2098F2] hover:bg-[#1985d8] active:scale-[0.97] text-white font-black text-base sm:text-lg flex items-center gap-3 shadow-xl shadow-blue-500/35 transition-all duration-200 cursor-pointer group border border-white/20"
            >
              <span>Get Started</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1.5 transition-transform" />
            </button>

            {/* Secondary Action: Watch Video Modal Trigger */}
            <button
              type="button"
              id="hero-watch-video-btn"
              onClick={() => setIsVideoModalOpen(true)}
              className="h-[52px] sm:h-[56px] px-6 sm:px-8 rounded-full bg-slate-900/70 hover:bg-slate-800/90 active:scale-[0.97] text-white font-bold text-sm sm:text-base flex items-center gap-3 backdrop-blur-xl border border-white/25 shadow-lg shadow-black/40 transition-all duration-200 cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                <Play className="w-4 h-4 fill-white text-white ml-0.5" />
              </div>
              <span>Watch Video</span>
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: Naturally transparent on desktop to display the background 3D smartphone & cards seamlessly */}
        <div className="hidden lg:block lg:col-span-6 xl:col-span-7 h-full min-h-[420px] pointer-events-none">
          {/* Background image displays the 3D phone, 4 floating cards, pedestal, books, and neon handwriting without any box seam */}
        </div>
      </main>

      {/* 4. Bottom Value Proposition Ribbon & Clinical Quote */}
      <section className="relative z-10 w-full max-w-[1440px] mx-auto px-6 sm:px-10 lg:px-14 py-4 sm:py-6">
        <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-[#091426]/80 backdrop-blur-xl border border-white/15 shadow-2xl flex flex-col xl:flex-row items-center justify-between gap-6">
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
      <footer className="relative z-10 w-full max-w-[1440px] mx-auto px-6 sm:px-10 lg:px-14 py-4 sm:py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
        <div>
          &copy; {new Date().getFullYear()} Prescriptime. All rights reserved.
        </div>
        <div className="flex items-center gap-6 font-medium">
          <button
            type="button"
            onClick={() => setActiveInfoModal('privacy')}
            className="hover:text-white transition-colors cursor-pointer"
          >
            Privacy
          </button>
          <button
            type="button"
            onClick={() => setActiveInfoModal('terms')}
            className="hover:text-white transition-colors cursor-pointer"
          >
            Terms
          </button>
          <button
            type="button"
            onClick={() => setActiveInfoModal('contact')}
            className="hover:text-white transition-colors cursor-pointer"
          >
            Contact
          </button>
        </div>
      </footer>

      {/* 6. Mini Popup Modal: Watch Video (YouTube Video Popup) */}
      {isVideoModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setIsVideoModalOpen(false)}
        >
          <div
            className="relative w-full max-w-4xl bg-[#091426] border border-white/20 rounded-3xl overflow-hidden shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#0A1830]">
              <div className="flex items-center gap-2.5">
                <div className="w-3 h-3 rounded-full bg-[#2098F2] animate-pulse" />
                <h3 className="text-sm sm:text-base font-bold text-white">
                  Prescriptime Product Overview &amp; Demo
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsVideoModalOpen(false)}
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer border border-white/10"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Embedded Responsive YouTube Player */}
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
                onClick={() => {
                  setIsVideoModalOpen(false);
                  setShowLoginPage(true);
                }}
                className="px-4 py-1.5 rounded-full bg-[#2098F2] hover:bg-[#1985d8] text-white font-bold transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <span>Get Started</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Information Modals (Privacy, Terms, Contact) */}
      {activeInfoModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setActiveInfoModal(null)}
        >
          <div
            className="relative w-full max-w-lg bg-[#0B1A30] border border-white/20 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="text-lg font-bold text-white capitalize">
                {activeInfoModal === 'privacy' && 'Privacy Policy'}
                {activeInfoModal === 'terms' && 'Terms of Service'}
                {activeInfoModal === 'contact' && 'Contact Support'}
              </h3>
              <button
                type="button"
                onClick={() => setActiveInfoModal(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs sm:text-sm text-slate-300 leading-relaxed max-h-[60vh] overflow-y-auto space-y-3">
              {activeInfoModal === 'privacy' && (
                <>
                  <p>
                    Your medical prescriptions, adherence logs, and personal health information are protected using industry-standard AES-256 encryption.
                  </p>
                  <p>
                    We never sell, rent, or distribute your personal health data to third-party advertisers. All AI-powered prescription parsing is strictly confidential.
                  </p>
                </>
              )}
              {activeInfoModal === 'terms' && (
                <>
                  <p>
                    Prescriptime is designed to help organize and remind you of your medical schedules. It does not provide medical diagnosis or replace consultation with qualified healthcare professionals.
                  </p>
                  <p>
                    Always consult your physician or pharmacist regarding dosage changes, contraindications, or emergency medical concerns.
                  </p>
                </>
              )}
              {activeInfoModal === 'contact' && (
                <>
                  <p>
                    Have questions, suggestions, or need technical assistance with your prescriptions?
                  </p>
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
                    <p className="font-semibold text-white">Email: support@prescriptime.app</p>
                    <p className="text-slate-400">Response time: within 24 hours</p>
                  </div>
                </>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveInfoModal(null)}
                className="px-5 py-2 rounded-full bg-[#2098F2] text-white font-bold text-xs hover:bg-[#1985d8] transition-colors cursor-pointer"
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
