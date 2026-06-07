export type Locale = "zh" | "en";

export const locales: Locale[] = ["zh", "en"];
export const defaultLocale: Locale = "zh";

export function isLocale(value: string): value is Locale {
  return locales.includes(value as Locale);
}
