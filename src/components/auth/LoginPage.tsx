'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  ArrowRight,
  Eye,
  EyeOff,
  Mail,
  Lock,
  AlertCircle,
  CheckCircle2,
  Calendar,
  BarChart3,
  Shield,
} from 'lucide-react';

interface LoginPageProps {
  onSwitchToLanding?: () => void;
}

export function LoginPage({ onSwitchToLanding }: LoginPageProps) {
  const router = useRouter();
  const { user, signInWithCredentials, signUpWithCredentials, signInWithGoogle } = useAuth();

  const [isSignUp, setIsSignUp] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
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
      setError('Please enter your email address or username.');
      return;
    }

    if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setError('Please enter a valid email address (e.g. name@example.com).');
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
        setError(err?.message || 'Authentication failed. Please check credentials or sign in with Google.');
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
      if (err?.code !== 'auth/popup-closed-by-user') {
        setError(err?.message || 'Google authentication failed. Please try again.');
      }
      setIsLoading(false);
    }
  };

  const handleBackToOverview = () => {
    if (onSwitchToLanding) {
      onSwitchToLanding();
    } else {
      router.push('/');
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-[#081120] text-slate-900 font-sans flex items-center justify-center p-4 sm:p-6 lg:p-10 selection:bg-[#2098F2] selection:text-white overflow-x-hidden">
      {/* 1. Atmospheric Dusk Doctor Office Background (Image 4) */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <Image
          src="/images/login-bg.jpg"
          alt="Prescriptime Clinical Office Environment"
          fill
          priority
          quality={95}
          className="object-cover object-center"
          sizes="100vw"
        />
        {/* Ambient Dark Gradient Scrim to ensure crisp contrast */}
        <div className="absolute inset-0 bg-[#081120]/40 lg:bg-[#081120]/25 backdrop-blur-[2px]" />
      </div>

      {/* 2. Main Double-Column Layout matching Image 3 */}
      <div className="relative z-10 w-full max-w-[1280px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center justify-center">
        
        {/* LEFT COLUMN: Crisp White Frosted Glass Login Card */}
        <div className="lg:col-span-6 xl:col-span-5 flex justify-center lg:justify-start">
          <div className="w-full max-w-[480px] bg-white/95 backdrop-blur-2xl rounded-[32px] p-6 sm:p-9 md:p-10 shadow-[0_20px_60px_rgba(0,0,0,0.35)] border border-white/80 flex flex-col justify-between transition-all duration-300">
            
            {/* Card Top: Logo Pill + Product Overview link */}
            <div className="flex items-center justify-between pb-6 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                {/* Pill Icon */}
                <div className="w-8 h-8 rounded-xl bg-[#0F58B6] flex items-center justify-center shadow-md">
                  <div className="w-5 h-2.5 rounded-full border border-white transform -rotate-45 flex overflow-hidden">
                    <div className="w-1/2 h-full bg-[#2098F2]" />
                    <div className="w-1/2 h-full bg-white" />
                  </div>
                </div>
                <div>
                  <span className="text-lg font-black text-slate-900 tracking-tight leading-none block">
                    Prescriptime
                  </span>
                  <span className="text-[9px] uppercase font-extrabold tracking-wider text-slate-500 block mt-0.5">
                    DIGITAL PRESCRIPTION ORGANIZER
                  </span>
                </div>
              </div>

              {/* Product Overview Link */}
              <button
                type="button"
                onClick={handleBackToOverview}
                id="login-product-overview-link"
                className="text-xs font-bold text-slate-600 hover:text-[#2098F2] flex items-center gap-1 transition-colors cursor-pointer"
              >
                <span>Product Overview</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Heading & Subtitle */}
            <div className="pt-6 pb-5 space-y-1.5">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">
                {isSignUp ? 'JOIN PRESCRIPTIME' : 'WELCOME BACK'}
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight">
                Stay on top of <br />
                <span className="text-[#2098F2]">your health</span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed pt-1">
                {isSignUp
                  ? 'Create an account to digitize prescriptions, track schedules, and take control of your well-being.'
                  : 'Sign in to manage your prescriptions, track schedules, and take control of your well-being.'}
              </p>
            </div>

            {/* Error Notification Banner */}
            {error && (
              <div className="mb-4 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2.5 animate-fadeIn">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-500" />
                <span className="leading-snug">{error}</span>
              </div>
            )}

            {/* Google Authentication Button */}
            <div className="space-y-3">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                id="google-signin-btn"
                className="w-full h-[48px] sm:h-[52px] flex items-center justify-center gap-3 px-4 rounded-full border border-slate-200 bg-white hover:bg-slate-50 active:scale-[0.98] text-slate-800 text-sm font-bold shadow-sm transition-all cursor-pointer"
              >
                {/* Official Multi-Color Google G Logo */}
                <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>{isLoading ? 'Connecting...' : 'Continue with Google'}</span>
              </button>
            </div>

            {/* Clean Centered Divider */}
            <div className="relative my-4 flex items-center justify-center">
              <div className="w-full border-t border-slate-200" />
              <span className="absolute bg-white px-3 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                OR SIGN IN WITH CREDENTIALS
              </span>
            </div>

            {/* Email & Password Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5">
              {/* Field 1: Email / Username */}
              <div className="relative flex items-center">
                <div className="absolute left-4 text-slate-600 pointer-events-none">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Username or email"
                  id="login-email-input"
                  className="w-full h-[46px] pl-11 pr-4 text-sm font-semibold text-slate-900 placeholder:text-slate-600 bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 focus:border-[#2098F2] focus:ring-2 focus:ring-[#2098F2]/20 focus:outline-none rounded-xl transition-all duration-200"
                  autoComplete="username"
                  required
                />
              </div>

              {/* Field 2: Password */}
              <div className="relative flex items-center">
                <div className="absolute left-4 text-slate-600 pointer-events-none">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  id="login-password-input"
                  className="w-full h-[46px] pl-11 pr-11 text-sm font-semibold text-slate-900 placeholder:text-slate-600 bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 focus:border-[#2098F2] focus:ring-2 focus:ring-[#2098F2]/20 focus:outline-none rounded-xl transition-all duration-200"
                  autoComplete={isSignUp ? 'new-password' : 'current-password'}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  className="absolute right-4 text-slate-600 hover:text-slate-800 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between text-xs pt-0.5">
                <label className="flex items-center gap-2 cursor-pointer select-none text-slate-600 font-medium">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-[#2098F2] focus:ring-[#2098F2]"
                  />
                  <span>Remember me</span>
                </label>

                <button
                  type="button"
                  onClick={() => setError('Password reset instructions will be sent to your registered email.')}
                  className="text-[#2098F2] hover:underline font-semibold"
                >
                  Forgot password?
                </button>
              </div>

              {/* Primary Action Button: LOGIN / SIGN UP */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  id="login-submit-button"
                  className="w-full h-[50px] rounded-full bg-[#2098F2] hover:bg-[#1887d9] active:scale-[0.98] text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-lg shadow-blue-500/30 transition-all duration-200 cursor-pointer"
                >
                  <span>{isLoading ? 'Processing...' : isSignUp ? 'CREATE ACCOUNT' : 'LOGIN'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>

            {/* Bottom Toggle: Don't have an account? Create new account */}
            <div className="pt-5 mt-3 border-t border-slate-100 text-center">
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError(null);
                }}
                id="toggle-signup-login-btn"
                className="text-xs font-bold text-slate-700 hover:text-[#2098F2] transition-colors inline-flex items-center gap-1.5 cursor-pointer"
              >
                <span>
                  {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Create new account"}
                </span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

          </div>
        </div>

        {/* RIGHT COLUMN: Interactive High-Res Scene Showcase (Image 3) */}
        <div className="hidden lg:flex lg:col-span-6 xl:col-span-7 relative items-center justify-center">
          <div className="relative w-full max-w-[620px] aspect-[4/3] rounded-3xl overflow-hidden shadow-2xl transition-all duration-500 hover:scale-[1.01]">
            {/* High-Resolution Login Showcase Composite */}
            <Image
              src="/images/login-composite.jpg"
              alt="Prescriptime Doctor Clinic Dashboard & Schedule Mobile View"
              fill
              priority
              quality={95}
              className="object-cover object-right sm:object-center"
              sizes="(max-width: 1280px) 50vw, 680px"
            />
            {/* Subtle Glass Sheen Overlay */}
            <div className="absolute inset-0 rounded-3xl border border-white/25 pointer-events-none shadow-[inset_0_0_40px_rgba(32,152,242,0.2)]" />
          </div>
        </div>

      </div>
    </div>
  );
}
