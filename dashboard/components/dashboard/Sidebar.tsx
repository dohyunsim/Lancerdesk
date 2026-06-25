"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import clsx from "clsx";

const navItems = [
  { href: "/", label: "대시보드" },
  { href: "/projects", label: "프로젝트" },
  { href: "/conversations", label: "대화 목록" },
  { href: "/analytics", label: "분석" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [user, setUser] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.ok ? r.json() : null).then(d => d && setUser(d));
  }, []);

  return (
    <aside className="w-52 bg-gray-900 text-gray-100 flex flex-col flex-shrink-0">
      <div className="px-5 py-5 border-b border-gray-700">
        <h1 className="text-lg font-bold tracking-tight text-white">
          Lancerdesk
        </h1>
        <p className="text-xs text-gray-400 mt-0.5">숨고 프리랜서 CRM</p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ href, label }) => {
          const isActive =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-indigo-600 text-white"
                  : "text-gray-400 hover:bg-gray-800 hover:text-gray-100"
              )}
            >
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="px-4 py-4 border-t border-gray-700 space-y-2">
        {user && (
          <div>
            <p className="text-xs text-gray-400 truncate">{user.name}</p>
          </div>
        )}
        <p className="text-xs text-gray-600">v1.0.0</p>
      </div>
    </aside>
  );
}
