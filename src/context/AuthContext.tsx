'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import {
  auth,
  isFirebaseConfigured,
  signInWithGoogle as fbSignInWithGoogle,
  signInWithEmail as fbSignInWithEmail,
  signUpWithEmail as fbSignUpWithEmail,
  signOutUser as fbSignOutUser,
} from '@/lib/firebase';
import { clearMemoryStorage, setActiveUserId } from '@/lib/storage';

export interface AppUser {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  isDemo?: boolean;
}

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithCredentials: (email: string, password?: string) => Promise<void>;
  signUpWithCredentials: (email: string, password?: string) => Promise<void>;
  signOutUser: () => Promise<void>;
  enterDemoMode: () => void;
  isDemo: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const testSession = localStorage.getItem('prescriptime_test_session');
      if (testSession) {
        try {
          const parsed = JSON.parse(testSession);
          setActiveUserId(parsed.uid);
          setUser(parsed);
          setIsDemo(false);
          setLoading(false);
          return;
        } catch {
          localStorage.removeItem('prescriptime_test_session');
        }
      }

      // 0ms instant hydration for offline mobile/desktop usage
      const cachedActiveUser = localStorage.getItem('prescriptime_active_user');
      if (cachedActiveUser) {
        try {
          const parsed = JSON.parse(cachedActiveUser);
          setActiveUserId(parsed.uid);
          setUser(parsed);
          setIsDemo(false);
          setLoading(false);
        } catch {}
      }
    }

    if (auth && isFirebaseConfigured) {
      const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
        if (firebaseUser) {
          const appUser: AppUser = {
            uid: firebaseUser.uid,
            displayName: firebaseUser.displayName,
            email: firebaseUser.email,
            photoURL: firebaseUser.photoURL,
            isDemo: false,
          };
          setActiveUserId(appUser.uid);
          setUser(appUser);
          setIsDemo(false);
          try {
            localStorage.setItem('prescriptime_active_user', JSON.stringify(appUser));
          } catch {}
        } else {
          // If offline and we had a cached user, do not aggressively clear unless explicitly signed out
          if (typeof window !== 'undefined' && !navigator.onLine) {
            // Keep existing offline user
          } else {
            setActiveUserId(null);
            setUser(null);
            setIsDemo(false);
            try {
              localStorage.removeItem('prescriptime_active_user');
            } catch {}
          }
        }
        setLoading(false);
      });

      return () => unsubscribe();
    } else {
      setLoading(false);
    }
  }, []);

  const signInWithGoogle = async () => {
    try {
      setIsDemo(false);
      clearMemoryStorage(true);
      const res = await fbSignInWithGoogle();
      const appUser: AppUser = {
        uid: res.uid,
        displayName: res.displayName,
        email: res.email,
        photoURL: res.photoURL,
        isDemo: false,
      };
      setActiveUserId(res.uid);
      setUser(appUser);
      try {
        localStorage.setItem('prescriptime_active_user', JSON.stringify(appUser));
      } catch {}
    } catch (err) {
      console.error('Sign in with Google failed:', err);
      throw err;
    }
  };

  const signInWithCredentials = async (email: string, password?: string) => {
    if (!password) {
      throw new Error('Password is required.');
    }
    const cleanEmail = email.trim();
    if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      throw new Error('Please provide a valid email address (e.g. name@example.com).');
    }

    clearMemoryStorage(true);
    const res = await fbSignInWithEmail(cleanEmail, password);
    const appUser: AppUser = {
      uid: res.uid,
      displayName: res.displayName || cleanEmail.split('@')[0],
      email: res.email,
      photoURL: res.photoURL,
      isDemo: false,
    };
    setActiveUserId(res.uid);
    setUser(appUser);
    setIsDemo(false);
    try {
      localStorage.setItem('prescriptime_active_user', JSON.stringify(appUser));
    } catch {}
  };

  const signUpWithCredentials = async (email: string, password?: string) => {
    if (!password || password.length < 6) {
      throw new Error('Password must be at least 6 characters.');
    }
    const cleanEmail = email.trim();
    if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      throw new Error('Please provide a valid email address.');
    }

    // Clean any previous session state so the new user starts completely fresh
    clearMemoryStorage(true);

    const res = await fbSignUpWithEmail(cleanEmail, password);
    const appUser: AppUser = {
      uid: res.uid,
      displayName: res.displayName || cleanEmail.split('@')[0],
      email: res.email,
      photoURL: res.photoURL,
      isDemo: false,
    };
    setActiveUserId(res.uid);
    setUser(appUser);
    setIsDemo(false);
    try {
      localStorage.setItem('prescriptime_active_user', JSON.stringify(appUser));
      sessionStorage.setItem('prescriptime_is_new_user', 'true');
      sessionStorage.setItem('prescriptime_emr_onboarding_pending', 'true');
    } catch {}
  };

  const enterDemoMode = () => {
    const demoUser: AppUser = {
      uid: 'demo-clinician-001',
      displayName: 'Dr. Sarah Lin (Demo)',
      email: 'demo.clinician@prescriptime.health',
      photoURL: null,
      isDemo: true,
    };
    setUser(demoUser);
    setIsDemo(true);
    setLoading(false);
    try {
      localStorage.setItem('prescriptime_active_user', JSON.stringify(demoUser));
    } catch {}
  };

  const signOutUser = async () => {
    localStorage.removeItem('prescriptime_demo_auth');
    localStorage.removeItem('aurarx_demo_auth');
    localStorage.removeItem('prescriptime_session_auth');
    localStorage.removeItem('prescriptime_test_session');
    localStorage.removeItem('prescriptime_active_user');
    clearMemoryStorage(true);
    setIsDemo(false);
    setUser(null);
    try {
      await fbSignOutUser();
    } catch (err) {
      console.error('Sign out failed:', err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signInWithGoogle,
        signInWithCredentials,
        signUpWithCredentials,
        signOutUser,
        enterDemoMode,
        isDemo,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
