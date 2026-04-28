import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'lunch',
  description: '점심 약속 & 휴가 공유',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-rose-50">{children}</body>
    </html>
  );
}
