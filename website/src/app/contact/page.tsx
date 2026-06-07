"use client";

import { PageHeader } from "@/components/PageHeader";
import { useLanguage } from "@/components/LanguageProvider";

export default function ContactPage() {
  const { t } = useLanguage();

  return (
    <div className="mx-auto max-w-6xl px-6 py-12 sm:py-16">
      <PageHeader title={t.contact.title} intro={t.contact.intro} />

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-6 rounded-2xl border border-stone-200 bg-white p-8">
          <div>
            <h2 className="text-sm font-medium uppercase tracking-wider text-stone-500">
              {t.contact.email}
            </h2>
            <a
              href={`mailto:${t.contact.emailValue}`}
              className="mt-2 block text-lg text-teal-800 hover:underline"
            >
              {t.contact.emailValue}
            </a>
          </div>
          <div>
            <h2 className="text-sm font-medium uppercase tracking-wider text-stone-500">
              {t.contact.address}
            </h2>
            <p className="mt-2 text-lg text-stone-700">{t.contact.addressValue}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-dashed border-teal-300 bg-teal-50/50 p-8">
          <p className="text-sm leading-relaxed text-stone-600">{t.contact.note}</p>
        </div>
      </div>
    </div>
  );
}
