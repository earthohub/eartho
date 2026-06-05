"use client";

import Link from "next/link";
import { formatDate, getNewsLocale, type NewsItem } from "@/lib/content";
import { useLanguage } from "./LanguageProvider";

type NewsCardProps = {
  item: NewsItem;
  compact?: boolean;
};

export function NewsCard({ item, compact = false }: NewsCardProps) {
  const { locale, t } = useLanguage();
  const content = getNewsLocale(item, locale);

  return (
    <article
      className={`group relative flex flex-col rounded-2xl border border-stone-200 bg-white transition-shadow hover:shadow-md ${
        compact ? "p-5" : "p-6 sm:p-8"
      }`}
    >
      <time
        dateTime={item.date}
        className="text-xs font-medium uppercase tracking-wider text-teal-700"
      >
        {formatDate(item.date, locale)}
      </time>
      <h2
        className={`mt-3 font-serif font-medium text-teal-950 group-hover:text-teal-800 ${
          compact ? "text-lg" : "text-xl sm:text-2xl"
        }`}
      >
        <Link href={`/news/${item.id}`} className="after:absolute after:inset-0">
          {content.title}
        </Link>
      </h2>
      <p className="mt-3 flex-1 text-sm leading-relaxed text-stone-600 sm:text-base">
        {content.summary}
      </p>
      <Link
        href={`/news/${item.id}`}
        className="relative mt-4 inline-flex text-sm font-medium text-teal-800 hover:text-teal-600"
      >
        {t.news.readMore} →
      </Link>
    </article>
  );
}
