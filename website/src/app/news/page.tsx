"use client";

import { NewsCard } from "@/components/NewsCard";
import { PageHeader } from "@/components/PageHeader";
import { getAllNews } from "@/lib/content";
import { useLanguage } from "@/components/LanguageProvider";

const allNews = getAllNews();

export default function NewsPage() {
  const { t } = useLanguage();

  return (
    <div className="mx-auto max-w-6xl px-6 py-12 sm:py-16">
      <PageHeader title={t.news.title} intro={t.news.intro} />

      <div className="grid gap-6">
        {allNews.map((item) => (
          <NewsCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}
