import type { Metadata, Viewport } from 'next';
import '@fontsource-variable/public-sans';
import '@fontsource/schibsted-grotesk/500.css';
import '@fontsource/schibsted-grotesk/600.css';
import '@fontsource/schibsted-grotesk/700.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/500.css';
import './globals.css';
import { Toaster } from '@/components/ui/toast';

export const metadata: Metadata = {
  title: { default: 'Plotline', template: '%s · Plotline' },
  description: 'Book plots, follow construction live, and run your real estate project from one place.',
  applicationName: 'Plotline',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f2f5f4' },
    { media: '(prefers-color-scheme: dark)', color: '#0b1110' },
  ],
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN">
      <body className="min-h-dvh antialiased">
        <Toaster>{children}</Toaster>
      </body>
    </html>
  );
}
