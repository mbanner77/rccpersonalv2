"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import ThemeToggle from "@/components/ThemeToggle";
import LogoutButton from "@/components/LogoutButton";
import { useSession } from "@/hooks/useSession";
import type { SessionRole } from "@/types/auth";

type NavItem = {
  href: string;
  label: string;
  roles?: Array<SessionRole>;
  group?: string;
};

const NAV_LINKS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", group: "main" },
  { href: "/employees", label: "Mitarbeiter", group: "main" },
  { href: "/lifecycle/onboarding", label: "Onboarding", roles: ["ADMIN", "HR", "UNIT_LEAD"], group: "lifecycle" },
  { href: "/lifecycle/offboarding", label: "Offboarding", roles: ["ADMIN", "HR", "UNIT_LEAD"], group: "lifecycle" },
  { href: "/certificates", label: "Zeugnisse", roles: ["ADMIN", "HR"], group: "hr" },
  { href: "/admin/reminders", label: "Erinnerungen", roles: ["ADMIN", "UNIT_LEAD"], group: "hr" },
  { href: "/admin/lifecycle", label: "Vorlagen", roles: ["ADMIN"], group: "admin" },
  { href: "/admin/users", label: "Benutzer", roles: ["ADMIN"], group: "admin" },
  { href: "/settings", label: "Einstellungen", roles: ["ADMIN"], group: "admin" },
];

export default function AppHeader() {
  const { user, loading, error } = useSession();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const visibleLinks = user
    ? NAV_LINKS.filter((link) => {
        if (!link.roles) return true;
        return link.roles.includes(user.role);
      })
    : [];

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === href || pathname === "/";
    return pathname.startsWith(href);
  };

  const linkClasses = (href: string) =>
    `px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
      isActive(href)
        ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
        : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:text-white dark:hover:bg-zinc-800"
    }`;

  // Group links
  const mainLinks = visibleLinks.filter(l => l.group === "main");
  const lifecycleLinks = visibleLinks.filter(l => l.group === "lifecycle");
  const hrLinks = visibleLinks.filter(l => l.group === "hr");
  const adminLinks = visibleLinks.filter(l => l.group === "admin");

  return (
    <div className="border-b border-zinc-200 dark:border-zinc-800">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex h-14 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center shrink-0">
            <Image
              src="https://realcore.info/bilder/rc-logo.png"
              alt="realcore"
              width={256}
              height={80}
              unoptimized
              className="h-7 w-auto object-contain"
            />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {mainLinks.map((link) => (
              <Link key={link.href} href={link.href} className={linkClasses(link.href)}>
                {link.label}
              </Link>
            ))}
            
            {lifecycleLinks.length > 0 && (
              <>
                <span className="mx-2 h-4 w-px bg-zinc-300 dark:bg-zinc-700" />
                {lifecycleLinks.map((link) => (
                  <Link key={link.href} href={link.href} className={linkClasses(link.href)}>
                    {link.label}
                  </Link>
                ))}
              </>
            )}

            {hrLinks.length > 0 && (
              <>
                <span className="mx-2 h-4 w-px bg-zinc-300 dark:bg-zinc-700" />
                {hrLinks.map((link) => (
                  <Link key={link.href} href={link.href} className={linkClasses(link.href)}>
                    {link.label}
                  </Link>
                ))}
              </>
            )}

            {adminLinks.length > 0 && (
              <>
                <span className="mx-2 h-4 w-px bg-zinc-300 dark:bg-zinc-700" />
                {adminLinks.map((link) => (
                  <Link key={link.href} href={link.href} className={linkClasses(link.href)}>
                    {link.label}
                  </Link>
                ))}
              </>
            )}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-3">
            <ThemeToggle />
            
            {/* User info - desktop */}
            <div className="hidden sm:flex items-center gap-3 text-sm">
              {loading && <span className="text-zinc-400">…</span>}
              {!loading && user && (
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <div className="w-6 h-6 rounded-full bg-zinc-300 dark:bg-zinc-600 flex items-center justify-center text-xs font-medium">
                    {user.email.charAt(0).toUpperCase()}
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-medium text-zinc-700 dark:text-zinc-200 truncate max-w-[120px]">
                      {user.email.split("@")[0]}
                    </div>
                    <div className="text-[10px] text-zinc-500 dark:text-zinc-400">
                      {user.role === "ADMIN" ? "Admin" : "Unit-Leiter"}
                    </div>
                  </div>
                </div>
              )}
              {!loading && !user && !error && (
                <Link 
                  href="/login"
                  className="px-4 py-1.5 rounded-md text-sm font-medium bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
                >
                  Anmelden
                </Link>
              )}
              {user && <LogoutButton />}
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden py-3 border-t border-zinc-200 dark:border-zinc-800">
            <div className="space-y-1">
              {visibleLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block px-3 py-2 rounded-md text-sm ${
                    isActive(link.href)
                      ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                      : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
            {user && (
              <div className="mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                <div className="px-3 py-2 text-xs text-zinc-500">
                  Angemeldet als <span className="font-medium text-zinc-700 dark:text-zinc-300">{user.email}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
