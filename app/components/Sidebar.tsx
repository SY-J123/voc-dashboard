"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "프로젝트 소개" },
  { href: "/dashboard/decision", label: "대시보드" },
] as const;

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex w-56 shrink-0 flex-col border-r border-neutral-200 bg-white">
      <div className="flex items-center gap-2 px-5 py-5 border-b border-neutral-100">
        <div className="h-7 w-7 rounded-lg bg-blue-600" />
        <div className="leading-tight">
          <div className="text-sm font-semibold text-neutral-950">토스 VOC</div>
          <div className="text-[11px] text-neutral-400">analysis</div>
        </div>
      </div>
      <nav className="flex flex-col gap-0.5 p-3">
        {NAV.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`rounded-md px-3 py-2 text-sm transition-colors ${
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
    </aside>
  );
}
