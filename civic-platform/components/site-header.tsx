import Link from "next/link";
import { Building2, Map, ShieldAlert } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { LogoutButton } from "@/components/logout-button";
import { MainNav } from "@/components/main-nav";

const links = [
  { href: "/", label: "Home" },
  { href: "/report", label: "Report Issue" },
  { href: "/complaints", label: "My Complaints" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/analytics", label: "Analytics" },
  { href: "/tasks", label: "My Tasks" },
  { href: "/notifications", label: "Notifications" },
];

export async function SiteHeader() {
  const user = await getCurrentUser();
  const visibleLinks = links.filter((link) => {
    if (link.href === "/dashboard" && user?.role === "citizen") {
      return false;
    }

    if (link.href === "/dashboard/analytics" && user?.role === "citizen") {
      return false;
    }

    if (link.href === "/tasks" && user?.role !== "field_officer") {
      return false;
    }

    if (link.href === "/complaints" && !user) {
      return false;
    }

    if (link.href === "/complaints" && user?.role !== "citizen") {
      return false;
    }

    if (link.href === "/report" && user?.role !== "citizen") {
      return false;
    }

    if (link.href === "/notifications" && !user) {
      return false;
    }

    return true;
  });

  return (
    <header className="sticky top-4 z-50 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="flex w-full items-center justify-between gap-4 rounded-full border border-white/40 bg-white/70 px-4 py-3 shadow-glass backdrop-blur-xl transition hover:shadow-glass-hover">
        <Link className="flex items-center gap-3" href="/">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-civic-primary to-[#1e3a8a] text-white shadow-civic">
            <Building2 className="h-5 w-5" />
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-civic-primary">Civic Pulse</p>
          </div>
        </Link>

        <MainNav visibleLinks={visibleLinks} />

        <div className="flex items-center gap-2">
          {user ? (
            <div className="hidden rounded-full bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 lg:block">
              {user.fullName}
            </div>
          ) : null}
          <Link
            className="hidden items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-civic-primary hover:text-civic-primary sm:inline-flex"
            href="/map"
          >
            <Map className="h-4 w-4" />
            Public Map
          </Link>
          <Link
            className="inline-flex items-center gap-2 rounded-full bg-civic-danger px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5"
            href="/emergency"
          >
            <ShieldAlert className="h-4 w-4" />
            Emergency
          </Link>
          {user ? <LogoutButton /> : <Link className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-civic-primary hover:text-civic-primary" href="/login">Login</Link>}
        </div>
      </div>
    </header>
  );
}
