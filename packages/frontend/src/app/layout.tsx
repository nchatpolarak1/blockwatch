import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Blockwatch — live crypto portfolio',
  description: 'Real-time crypto portfolio tracker streaming exchange prices over WebSocket.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
