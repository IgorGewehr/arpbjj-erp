import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { ClientProviders } from '@/components/providers';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: {
    default: 'BJJEasy - Sistema de Gestão',
    template: '%s | BJJEasy',
  },
  description: 'BJJEasy - Sistema de gestão para academias de Jiu-Jitsu',
  keywords: ['jiu-jitsu', 'academia', 'gestão', 'alunos', 'chamada', 'financeiro', 'bjjeasy'],
  authors: [{ name: 'BJJEasy' }],
  creator: 'BJJEasy',
  manifest: '/manifest.json',
  icons: {
    icon: '/bjjeasy_logo.png',
    apple: '/bjjeasy_logo.png',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FFFFFF' },
    { media: '(prefers-color-scheme: dark)', color: '#0A0A0A' },
  ],
  colorScheme: 'light dark',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  // Required for CSS env(safe-area-inset-*) to resolve to non-zero values on
  // iOS devices with a notch (Capacitor native shell + Safari).
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning data-darkreader-mode="disable">
      <body className={inter.variable}>
        <ClientProviders>
          {children}
        </ClientProviders>
      </body>
    </html>
  );
}
