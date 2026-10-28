import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import AuthProvider from '@/components/AuthProvider';
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
  metadataBase: new URL(process.env.NEXTAUTH_URL && !process.env.NEXTAUTH_URL.includes('vercel.app') ? process.env.NEXTAUTH_URL : 'https://9jalive.online'),
  openGraph: {
    type: 'website',
    locale: 'en_NG',
    url: 'https://9jalive.online',
    siteName: '9jaLive',
    title: '9jaLive - Hyperlocal Smart Commerce & Living',
    description: 'Connect with your city, discover verified local stores, stays, services, and neighborhood life.',
    images: [
      {
        url: '/images/9jalive-logo.jpg',
        width: 1024,
        height: 1024,
        alt: '9jaLive Platform Logo',
      },
    ],
  },
  twitter: {
    card: 'summary',
    title: '9jaLive - Hyperlocal Smart Commerce & Living',
    description: 'Nigeria’s hyperlocal super platform connecting local shops, restaurants, stays, events, services, and residents.',
    images: ['/images/9jalive-logo.jpg'],
  },
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
          <Toaster position="top-center" />
        </AuthProvider>
      </body>
    </html>
  );
}
