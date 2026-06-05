"use client";

import Link from "next/link";
import { useLanguage } from "./LanguageProvider";

export function Footer() {
  const { t } = useLanguage();
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-stone-200 bg-teal-950 text-stone-300">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-12 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-lg font-medium text-white">{t.siteName}</p>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-stone-400">
            {t.footer.tagline}
          </p>
        </div>
        <div className="flex flex-col gap-3 text-sm sm:items-end">
          <div className="flex flex-wrap gap-4">
            <Link href="/about" className="hover:text-white">
              {t.nav.about}
            </Link>
            <Link href="/research" className="hover:text-white">
              {t.nav.research}
            </Link>
            <Link href="/news" className="hover:text-white">
              {t.nav.news}
            </Link>
            <Link href="/contact" className="hover:text-white">
              {t.nav.contact}
            </Link>
          </div>
          <p className="text-stone-500">
            © {year} {t.siteNameShort}. {t.footer.rights}.
          </p>
        </div>
      </div>
    </footer>
  );
}
