"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Locale } from "@/lib/i18n";
import { defaultLocale, isLocale } from "@/lib/i18n";
import { getSiteContent, type SiteContent } from "@/lib/content";

const STORAGE_KEY = "cp-jri-locale";

type LanguageContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: SiteContent;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && isLocale(stored)) {
      setLocaleState(stored);
    }
    setMounted(true);
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    localStorage.setItem(STORAGE_KEY, next);
    document.documentElement.lang = next === "zh" ? "zh-CN" : "en";
  }, []);

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      t: getSiteContent(locale),
    }),
    [locale, setLocale],
  );

  if (!mounted) {
    return (
      <LanguageContext.Provider
        value={{
          locale: defaultLocale,
          setLocale,
          t: getSiteContent(defaultLocale),
        }}
      >
        {children}
      </LanguageContext.Provider>
    );
  }

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return ctx;
}
