import type { Metadata, Viewport } from 'next';
import './globals.css';
import { LenisProvider } from '@/components/layout/LenisProvider';
import { AuthProvider } from '@/context/AuthContext';
import { PWARegister } from '@/components/layout/PWARegister';

export const metadata: Metadata = {
  title: 'Prescriptime — Digital Prescription Organizer & Medicine Schedules',
  description:
    'Prescriptime digitally organizes prescriptions into clear medicine schedules and tracks daily doses using AI-powered prescription reading.',
  manifest: '/manifest.json',
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Prescriptime',
  },
};

export const viewport: Viewport = {
  themeColor: '#0F58B6',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="bg-[#F8FAFC] text-slate-900">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Prescriptime" />
        <link rel="apple-touch-icon" href="/icon.svg" />
      </head>
      <body className="min-h-screen bg-[#F8FAFC] text-slate-900 antialiased selection:bg-blue-600 selection:text-white">
        <AuthProvider>
          <LenisProvider>
            <PWARegister />
            {children}
          </LenisProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
