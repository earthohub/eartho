import siteData from "@/content/site.json";
import newsData from "@/content/news.json";
import type { Locale } from "./i18n";

export type SiteContent = (typeof siteData)["zh"];

export function getSiteContent(locale: Locale): SiteContent {
  return siteData[locale];
}

export type NewsItem = (typeof newsData)[number];

export function getAllNews(): NewsItem[] {
  return [...newsData].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
}

export function getNewsById(id: string): NewsItem | undefined {
  return getAllNews().find((item) => item.id === id);
}

export function getNewsLocale(item: NewsItem, locale: Locale) {
  return item[locale];
}

export function formatDate(date: string, locale: Locale): string {
  const d = new Date(date);
  return new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-GB", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(d);
}
