import type { Metadata } from "next";
import { DM_Sans, Noto_Serif_SC } from "next/font/google";
import { LanguageProvider } from "@/components/LanguageProvider";
import { Shell } from "@/components/Shell";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const notoSerif = Noto_Serif_SC({
  variable: "--font-noto-serif",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default:
      "中葡气候与能源联合研究院 | China-Portugal Joint Research Institute on Climate and Energy",
    template: "%s | 中葡气候与能源联合研究院",
  },
  description:
    "中葡气候与能源联合研究院官方网站 — 气候科学、清洁能源与跨国科研合作。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className={`${dmSans.variable} ${notoSerif.variable} h-full`}>
      <body className="flex min-h-full flex-col antialiased">
        <LanguageProvider>
          <Shell>{children}</Shell>
        </LanguageProvider>
      </body>
    </html>
  );
}
