import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';

// Dynamic configuration detection
const rawApiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim();

export const isFirebaseConfigured = Boolean(
  rawApiKey &&
  rawApiKey !== 'undefined' &&
  !rawApiKey.includes('Fallback') &&
  !rawApiKey.includes('ReplaceInEnv')
);

// Fallback configuration for SSR / static build prerendering when environment variables are omitted
const firebaseConfig = {
  apiKey: isFirebaseConfigured ? rawApiKey : 'AIzaSyBuildPrerenderFallbackOnly_ReplaceInEnv',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || '',
};

// Initialize Firebase safely for SSR / Next.js
export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

let authInstance: ReturnType<typeof getAuth> | null = null;
try {
  authInstance = getAuth(app);
} catch (err) {
  if (process.env.NODE_ENV !== 'production') {
    console.warn('Firebase Auth initialization skipped:', err);
  }
}
export const auth = authInstance;

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

// Analytics (only initialized client-side in supported browser environments)
export const initAnalytics = async () => {
  if (typeof window !== 'undefined' && isFirebaseConfigured) {
    try {
      const { getAnalytics, isSupported } = await import('firebase/analytics');
      if (await isSupported()) {
        return getAnalytics(app);
      }
    } catch (err) {
      console.warn('Firebase Analytics not supported in this environment:', err);
    }
  }
  return null;
};

/**
 * Sign in using Google Auth (Popup with automatic seamless Redirect fallback)
 */
export async function signInWithGoogle(): Promise<User | null> {
  if (!auth || !isFirebaseConfigured) {
    throw new Error(
      'Google Authentication is not configured on this deployment. Please add NEXT_PUBLIC_FIREBASE_API_KEY and other Firebase credentials to your Vercel project environment variables, or sign in using Username/Password.'
    );
  }
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (err: any) {
    const code = err?.code || '';
    // If popup is blocked by the browser, closed, or encounters cross-origin storage partitioning (auth/internal-error):
    if (
      code === 'auth/internal-error' ||
      code === 'auth/popup-blocked' ||
      code === 'auth/cancelled-popup-request'
    ) {
      console.warn(`[Prescriptime Auth] signInWithPopup encountered (${code}). Seamlessly transitioning to signInWithRedirect...`);
      await signInWithRedirect(auth, googleProvider);
      return null;
    }
    throw err;
  }
}

/**
 * Sign in using Firebase Email and Password
 */
export async function signInWithEmail(email: string, password: string): Promise<User> {
  if (!auth || !isFirebaseConfigured) {
    throw new Error('Firebase Authentication is not configured on this deployment.');
  }
  const result = await signInWithEmailAndPassword(auth, email.trim(), password);
  return result.user;
}

/**
 * Sign up using Firebase Email and Password
 */
export async function signUpWithEmail(email: string, password: string): Promise<User> {
  if (!auth || !isFirebaseConfigured) {
    throw new Error('Firebase Authentication is not configured on this deployment.');
  }
  const result = await createUserWithEmailAndPassword(auth, email.trim(), password);
  return result.user;
}

/**
 * Sign out the current authenticated user
 */
export async function signOutUser(): Promise<void> {
  if (auth && isFirebaseConfigured) {
    await signOut(auth);
  }
}

export { onAuthStateChanged, getRedirectResult };
export type { User };
