import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/api/client';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'POS Modernization',
  description: 'Modern Point of Sale System - Streamline Your Sales Operations',
  keywords: 'POS, Point of Sale, Sales Management, Inventory',
  authors: [{ name: 'POS Team' }],
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="x-ua-compatible" content="ie=edge" />
      </head>
      <body className={inter.className}>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </body>
    </html>
  );
}