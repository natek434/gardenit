"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import classNames from "classnames";
import { useSession, signOut } from "next-auth/react";
import { Button } from "../ui/button";
import { NotificationBell } from "@/src/components/notifications/notification-bell";
import { Menu, X } from "lucide-react";
import { BrandLogo } from "./brand-logo";

export function Header(): ReactNode {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const navLinks: Array<{ href: string; label: string }> = [
    { href: "/", label: "Home" },
    { href: "/plants", label: "Plants" },
    { href: "/plants/collection", label: "Collections" },
    { href: "/garden", label: "My Garden" },
    { href: "/notifications", label: "Notifications" },
  ];

  if (session?.user?.role === "ADMIN") {
    navLinks.push({ href: "/admin/plants", label: "Admin" });
  }

  navLinks.push({ href: "/settings", label: "Settings" });

  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  function renderNavLink(link: { href: string; label: string }) {
    const isActive =
      pathname === link.href || (link.href !== "/" && pathname.startsWith(`${link.href}/`));
    return (
      <Link
        key={link.href}
        href={link.href}
        className={classNames(
          "rounded-md px-3 py-2 text-sm font-medium transition",
          {
            "bg-emerald-700/60 text-white shadow-sm": isActive,
            "text-emerald-50/90 hover:bg-emerald-800/60 hover:text-white": !isActive,
          },
        )}
      >
        {link.label}
      </Link>
    );
  }

  const authAction = session?.user ? (
    <Button
      type="button"
      variant="ghost"
      className="w-full justify-start rounded-md px-3 py-2 text-left text-sm font-medium text-emerald-50/90 transition hover:bg-emerald-800/60 hover:text-white md:w-auto md:justify-center"
      onClick={() => signOut({ callbackUrl: "/" })}
    >
      Sign out
    </Button>
  ) : (
    <Link
      href="/auth/signin"
      className={classNames(
        "rounded-md px-3 py-2 text-sm font-semibold transition",
        {
          "bg-white/90 text-emerald-900 shadow-sm hover:bg-white": pathname === "/auth/signin",
          "border border-white/30 text-emerald-50/90 hover:bg-white/10 hover:text-white":
            pathname !== "/auth/signin",
        },
      )}
    >
      Sign in
    </Link>
  );

  return (
    <header className="border-b border-emerald-900/80 bg-emerald-950/95 text-emerald-50 shadow">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold text-emerald-50">
          <BrandLogo className="h-9 w-9 text-emerald-200" />
          <span>Gardenit</span>
        </Link>
        <div className="flex items-center gap-2 md:hidden">
          {session?.user ? <NotificationBell /> : null}
          <button
            type="button"
            onClick={() => setIsMobileOpen((current) => !current)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-white/10 bg-emerald-900/40 text-emerald-50 transition hover:border-white/30 hover:bg-emerald-800/40"
            aria-expanded={isMobileOpen}
            aria-label="Toggle navigation"
          >
            {isMobileOpen ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
          </button>
        </div>
        <nav className="hidden items-center gap-3 md:flex">
          {navLinks.map((link) => renderNavLink(link))}
          {session?.user ? <NotificationBell /> : null}
          {status === "loading" ? null : authAction}
        </nav>
      </div>
      {isMobileOpen ? (
        <div className="mx-auto mt-1 flex max-w-5xl flex-col gap-2 px-4 pb-4 text-sm text-emerald-50/90 md:hidden">
          <div className="rounded-lg border border-white/10 bg-emerald-900/50 p-3 shadow-lg backdrop-blur">
            <div className="flex flex-col gap-1">
              {navLinks.map((link) => (
                <Link
                  key={`mobile-${link.href}`}
                  href={link.href}
                  className={classNames(
                    "rounded-md px-3 py-2 font-medium transition",
                    {
                      "bg-emerald-800/70 text-white":
                        pathname === link.href || (link.href !== "/" && pathname.startsWith(`${link.href}/`)),
                      "hover:bg-emerald-800/40":
                        !(pathname === link.href || (link.href !== "/" && pathname.startsWith(`${link.href}/`))),
                    },
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </div>
            <div className="mt-3 border-t border-white/10 pt-3">
              {status === "loading" ? null : authAction}
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
