"use client";

import { PageHeader } from "@/components/PageHeader";
import { useLanguage } from "@/components/LanguageProvider";

export default function ResearchPage() {
  const { t } = useLanguage();

  return (
    <div className="mx-auto max-w-6xl px-6 py-12 sm:py-16">
      <PageHeader title={t.research.title} intro={t.research.intro} />

      <div className="space-y-8">
        {t.research.areas.map((area, index) => (
          <section
            key={area.title}
            className="rounded-2xl border border-stone-200 bg-white p-8 sm:p-10"
          >
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-10">
              <span className="font-serif text-4xl font-light text-teal-200">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div className="flex-1">
                <h2 className="font-serif text-xl font-medium text-teal-950 sm:text-2xl">
                  {area.title}
                </h2>
                <ul className="mt-4 space-y-2">
                  {area.items.map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-2 text-stone-600 before:mt-2 before:h-1.5 before:w-1.5 before:shrink-0 before:rounded-full before:bg-teal-600"
                    >
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
