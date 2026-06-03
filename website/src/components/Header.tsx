"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "./LanguageProvider";

const navItems = [
  { href: "/", key: "home" as const },
  { href: "/about", key: "about" as const },
  { href: "/research", key: "research" as const },
  { href: "/news", key: "news" as const },
  { href: "/contact", key: "contact" as const },
];

export function Header() {
  const pathname = usePathname();
  const { locale, setLocale, t } = useLanguage();

  return (
    <header className="sticky top-0 z-50 border-b border-stone-200/80 bg-[#faf9f7]/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-4">
        <Link href="/" className="group min-w-0">
          <span className="block truncate text-sm font-semibold tracking-tight text-teal-950">
            {t.siteNameShort}
          </span>
          <span className="hidden text-xs text-stone-500 sm:block">
            {t.tagline}
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          {navItems.map(({ href, key }) => {
            const active =
              href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`rounded-full px-3.5 py-2 text-sm transition-colors ${
                  active
                    ? "bg-teal-900 text-white"
                    : "text-stone-600 hover:bg-stone-100 hover:text-teal-950"
                }`}
              >
                {t.nav[key]}
              </Link>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <div
            className="flex rounded-full border border-stone-200 bg-white p-0.5 text-xs font-medium"
            role="group"
            aria-label="Language"
          >
            {(["zh", "en"] as const).map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => setLocale(lang)}
                className={`rounded-full px-2.5 py-1 transition-colors ${
                  locale === lang
                    ? "bg-teal-900 text-white"
                    : "text-stone-500 hover:text-teal-950"
                }`}
              >
                {lang === "zh" ? "中文" : "EN"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <nav
        className="flex gap-1 overflow-x-auto border-t border-stone-100 px-4 py-2 md:hidden"
        aria-label="Mobile"
      >
        {navItems.map(({ href, key }) => {
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs ${
                active
                  ? "bg-teal-900 text-white"
                  : "text-stone-600 hover:bg-stone-100"
              }`}
            >
              {t.nav[key]}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
