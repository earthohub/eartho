"use client";

import { PageHeader } from "@/components/PageHeader";
import { useLanguage } from "@/components/LanguageProvider";

export default function AboutPage() {
  const { t } = useLanguage();

  return (
    <div className="mx-auto max-w-6xl px-6 py-12 sm:py-16">
      <PageHeader title={t.about.title} intro={t.about.intro} />

      <div className="grid gap-10 lg:grid-cols-2">
        <section className="rounded-2xl border border-stone-200 bg-white p-8">
          <h2 className="font-serif text-xl font-medium text-teal-950">
            {t.about.visionTitle}
          </h2>
          <p className="mt-4 leading-relaxed text-stone-600">{t.about.vision}</p>
        </section>

        <section className="rounded-2xl border border-stone-200 bg-teal-950 p-8 text-white">
          <h2 className="font-serif text-xl font-medium">{t.about.valuesTitle}</h2>
          <ul className="mt-6 grid grid-cols-2 gap-3">
            {t.about.values.map((value) => (
              <li
                key={value}
                className="rounded-lg bg-white/10 px-4 py-3 text-center text-sm font-medium"
              >
                {value}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
