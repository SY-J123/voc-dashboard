import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import Sidebar from "./components/Sidebar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "토스 VOC 대시보드",
  description: "토스 사용자 리뷰 UX 분석 대시보드",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-neutral-50 text-neutral-900">
        <div className="flex min-h-screen">
          <Sidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <main className="flex-1 mx-auto w-full max-w-[1500px] px-6 py-8">
              {children}
            </main>
            <footer className="border-t border-neutral-200 bg-white">
              <div className="mx-auto max-w-[1500px] px-6 py-4 text-xs text-neutral-500">
                데이터 출처: Google Play 토스 리뷰 · 분석: Claude Haiku 4.5 ·
                스냅샷 분석
              </div>
            </footer>
          </div>
        </div>
      </body>
    </html>
  );
}
