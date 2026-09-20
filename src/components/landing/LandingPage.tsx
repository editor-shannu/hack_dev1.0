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
    <div className="relative h-screen w-full text-white font-sans overflow-hidden selection:bg-[#2098F2] selection:text-white flex flex-col">

      {/* ── FULL-BLEED BACKGROUND IMAGE ── */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <Image
          src="/images/landing-hero.jpg"
          alt="Prescriptime 3D Showcase Background"
          fill
          priority
          quality={95}
          className="object-cover object-center"
          sizes="100vw"
        />
        {/* Dark gradient overlay — lighter so image is clearly visible */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#050d1b]/80 via-[#060d1c]/45 to-transparent" />
        {/* Subtle top/bottom vignette */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#050d1b]/60 via-transparent to-[#050d1b]/15" />
      </div>

      {/* ── HEADER ── */}
      <header className="relative z-20 w-full px-6 sm:px-10 lg:px-16 pt-5 sm:pt-7 flex items-center justify-between flex-shrink-0">
        {/* Logo */}
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
            <div className="text-[10px] text-sky-300/70 font-medium tracking-wide">Your Health. Organized.</div>
          </div>
        </div>


      </header>

      {/* ── HERO ── */}
      <main className="relative z-10 flex-1 w-full flex items-center min-h-0">
        <div className="w-full px-6 sm:px-10 lg:px-16 flex items-center">

          {/* LEFT: Copy */}
          <div className="flex flex-col gap-4 sm:gap-5 max-w-xl py-3 lg:py-0">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#0D1E35]/90 border border-[#2098F2]/35 w-fit">
              <Activity className="w-3.5 h-3.5 text-[#2098F2] animate-pulse flex-shrink-0" />
              <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-widest text-sky-200">
                FROM PRESCRIPTIONS TO A HEALTHIER TOMORROW
              </span>
            </div>

            {/* Headline */}
            <h1 className="text-3xl sm:text-4xl lg:text-[46px] xl:text-[54px] font-black tracking-tight leading-[1.08] text-white">
              More Than <br />
              Prescriptions.<br />
              <span className="text-[#2098F2]">A Healthier You.</span>
            </h1>

            {/* Subtitle */}
            <p className="text-xs sm:text-sm lg:text-base text-slate-300/90 leading-relaxed max-w-[480px]">
              Prescriptime helps you digitize, organize, and stay on top of your medicines — so you and your loved ones live healthier, worry-free.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                id="hero-get-started-btn"
                onClick={() => setShowLoginPage(true)}
                className="h-[46px] sm:h-[50px] px-6 sm:px-8 rounded-full bg-[#2098F2] hover:bg-[#1985d8] active:scale-[0.97] text-white font-black text-xs sm:text-sm lg:text-base flex items-center gap-2.5 shadow-xl shadow-blue-500/35 transition-all duration-200 cursor-pointer group"
              >
                <span>Get Started</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                type="button"
                id="hero-watch-video-btn"
                onClick={() => setIsVideoModalOpen(true)}
                className="h-[46px] sm:h-[50px] px-5 sm:px-7 rounded-full bg-white/8 hover:bg-white/15 active:scale-[0.97] text-white font-bold text-xs sm:text-sm lg:text-base flex items-center gap-2.5 border border-white/20 backdrop-blur-sm transition-all duration-200 cursor-pointer group"
              >
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-white/15 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Play className="w-3 sm:w-3.5 h-3 sm:h-3.5 fill-white text-white ml-0.5" />
                </div>
                <span>Watch Video</span>
              </button>
            </div>
          </div>

        </div>
      </main>

      {/* ── BOTTOM VALUE RIBBON ── */}
      <section className="relative z-10 w-full px-6 sm:px-10 lg:px-16 pb-2 sm:pb-3 flex-shrink-0">
        <div className="rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl px-5 sm:px-8 py-3 sm:py-3.5 flex flex-col xl:flex-row items-center justify-between gap-3 sm:gap-4">
          {/* 4 pillars */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-5 w-full xl:w-auto flex-1">
            {[
              { icon: <Shield className="w-4 h-4" />, title: 'Secure & Private', sub: 'Your data, your control' },
              { icon: <Zap className="w-4 h-4" />, title: 'AI-Powered', sub: 'Smart & accurate' },
              { icon: <Heart className="w-4 h-4" />, title: 'Built for You', sub: 'Simple. Reliable. Effective.' },
              { icon: <Users className="w-4 h-4" />, title: 'For Families', sub: 'Care for the ones you love' },
            ].map(({ icon, title, sub }) => (
              <div key={title} className="flex items-center gap-3">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#0B254A] border border-[#2098F2]/25 flex items-center justify-center text-[#2098F2] flex-shrink-0">
                  {icon}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-black text-white leading-snug">{title}</div>
                  <div className="text-[10px] sm:text-[11px] text-slate-400 truncate">{sub}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="hidden xl:block w-px h-8 bg-white/15 mx-4" />

          <p className="text-xs sm:text-sm font-semibold text-slate-200 italic text-center xl:text-right whitespace-nowrap">
            &ldquo;Good health gives you the freedom to do more.&rdquo;
            <span className="block w-10 h-0.5 bg-[#2098F2] rounded-full mt-1.5 ml-auto" />
          </p>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="relative z-10 w-full px-6 sm:px-10 lg:px-16 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-500 flex-shrink-0">
        <span>&copy; {new Date().getFullYear()} Prescriptime. All rights reserved.</span>
        <div className="flex items-center gap-5 font-medium">
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
                <span>Get Started</span>
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
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
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
                  <p>Your medical prescriptions, adherence logs, and personal health information are protected using industry-standard AES-256 encryption.</p>
                  <p>We never sell, rent, or distribute your personal health data to third-party advertisers. All AI-powered prescription parsing is strictly confidential.</p>
                </>
              )}
              {activeInfoModal === 'terms' && (
                <>
                  <p>Prescriptime is designed to help organize and remind you of your medical schedules. It does not provide medical diagnosis or replace consultation with qualified healthcare professionals.</p>
                  <p>Always consult your physician or pharmacist regarding dosage changes, contraindications, or emergency medical concerns.</p>
                </>
              )}
              {activeInfoModal === 'contact' && (
                <>
                  <p>Have questions, suggestions, or need technical assistance?</p>
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
