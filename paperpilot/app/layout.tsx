'use client';

import { useEffect } from 'react';
import { Inter } from 'next/font/google';
import { Toaster } from '@/components/ui/sonner';
import { Sidebar } from '@/components/sidebar';
import { initializeMockData } from '@/lib/mock';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  useEffect(() => {
    initializeMockData();
  }, []);

  return (
    <html lang="en" className={inter.variable}>
      <head>
        <title>PaperPilot - Research Hub</title>
        <meta name="description" content="Discover, organize, and summarize research papers" />
      </head>
      <body className="antialiased">
        <div className="grid-layout">
          <Sidebar />
          <main className="overflow-y-auto">
            {children}
          </main>
        </div>
        <Toaster />
      </body>
    </html>
  );
}
