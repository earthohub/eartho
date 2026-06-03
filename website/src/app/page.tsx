"use client";

import Link from "next/link";
import { NewsCard } from "@/components/NewsCard";
import { getAllNews } from "@/lib/content";
import { useLanguage } from "@/components/LanguageProvider";

const latestNews = getAllNews().slice(0, 2);

export default function HomePage() {
  const { t } = useLanguage();

  return (
    <>
      <section className="relative overflow-hidden border-b border-stone-200 bg-gradient-to-br from-teal-950 via-teal-900 to-emerald-900 text-white">
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 80%, rgba(255,255,255,0.15) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(52,211,153,0.2) 0%, transparent 40%)",
          }}
        />
        <div className="relative mx-auto max-w-6xl px-6 py-20 sm:py-28 lg:py-32">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-teal-200/90">
            CP-JRI · Climate & Energy
          </p>
          <h1 className="font-serif mt-6 max-w-3xl text-3xl font-medium leading-tight sm:text-4xl lg:text-5xl">
            {t.hero.title}
          </h1>
          <p className="mt-4 text-base text-teal-100/90 sm:text-lg">
            {t.hero.subtitle}
          </p>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-teal-50/85 sm:text-lg">
            {t.hero.description}
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              href="/about"
              className="inline-flex items-center rounded-full bg-white px-6 py-3 text-sm font-medium text-teal-950 transition hover:bg-teal-50"
            >
              {t.hero.ctaPrimary}
            </Link>
            <Link
              href="/news"
              className="inline-flex items-center rounded-full border border-white/40 px-6 py-3 text-sm font-medium text-white transition hover:bg-white/10"
            >
              {t.hero.ctaSecondary}
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <h2 className="font-serif text-2xl font-medium text-teal-950">
              {t.home.missionTitle}
            </h2>
            <p className="mt-4 text-base leading-relaxed text-stone-600 sm:text-lg">
              {t.home.missionText}
            </p>
          </div>
          <div className="rounded-2xl border border-stone-200 bg-white p-8 shadow-sm">
            <h2 className="font-serif text-2xl font-medium text-teal-950">
              {t.home.pillarsTitle}
            </h2>
            <ul className="mt-6 space-y-6">
              {t.home.pillars.map((pillar) => (
                <li key={pillar.title} className="border-l-2 border-teal-600 pl-4">
                  <h3 className="font-medium text-teal-950">{pillar.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-stone-600">
                    {pillar.description}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="border-y border-stone-200 bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <h2 className="font-serif text-2xl font-medium text-teal-950 sm:text-3xl">
              {t.home.newsTitle}
            </h2>
            <Link
              href="/news"
              className="text-sm font-medium text-teal-800 hover:text-teal-600"
            >
              {t.home.newsViewAll} →
            </Link>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            {latestNews.map((item) => (
              <NewsCard key={item.id} item={item} />
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
        <h2 className="font-serif text-2xl font-medium text-teal-950">
          {t.home.partnersTitle}
        </h2>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-stone-600">
          {t.home.partnersText}
        </p>
        <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="flex aspect-[3/2] items-center justify-center rounded-xl border border-dashed border-stone-300 bg-stone-50 text-xs text-stone-400"
            >
              Partner
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
