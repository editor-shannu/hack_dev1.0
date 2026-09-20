'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Pill, ArrowRight, Eye, EyeOff, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';

interface LoginPageProps {
  onSwitchToLanding?: () => void;
}

export function LoginPage({ onSwitchToLanding }: LoginPageProps) {
  const router = useRouter();
  const { user, signInWithCredentials, signUpWithCredentials, signInWithGoogle, enterDemoMode } = useAuth();

  const [isSignUp, setIsSignUp] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      router.push('/');
    }
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanEmail = username.trim();
    if (!cleanEmail) {
      setError('Please enter your email address.');
      return;
    }

    if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setError('Please enter a valid email address (e.g. yourname@example.com).');
      return;
    }

    if (!password.trim()) {
      setError('Please enter your password.');
      return;
    }

    setIsLoading(true);
    try {
      if (isSignUp) {
        await signUpWithCredentials(cleanEmail, password);
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('prescriptime_is_new_user', 'true');
        }
      } else {
        await signInWithCredentials(cleanEmail, password);
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('prescriptime_is_new_user');
        }
      }
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/invalid-credential' || code === 'auth/wrong-password') {
        setError('Invalid email or password. Please check your credentials or continue with Google.');
      } else if (code === 'auth/user-not-found') {
        setError('No account found with this email. Please sign up or continue with Google.');
      } else if (code === 'auth/email-already-in-use') {
        setError('An account already exists with this email. Please sign in instead.');
      } else if (code === 'auth/weak-password') {
        setError('Password should be at least 6 characters.');
      } else {
        setError(err.message || 'Authentication failed. Please verify credentials or use Google Auth.');
      }
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setIsLoading(true);
    try {
      await signInWithGoogle();
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
    } catch (err: any) {
      if (err.code !== 'auth/popup-closed-by-user') {
        setError(err.message || 'Google authentication failed. Please try again or use Instant Demo mode.');
      }
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen lg:h-screen lg:max-h-screen w-full bg-slate-50 text-slate-900 flex items-center justify-center p-3 sm:p-6 lg:p-8 font-sans antialiased overflow-y-auto lg:overflow-hidden selection:bg-blue-600 selection:text-white">
      {/* Centered Modern Canvas Container - Fits Viewport without vertical scroll */}
      <div className="w-full max-w-[1240px] h-auto lg:h-[90vh] lg:max-h-[740px] bg-white rounded-3xl shadow-2xl flex flex-col lg:flex-row overflow-hidden border border-slate-200/80 relative">
        
        {/* LEFT COLUMN: Clean Clinical Authentication Form */}
        <div className="w-full lg:w-[54%] h-full flex flex-col justify-between p-6 sm:p-10 lg:px-12 lg:py-8 relative z-10 bg-white overflow-y-auto lg:overflow-hidden">
          
          {/* Top Brand: Medical Cross + "Prescriptime" */}
          <div className="flex items-center justify-between pb-3">
            <div className="flex items-center gap-2.5">
              {/* Clinical Teal Cross Logo */}
              <div className="w-10 h-10 rounded-full bg-[#00A896]/10 flex items-center justify-center shadow-sm">
                <svg className="w-6 h-6 text-[#00A896]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 4v16m-8-8h16" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
                </svg>
              </div>
              <div>
                <span className="font-black text-2xl tracking-tight text-slate-900 font-sans">
                  Prescriptime
                </span>
                <span className="block text-[9px] uppercase font-bold tracking-wider text-slate-600">
                  Digital Prescription Organizer
                </span>
              </div>
            </div>

            {/* Optional Switch to Full Overview */}
            {onSwitchToLanding && (
              <button
                type="button"
                onClick={onSwitchToLanding}
                id="login-view-overview-btn"
                className="text-xs font-bold text-slate-500 hover:text-blue-600 transition-colors flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-slate-100"
              >
                <span>Product Overview</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Center Form Section: Google Auth First + Clean Credentials Fallback */}
          <div className="my-auto py-2 max-w-[420px] w-full mx-auto lg:mx-0">
            {/* Title: LOGIN */}
            <div className="space-y-1 mb-5">
              <h1 className="text-3xl sm:text-[38px] font-black text-slate-900 tracking-tight leading-tight">
                {isSignUp ? 'CREATE ACCOUNT' : 'LOGIN'}
              </h1>
              <p className="text-xs sm:text-sm font-semibold text-slate-700 leading-snug">
                Stay connected and improve your treatment’s efficiency together
              </p>
            </div>

            {/* Error Banner if any */}
            {error && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2.5 animate-fadeIn">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-500" />
                <span>{error}</span>
              </div>
            )}

            {/* 1. PRIMARY CALL-TO-ACTION: Seamless Google Sign-In */}
            <div className="space-y-3">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                id="google-signin-hero-btn"
                className="w-full h-[52px] flex items-center justify-center gap-3.5 px-5 rounded-2xl border-2 border-slate-200 hover:border-[#4285F4] bg-white hover:bg-blue-50/40 text-slate-800 text-[15px] font-bold transition-all shadow-sm active:scale-[0.99] group cursor-pointer"
              >
                <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>{isLoading ? 'Signing in with Google...' : 'Continue with Google'}</span>
              </button>
            </div>

            {/* Clean Divider */}
            <div className="relative my-3 flex items-center justify-center">
              <div className="w-full border-t border-slate-200" />
              <span className="absolute bg-white px-3 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                or sign in with credentials
              </span>
            </div>

            {/* 2. Secondary Username & Password Option */}
            <form onSubmit={handleSubmit} className="space-y-3">
              {/* Field 1: Username */}
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Username or email"
                  id="login-username-input"
                  className="w-full h-[46px] px-5 text-[14px] font-semibold text-slate-900 placeholder:text-slate-600 bg-slate-100 hover:bg-slate-200/70 focus:bg-white border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none rounded-xl transition-all duration-200"
                  autoComplete="username"
                />
              </div>

              {/* Field 2: Password */}
              <div className="relative flex items-center">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  id="login-password-input"
                  className="w-full h-[46px] px-5 text-[14px] font-semibold text-slate-900 placeholder:text-slate-600 bg-slate-100 hover:bg-slate-200/70 focus:bg-white border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none rounded-xl transition-all duration-200 pr-12"
                  autoComplete={isSignUp ? 'new-password' : 'current-password'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-4 text-slate-600 hover:text-slate-900 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Submit Button */}
              <div className="pt-1">
                <button
                  type="submit"
                  disabled={isLoading}
                  id="login-submit-btn"
                  className="w-full h-[46px] rounded-xl bg-[#0F58B6] hover:bg-[#0c4897] active:scale-[0.99] text-white font-bold text-base flex items-center justify-center gap-3 shadow-md shadow-blue-900/20 transition-all duration-200 group cursor-pointer"
                >
                  <span>{isLoading ? 'Processing...' : isSignUp ? 'SIGN UP' : 'LOGIN'}</span>
                  <ArrowRight className="w-4 h-4 text-white transform group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </form>
          </div>

          {/* Bottom Switch: CREATE NEW ACCOUNT / ALREADY HAVE AN ACCOUNT */}
          <div className="pt-3 pb-1 flex items-center justify-center border-t border-slate-100 text-xs">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError(null);
              }}
              id="create-new-account-toggle-btn"
              className="inline-flex items-center gap-2 font-bold text-slate-700 hover:text-blue-700 transition-colors group cursor-pointer"
            >
              <span className="uppercase text-xs tracking-wider">
                {isSignUp ? 'ALREADY HAVE AN ACCOUNT? SIGN IN' : 'CREATE NEW ACCOUNT'}
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: Prescriptime Clinical Illustration Artwork & Theme */}
        <div className="w-full lg:w-[46%] h-[320px] lg:h-full bg-gradient-to-br from-[#00A8FF] via-[#008fe0] to-[#0F58B6] relative overflow-hidden flex flex-col items-center justify-center p-6 lg:p-8">
          
          {/* Subtle Ambient Background Accents */}
          <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-white/10 blur-2xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-blue-900/20 blur-2xl pointer-events-none" />

          {/* Clean Vector Prescriptime Illustration Artwork - Scaled to fit viewport */}
          <div className="relative w-full max-w-[360px] aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl border-2 border-white/25 transition-transform duration-500 hover:scale-[1.01]">
            <Image
              src="/images/prescriptime-login.jpg"
              alt="Prescriptime Digital Prescription Organizer & Medication Schedule"
              fill
              priority
              className="object-cover object-center"
              sizes="(max-width: 1024px) 100vw, 460px"
            />
            {/* Subtle Gradient Vignette at bottom */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0088cc]/40 via-transparent to-transparent pointer-events-none" />
          </div>

          {/* Floating Pill Counter & Live Status Pill */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 relative z-10">
            <div className="px-3 py-1.5 rounded-full bg-white/95 backdrop-blur-md shadow-md flex items-center gap-1.5 text-[11px] font-bold text-slate-800">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Smart Pill Schedule</span>
            </div>

            <div className="px-3 py-1.5 rounded-full bg-white/95 backdrop-blur-md shadow-md flex items-center gap-1.5 text-[11px] font-bold text-slate-800">
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
              <span>Zero Manual Entry</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
