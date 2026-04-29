"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "프로젝트 소개" },
  { href: "/dashboard/decision", label: "대시보드" },
  { href: "/dashboard/review", label: "수동 분류 (데모)" },
] as const;

export default function GNB() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white/85 backdrop-blur">
      <div className="mx-auto flex max-w-[1500px] items-center gap-6 px-6 py-3">
        <Link
          href="/"
          className="text-base font-semibold tracking-tight text-neutral-950 hover:text-neutral-700"
        >
          AI 자동 분류 기반 토스 VOC 분석
        </Link>
        <nav className="ml-auto flex flex-wrap gap-1 text-sm">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`rounded-md px-3 py-1.5 transition-colors ${
                  active
                    ? "bg-blue-50 font-medium text-blue-700"
                    : "text-neutral-600 hover:bg-neutral-50"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
