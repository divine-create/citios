import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import AuthProvider from '@/components/AuthProvider';
import PwaInstallPrompt from '@/components/common/PwaInstallPrompt';
import { Toaster } from 'sonner';

const sans = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-sans' });

export const viewport: Viewport = {
  themeColor: '#1877F2',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: '9jaLive - Hyperlocal Smart Commerce & Living',
  description: 'Nigeria’s hyperlocal super platform connecting local shops, restaurants, stays, events, services, and residents.',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: '9jaLive',
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${sans.variable} font-sans antialiased bg-slate-50 text-slate-900`} suppressHydrationWarning>
        <AuthProvider>
          {children}
          <PwaInstallPrompt />
          <Toaster position="top-center" />
        </AuthProvider>
      </body>
    </html>
  );
}
