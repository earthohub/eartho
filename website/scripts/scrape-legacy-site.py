#!/usr/bin/env python3
"""Download pages and assets from https://nft.cup.edu.cn/ into legacy-source/."""

from __future__ import annotations

import json
import re
import urllib.request
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin

BASE = "https://nft.cup.edu.cn/"
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "legacy-source"

PAGES = [
    "index.html",
    "zxjj.html",
    "gltd.html",
    "yjtd.html",
    "Intro_cooperators.html",
    "yjcg.html",
    "rjzl.html",
    "jsfa.html",
    "silk.html",
    "carbon_finance.html",
    "pay.html",
    "Hire.html",
    "lxwm.html",
    "news_detail.html",
    "zxhd.html",
    "news_24.html",
    "news_23.html",
    "news_22.html",
    "news_21.html",
    "news_19.html",
    "news_20.html",
    "news_17.html",
    "news_16.html",
    "news_15.html",
    "news_14.html",
    "news_13.html",
    "news_18.html",
    "notice_1.html",
    "notice_2.html",
    "notice_3.html",
    "notice_4.html",
    "news_01.html",
    "news_02.html",
    "news_03.html",
    "news_06.html",
    "news_07.html",
    "news_08.html",
    "news_09.html",
    "news_11.html",
    "news_12.html",
]


class TextExtractor(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.parts: list[str] = []
        self._skip = False

    def handle_starttag(self, tag: str, attrs: list) -> None:
        if tag in ("script", "style"):
            self._skip = True
        if tag in ("h1", "h2", "h3", "h4", "p", "li"):
            self.parts.append("\n")

    def handle_endtag(self, tag: str) -> None:
        if tag in ("script", "style"):
            self._skip = False

    def handle_data(self, data: str) -> None:
        if not self._skip:
            t = data.strip()
            if t:
                self.parts.append(t)

    def get_text(self) -> str:
        return re.sub(r"\n{3,}", "\n\n", "\n".join(self.parts))


def fetch(path: str) -> str:
    url = urljoin(BASE, path)
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.read().decode("utf-8", errors="replace")


def extract_article(html: str) -> dict:
    m = re.search(r"<h2[^>]*>(.*?)</h2>", html, re.S | re.I)
    title = re.sub(r"<[^>]+>", "", m.group(1)).strip() if m else ""
    m = re.search(r"时间[：:]\s*([0-9\-]+)", html)
    date = m.group(1) if m else ""

    body_html = html
    for pat in (
        r'<div class="article[^"]*"[^>]*>(.*?)</div>\s*</div>',
        r'<div class="article">(.*?)</div>',
    ):
        m = re.search(pat, html, re.S | re.I)
        if m:
            body_html = m.group(1)
            break

    body_html = re.sub(r"<script[^>]*>.*?</script>", "", body_html, flags=re.S | re.I)
    parser = TextExtractor()
    parser.feed(body_html)
    imgs = [
        urljoin(BASE, u)
        for u in re.findall(r'src=["\']([^"\']+)["\']', body_html, re.I)
        if not u.startswith("data:")
    ]
    return {
        "title": title,
        "date": date,
        "body_text": parser.get_text().strip(),
        "images": imgs,
    }


def main() -> None:
    (OUT / "html").mkdir(parents=True, exist_ok=True)
    (OUT / "images").mkdir(parents=True, exist_ok=True)

    manifest: dict = {"source": BASE, "pages": []}
    all_imgs: set[str] = set()

    for path in PAGES:
        entry: dict = {"path": path, "url": urljoin(BASE, path)}
        try:
            html = fetch(path)
            (OUT / "html" / path).write_text(html, encoding="utf-8")
            if path.startswith(("news_", "notice_")) or path in (
                "zxjj.html",
                "lxwm.html",
            ):
                entry.update(extract_article(html))
            manifest["pages"].append(entry)
            print("OK", path)
        except Exception as exc:
            entry["error"] = str(exc)
            manifest["pages"].append(entry)
            print("FAIL", path, exc)

    for page in manifest["pages"]:
        for img in page.get("images", []):
            if "count.jsp" in img:
                continue
            all_imgs.add(img)

    for img_url in sorted(all_imgs):
        name = re.sub(r"[^\w.\-]", "_", img_url.split("/")[-1] or "image")
        dest = OUT / "images" / name
        if dest.exists():
            continue
        try:
            req = urllib.request.Request(img_url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=20) as resp:
                dest.write_bytes(resp.read())
            print("IMG", name)
        except Exception as exc:
            print("IMG FAIL", img_url, exc)

    (OUT / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print("Wrote", OUT / "manifest.json")


if __name__ == "__main__":
    main()
