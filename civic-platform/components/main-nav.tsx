"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavLink {
  href: string;
  label: string;
}

export function MainNav({ visibleLinks }: { visibleLinks: NavLink[] }) {
  const pathname = usePathname();

  return (
    <nav className="hidden items-center md:flex">
      {visibleLinks.map((link) => {
        const isActive =
          pathname === link.href ||
          (link.href !== "/" && pathname.startsWith(link.href));

        return (
          <Link
            key={link.href}
            className={`rounded-full px-5 py-2 text-sm font-semibold transition-all ${
              isActive
                ? "bg-civic-primary text-white shadow-md hover:bg-civic-primary/90"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
            href={link.href}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
