"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/", label: "ภาพรวม" },
  { href: "/rooms", label: "ห้องพัก" },
  { href: "/meters", label: "มิเตอร์" },
  { href: "/summary", label: "สรุป" },
  { href: "/settings", label: "ตั้งค่า" },
];

export function Nav() {
  const pathname = usePathname();
  const active = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <>
      {/* Sidebar (จอใหญ่) */}
      <aside className="fixed inset-y-0 hidden w-56 flex-col border-r border-neutral-200 bg-white/80 p-4 backdrop-blur md:flex">
        <div className="px-2 py-3">
          <div className="text-xl font-bold tracking-tight">MyRoom</div>
          <div className="text-xs text-neutral-500">ระบบจัดการหอพัก</div>
        </div>
        <nav className="mt-2 flex flex-col gap-1">
          {ITEMS.map((it) => (
            <Link
              key={it.href}
              href={it.href}
              className={`rounded-lg px-3 py-2 text-sm font-medium ${
                active(it.href)
                  ? "bg-blue-50 text-blue-600"
                  : "text-neutral-600 hover:bg-neutral-100"
              }`}
            >
              {it.label}
            </Link>
          ))}
        </nav>
        <form action="/auth/signout" method="post" className="mt-auto">
          <button className="w-full rounded-lg bg-neutral-100 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50">
            ออกจากระบบ
          </button>
        </form>
      </aside>

      {/* Bottom tab bar (มือถือ) */}
      <nav
        className="fixed inset-x-0 bottom-0 z-50 flex justify-around border-t border-neutral-200 bg-white/90 backdrop-blur md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {ITEMS.map((it) => (
          <Link
            key={it.href}
            href={it.href}
            className={`flex-1 py-2.5 text-center text-xs font-medium ${
              active(it.href) ? "text-blue-600" : "text-neutral-500"
            }`}
          >
            {it.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
