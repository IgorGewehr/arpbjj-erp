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
    default: 'Tropa 23 Jiu-Jitsu - Sistema de Gestão',
    template: '%s | T23',
  },
  description: 'Sistema de gestão da academia Tropa 23 Jiu-Jitsu',
  keywords: ['jiu-jitsu', 'academia', 'gestão', 'alunos', 'chamada', 'financeiro', 'tropa 23', 't23'],
  authors: [{ name: 'Tropa 23 Jiu-Jitsu' }],
  creator: 'Tropa 23 Jiu-Jitsu',
  manifest: '/manifest.json',
  icons: {
    icon: '/logo_conteudo.png',
    apple: '/logo_conteudo.png',
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
