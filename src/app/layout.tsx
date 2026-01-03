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
    default: 'MarcusJJ - Sistema de Gestão',
    template: '%s | MarcusJJ',
  },
  description: 'Sistema de gestão completo para academias de Jiu-Jitsu',
  keywords: ['jiu-jitsu', 'academia', 'gestão', 'alunos', 'chamada', 'financeiro'],
  authors: [{ name: 'MarcusJJ' }],
  creator: 'MarcusJJ',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FAFAFA' },
    { media: '(prefers-color-scheme: dark)', color: '#0A0A0A' },
  ],
  colorScheme: 'light dark',
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
    <html lang="pt-BR" suppressHydrationWarning data-darkreader-mode="disable">
      <body className={inter.variable}>
        <ClientProviders>
          {children}
        </ClientProviders>
      </body>
    </html>
  );
}
