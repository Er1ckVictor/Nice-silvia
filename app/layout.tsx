import type { Metadata, Viewport } from 'next';
import AppProvider from '@/components/providers/AppProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'Nice Silva Hair · Studio de beleza',
  description: 'Coloração, mechas iluminadas, botox capilar e escovas com a Nice Silva. Agende online de terça a sábado, das 8h às 20h.',
};
export const viewport: Viewport = { themeColor: '#140e0a', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,opsz,wght@0,6..96,400;0,6..96,500;1,6..96,400;1,6..96,500&family=Jost:wght@300;400;500&family=Pinyon+Script&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
