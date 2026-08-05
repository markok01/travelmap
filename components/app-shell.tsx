"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState, type CSSProperties } from "react";
import { BrandMark } from "@/components/brand-mark";
import { ThemeToggle } from "@/components/theme-toggle";
import { useT } from "@/components/language-provider";
import { useTheme } from "@/components/theme-provider";
import { signOut } from "@/lib/auth-client";

const NAV = [
  { href: "/dashboard", labelKey: "nav.home" },
  { href: "/map", labelKey: "nav.map" },
  { href: "/trips", labelKey: "nav.trips" },
  { href: "/timeline", labelKey: "nav.timeline" },
  { href: "/countries", labelKey: "nav.countries" },
  { href: "/stats", labelKey: "nav.stats" },
  { href: "/settings", labelKey: "nav.settings" },
] as const;

function isActivePath(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function HamburgerButton({
  open,
  onToggle,
  controlsId,
  openLabel,
  closeLabel,
}: {
  open: boolean;
  onToggle: () => void;
  controlsId: string;
  openLabel: string;
  closeLabel: string;
}) {
  return (
    <button
      type="button"
      className="mobile-menu-toggle"
      aria-label={open ? closeLabel : openLabel}
      aria-expanded={open}
      aria-controls={controlsId}
      onClick={onToggle}
    >
      <span className="mobile-menu-toggle-box" aria-hidden>
        <span className={`mobile-menu-bar ${open ? "is-open" : ""}`} />
        <span className={`mobile-menu-bar ${open ? "is-open" : ""}`} />
        <span className={`mobile-menu-bar ${open ? "is-open" : ""}`} />
      </span>
    </button>
  );
}

export function AppShell({
  children,
  userName,
}: {
  children: React.ReactNode;
  userName: string;
}) {
  const pathname = usePathname();
  const { design } = useTheme();
  const t = useT();
  const isMinimal = design === "minimal";
  const isMapRoute = pathname === "/map" || pathname.startsWith("/map/");
  const flushMap = isMapRoute;
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();

  const atlasPanel =
    "rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--card)] shadow-[var(--shadow-sm)]";

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  function navLinkClass(active: boolean) {
    return `shell-nav-link rounded-[var(--radius-md)] px-3 py-2 text-[13px] transition ${
      isMinimal
        ? active
          ? ""
          : "text-[var(--muted-foreground)]"
        : active
          ? "bg-[var(--accent-soft)] font-medium text-[var(--accent)]"
          : "text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
    }`;
  }

  function signOutButtonClass() {
    return `flex-1 px-3 py-2 text-[13px] text-[var(--muted-foreground)] transition hover:text-[var(--foreground)] ${
      isMinimal
        ? "rounded-[var(--radius-control)] bg-[var(--muted)]"
        : "rounded-[var(--radius-control)] border border-[var(--border)] hover:bg-[var(--muted)]"
    }`;
  }

  const navLinks = (
    <>
      {NAV.map((item) => {
        const active = isActivePath(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            data-active={active ? "true" : "false"}
            className={navLinkClass(active)}
            onClick={() => setMenuOpen(false)}
          >
            {t(item.labelKey)}
          </Link>
        );
      })}
    </>
  );

  const accountFooter = (
    <div
      className={`mt-auto space-y-3 pt-4 ${
        isMinimal
          ? "border-t border-[var(--separator)]"
          : "border-t border-[var(--border)]"
      }`}
    >
      <p className="truncate text-[13px] text-[var(--muted-foreground)]">
        {userName}
      </p>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <button
          type="button"
          onClick={() =>
            signOut({
              fetchOptions: {
                onSuccess: () => {
                  window.location.href = "/";
                },
              },
            })
          }
          className={signOutButtonClass()}
        >
          {t("nav.signOut")}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh bg-[var(--background)] text-[var(--foreground)]">
      <div
        className={`mx-auto flex min-h-dvh max-w-6xl px-4 pb-4 pt-0 md:gap-6 md:px-6 md:py-6 ${
          flushMap ? "gap-3 md:gap-4" : "gap-4"
        }`}
      >
        <aside
          className={`shell-sidebar hidden w-60 shrink-0 flex-col p-4 md:flex ${
            isMinimal ? "" : atlasPanel
          }`}
        >
          <BrandMark href="/dashboard" size="sm" />
          <nav className="mt-7 flex flex-1 flex-col gap-0.5">{navLinks}</nav>
          {accountFooter}
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header
            className={`mobile-topbar fixed inset-x-0 top-0 z-40 flex items-center justify-between gap-3 px-4 py-3 md:hidden ${
              isMinimal ? "shell-sidebar" : atlasPanel
            }`}
          >
            <BrandMark href="/dashboard" size="sm" />
            <div className="flex items-center gap-1.5">
              <ThemeToggle />
              <HamburgerButton
                open={menuOpen}
                onToggle={() => setMenuOpen((v) => !v)}
                controlsId={menuId}
                openLabel={t("nav.openMenu")}
                closeLabel={t("nav.closeMenu")}
              />
            </div>
          </header>
          {/* Spacer so content clears the fixed mobile topbar */}
          <div className="h-[3.75rem] shrink-0 md:hidden" aria-hidden />

          <main
            className={
              flushMap
                ? "mt-3 flex min-h-0 min-w-0 flex-1 flex-col bg-transparent p-0 shadow-none md:mt-0"
                : isMinimal
                  ? "shell-main mt-3 min-w-0 flex-1 overflow-x-hidden p-5 md:mt-0 md:p-7"
                  : `mt-3 min-w-0 flex-1 overflow-x-hidden p-5 md:mt-0 md:p-8 ${atlasPanel}`
            }
          >
            {children}
          </main>
        </div>
      </div>

      {/* Mobile drawer — always in DOM for exit animation */}
      <div
        className={`mobile-menu md:hidden ${menuOpen ? "is-open" : ""}`}
        aria-hidden={!menuOpen}
      >
        <button
          type="button"
          className="mobile-menu-backdrop"
          aria-label="Close menu"
          tabIndex={menuOpen ? 0 : -1}
          onClick={() => setMenuOpen(false)}
        />
        <aside
          id={menuId}
          className={`mobile-menu-panel shell-sidebar ${
            isMinimal ? "" : atlasPanel
          }`}
          role="dialog"
          aria-modal="true"
          aria-label={t("nav.navigation")}
        >
          <div className="flex items-center justify-between gap-3 px-1 pb-2">
            <BrandMark href="/dashboard" size="sm" />
            <HamburgerButton
              open={menuOpen}
              onToggle={() => setMenuOpen(false)}
              controlsId={menuId}
              openLabel={t("nav.openMenu")}
              closeLabel={t("nav.closeMenu")}
            />
          </div>
          <nav className="mobile-menu-nav mt-6 flex flex-1 flex-col gap-1">
            {NAV.map((item, index) => {
              const active = isActivePath(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  data-active={active ? "true" : "false"}
                  style={{ "--nav-i": index } as CSSProperties}
                  className={`mobile-menu-link ${navLinkClass(active)} !px-4 !py-3 !text-[15px]`}
                  tabIndex={menuOpen ? 0 : -1}
                  onClick={() => setMenuOpen(false)}
                >
                  {t(item.labelKey)}
                </Link>
              );
            })}
          </nav>
          <div
            className="mobile-menu-footer"
            style={{ "--nav-i": NAV.length } as CSSProperties}
          >
            {accountFooter}
          </div>
        </aside>
      </div>
    </div>
  );
}
