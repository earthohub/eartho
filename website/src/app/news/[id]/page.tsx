"use client";

import Image from "next/image";
import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { formatDate, getNewsById, getNewsLocale } from "@/lib/content";
import { useLanguage } from "@/components/LanguageProvider";

export default function NewsDetailPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const item = getNewsById(id);
  const { locale, t } = useLanguage();

  if (!item) {
    notFound();
  }

  const content = getNewsLocale(item, locale);
  const paragraphs = content.body.split("\n\n").filter(Boolean);
  const images = item.images ?? [];

  return (
    <article className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
      <Link
        href="/news"
        className="text-sm font-medium text-teal-800 hover:text-teal-600"
      >
        ← {t.news.back}
      </Link>

      <time
        dateTime={item.date}
        className="mt-8 block text-xs font-medium uppercase tracking-wider text-teal-700"
      >
        {formatDate(item.date, locale)}
      </time>

      <h1 className="font-serif mt-4 text-3xl font-medium tracking-tight text-teal-950 sm:text-4xl">
        {content.title}
      </h1>

      <p className="mt-6 text-lg leading-relaxed text-stone-600">
        {content.summary}
      </p>

      {images.length > 0 ? (
        <div className="mt-10 space-y-6">
          {images.map((src) => (
            <figure
              key={src}
              className="overflow-hidden rounded-2xl border border-stone-200 bg-stone-50"
            >
              <Image
                src={src}
                alt=""
                width={1200}
                height={800}
                className="h-auto w-full object-cover"
                sizes="(max-width: 768px) 100vw, 720px"
              />
            </figure>
          ))}
        </div>
      ) : null}

      <div className="prose-news mt-10 border-t border-stone-200 pt-10">
        {paragraphs.map((paragraph) => (
          <p key={paragraph.slice(0, 40)}>{paragraph}</p>
        ))}
      </div>
    </article>
  );
}
