#!/usr/bin/env python3
"""Build JRICE public static site (SFTP-ready)."""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent


CONTACT_FILE = ROOT / "data/contact.json"
GALLERY_FILE = ROOT / "data/home-gallery.json"
HOME_IMG_DIR = ROOT / "images/home"
IMG_EXT = {".jpg", ".jpeg", ".png", ".webp", ".gif"}


def load_contact() -> dict:
    return json.loads(CONTACT_FILE.read_text(encoding="utf-8"))


def emails_html() -> str:
    emails = load_contact().get("emails", [])
    return "<br>".join(f'<a href="mailto:{esc(e)}">{esc(e)}</a>' for e in emails)


def home_gallery_items() -> list[dict]:
    if GALLERY_FILE.exists():
        data = json.loads(GALLERY_FILE.read_text(encoding="utf-8"))
        if data.get("images"):
            return data["images"]
    if not HOME_IMG_DIR.exists():
        return []
    items = []
    for f in sorted(HOME_IMG_DIR.iterdir()):
        if f.suffix.lower() in IMG_EXT:
            items.append({"src": f"images/home/{f.name}", "caption": ""})
    return items


def home_gallery_section() -> str:
    items = home_gallery_items()
    if not items:
        return ""
    cells = []
    for it in items:
        src = it["src"]
        cap = it.get("caption", "")
        cap_html = f'<figcaption>{esc(cap)}</figcaption>' if cap else ""
        cells.append(
            f'<figure class="gallery-item"><img src="{src}" alt="" loading="lazy">{cap_html}</figure>'
        )
    grid = "\n".join(cells)
    return f"""
<section class="section gallery-section">
  <div class="wrap">
    <h2 class="en-only">Events &amp; Gallery</h2>
    <h2 class="zh-only">活动影像</h2>
    <p class="gallery-hint en-only">Photos from JRICE events including the 2026 forum.</p>
    <p class="gallery-hint zh-only">JRICE 活动及 2026 论坛现场图片。</p>
    <div class="gallery-grid">{grid}</div>
    <p class="gallery-more"><a href="events/forum-2026.html" class="en-only">2026 Forum →</a><a href="events/forum-2026.html" class="zh-only">2026 论坛 →</a></p>
  </div>
</section>
"""


NAV = [
    ("index.html", {"en": "Home", "zh": "首页"}),
    ("about.html", {"en": "About", "zh": "关于"}),
    ("research.html", {"en": "Research", "zh": "研究"}),
    ("news/index.html", {"en": "News", "zh": "新闻"}),
    ("events/forum-2026.html", {"en": "Forum 2026", "zh": "2026论坛"}),
    ("contact.html", {"en": "Contact", "zh": "联系"}),
]


def pfx(depth: int) -> str:
    return "../" * depth


def esc(s: str) -> str:
    return (
        s.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def nav(active: str, depth: int) -> str:
    p = pfx(depth)
    out = []
    for href, labels in NAV:
        full = p + href
        cls = ' class="active"' if active == href else ""
        out.append(
            f'<li><a href="{full}"{cls}>'
            f'<span class="en-only">{labels["en"]}</span>'
            f'<span class="zh-only">{labels["zh"]}</span></a></li>'
        )
    return "\n".join(out)


def shell(active: str, depth: int, title: str, body: str) -> str:
    p = pfx(depth)
    emails = emails_html()
    return f"""<!DOCTYPE html>
<html lang="en" data-lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{esc(title)} · JRICE</title>
  <meta name="description" content="JRICE — China-Portugal Joint Research Institute on Climate and Energy">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="{p}css/site.css">
</head>
<body>
<header class="site-header">
  <div class="wrap header-row">
    <a class="logo" href="{p}index.html">
      <strong>JRICE</strong>
      <span class="en-only">China-Portugal Joint Research Institute on Climate and Energy</span>
      <span class="zh-only">中葡气候与能源联合研究院</span>
    </a>
    <nav><ul class="nav">{nav(active, depth)}</ul></nav>
    <div class="lang">
      <button type="button" data-lang="en" class="active">EN</button>
      <button type="button" data-lang="zh">中文</button>
    </div>
  </div>
</header>
{body}
<footer class="site-footer">
  <div class="wrap footer-row">
    <div>
      <strong>JRICE</strong>
      <p class="en-only">China-Portugal Joint Research Institute on Climate and Energy</p>
      <p class="zh-only">中葡气候与能源联合研究院</p>
    </div>
    <div>
      <p>{emails}</p>
      <p class="en-only">China University of Petroleum (Beijing)</p>
      <p class="zh-only">中国石油大学（北京）</p>
    </div>
  </div>
</footer>
<script src="{p}js/site.js"></script>
</body>
</html>"""


def write(rel: str, html: str) -> None:
    path = ROOT / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(html, encoding="utf-8")
    print("  ", rel)


def img_tag(src: str, depth: int, alt: str = "") -> str:
    p = pfx(depth)
    return (
        f'<img src="{p}{src}" alt="{esc(alt)}" loading="lazy" '
        f'onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'block\'">'
        f'<div class="img-missing" style="display:none">'
        f'<span class="en-only">Image not found: {esc(src)} — please upload your file to this path.</span>'
        f'<span class="zh-only">未找到图片：{esc(src)} — 请将您提供的图片放到此路径。</span></div>'
    )


def build_index() -> None:
    body = """
<section class="hero">
  <div class="wrap">
    <p class="en-only tagline">International research cooperation on climate change, clean energy, and sustainable development.</p>
    <p class="zh-only tagline">面向气候变化、清洁能源与可持续发展的国际合作研究。</p>
    <h1 class="en-only">China-Portugal Joint Research Institute on Climate and Energy</h1>
    <h1 class="zh-only">中葡气候与能源联合研究院</h1>
    <div class="hero-actions">
      <a class="btn-dark en-only" href="about.html">About JRICE</a>
      <a class="btn-dark zh-only" href="about.html">了解 JRICE</a>
      <a class="btn-line en-only" href="events/forum-2026.html">Forum 2026</a>
      <a class="btn-line zh-only" href="events/forum-2026.html">2026 交流论坛</a>
    </div>
  </div>
</section>
<section class="section">
  <div class="wrap">
    <h2 class="en-only">Focus</h2>
    <h2 class="zh-only">重点领域</h2>
    <div class="grid-3">
      <div class="card">
        <h3 class="en-only">Climate &amp; Energy Science</h3>
        <h3 class="zh-only">气候与能源科学</h3>
        <p class="en-only">Joint research on climate change, clean energy systems, and carbon-neutrality technologies.</p>
        <p class="zh-only">气候变化、清洁能源体系与碳中和未来技术联合研究。</p>
      </div>
      <div class="card">
        <h3 class="en-only">China–Portugal Cooperation</h3>
        <h3 class="zh-only">中葡合作</h3>
        <p class="en-only">Partnership between China University of Petroleum (Beijing) and Instituto Superior Técnico, Lisbon.</p>
        <p class="zh-only">中国石油大学（北京）与葡萄牙里斯本高等理工学院合作平台。</p>
      </div>
      <div class="card">
        <h3 class="en-only">Green Energy · AI · Youth</h3>
        <h3 class="zh-only">绿色能源 · AI · 青年</h3>
        <p class="en-only">Green Energy | AI Science | Youth Cooperation</p>
        <p class="zh-only">绿色能源 | AI科学 | 青年合作</p>
      </div>
    </div>
  </div>
</section>
{gallery}
<section class="section" style="background:var(--surface);border-top:1px solid var(--line)">
  <div class="wrap">
    <h2 class="en-only">Latest</h2>
    <h2 class="zh-only">最新动态</h2>
    <ul class="news-list">
      <li>
        <time datetime="2026-05-29">2026-05-29</time>
        <h3><a href="events/forum-2026.html"><span class="zh-only">2026 中葡气候与能源科技交流论坛</span><span class="en-only">2026 China-Portugal Science &amp; Technology Forum on Climate and Energy</span></a></h3>
      </li>
      <li>
        <time datetime="2024-10-22">2024-10-22</time>
        <h3><a href="news/inauguration-lisbon-2024.html"><span class="zh-only">中新社：中葡气候与能源联合研究院在葡萄牙里斯本揭牌成立</span><span class="en-only">Institute inaugurated in Lisbon (Xinhua)</span></a></h3>
      </li>
    </ul>
    <p style="margin-top:1.5rem"><a href="news/index.html" class="en-only">All news →</a><a href="news/index.html" class="zh-only">全部新闻 →</a></p>
  </div>
</section>
"""
    gallery = home_gallery_section()
    body = body.replace("{gallery}", gallery)
    write("index.html", shell("index.html", 0, "Home", body))


def build_about() -> None:
    body = """
<div class="wrap page-title">
  <h1 class="en-only">About JRICE</h1>
  <h1 class="zh-only">关于 JRICE</h1>
  <p class="meta en-only">China-Portugal Joint Research Institute on Climate and Energy</p>
  <p class="meta zh-only">中葡气候与能源联合研究院</p>
</div>
<div class="wrap content">
  <p class="zh-only">JRICE（中葡气候与能源联合研究院）由中国石油大学（北京）与葡萄牙里斯本高等理工学院共建，面向气候变化、清洁能源与碳中和未来技术开展联合研究与人才培养。</p>
  <p class="en-only">JRICE (China-Portugal Joint Research Institute on Climate and Energy) is co-established by China University of Petroleum (Beijing) and Instituto Superior Técnico (IST), Lisbon.</p>
  <p class="zh-only">2024年10月11日，双方于里斯本举行签约暨揭牌仪式。详见 <a href="news/inauguration-lisbon-2024.html">新闻报道</a>。</p>
  <p class="en-only">On 11 October 2024, the signing and unveiling ceremony was held in Lisbon. See the <a href="news/inauguration-lisbon-2024.html">news report</a>.</p>
</div>
"""
    write("about.html", shell("about.html", 0, "About", body))


def build_research() -> None:
    body = """
<div class="wrap page-title">
  <h1 class="en-only">Research</h1>
  <h1 class="zh-only">研究</h1>
</div>
<div class="wrap content wide">
  <div class="grid-3">
    <div class="card"><h3 class="en-only">Climate Science</h3><h3 class="zh-only">气候科学</h3><p class="en-only">Climate systems, impacts, and adaptation.</p><p class="zh-only">气候系统、影响与适应。</p></div>
    <div class="card"><h3 class="en-only">Clean Energy</h3><h3 class="zh-only">清洁能源</h3><p class="en-only">Renewables, storage, and low-carbon systems.</p><p class="zh-only">可再生能源、储能与低碳系统。</p></div>
    <div class="card"><h3 class="en-only">Energy + AI</h3><h3 class="zh-only">能源 + AI</h3><p class="en-only">AI for Science and digital infrastructure.</p><p class="zh-only">AI 科学与数字基础设施。</p></div>
  </div>
</div>
"""
    write("research.html", shell("research.html", 0, "Research", body))


def build_contact() -> None:
    c = load_contact()
    em = "<br>".join(f'<a href="mailto:{esc(e)}">{esc(e)}</a>' for e in c["emails"])
    body = f"""
<div class="wrap page-title">
  <h1 class="en-only">Contact</h1>
  <h1 class="zh-only">联系</h1>
</div>
<div class="wrap content">
  <p><strong>Email</strong><br>{em}</p>
  <p class="zh-only"><strong>地址</strong><br>{esc(c['zh']['address'])}</p>
  <p class="en-only"><strong>Address</strong><br>{esc(c['en']['address'])}</p>
  <p class="zh-only"><strong>邮编</strong><br>{esc(c['zh']['postcode'])}</p>
  <p class="en-only"><strong>Postcode</strong><br>{esc(c['en']['postcode'])}</p>
</div>
"""
    write("contact.html", shell("contact.html", 0, "Contact", body))


def build_news_index(news: list) -> None:
    items = []
    for n in sorted(news, key=lambda x: x["date"], reverse=True):
        href = n.get("event") or f"news/{n['id']}.html"
        search = (
            n["zh"]["title"]
            + " "
            + n["zh"].get("summary", "")
            + " "
            + n["en"]["title"]
            + " "
            + " ".join(n.get("tags", []))
        )
        src = n.get("source", "")
        items.append(
            f"""<li data-search="{esc(search)}">
  <time datetime="{n['date']}">{n['date']}</time>
  {f'<span class="src">{esc(src)}</span><br>' if src else ''}
  <h3><a href="../{href}"><span class="zh-only">{esc(n['zh']['title'])}</span><span class="en-only">{esc(n['en']['title'])}</span></a></h3>
  <p><span class="zh-only">{esc(n['zh'].get('summary',''))}</span><span class="en-only">{esc(n['en'].get('summary',''))}</span></p>
</li>"""
        )
    body = f"""
<div class="wrap page-title">
  <h1 class="en-only">News</h1>
  <h1 class="zh-only">新闻</h1>
  <p class="meta en-only">Search and browse JRICE-related news and cited reports.</p>
  <p class="meta zh-only">检索与浏览 JRICE 相关新闻及引用报道。</p>
</div>
<div class="wrap content wide">
  <input class="search" type="search" id="news-search" placeholder="Search / 搜索…" autocomplete="off">
  <ul class="news-list" id="news-list">
{"".join(items)}
  </ul>
</div>
"""
    write("news/index.html", shell("news/index.html", 1, "News", body))


def build_news_article(n: dict) -> None:
    imgs = "".join(img_tag(s, 1) for s in n.get("images", []))
    paras_zh = "".join(
        f"<p>{esc(p)}</p>" for p in n["zh"].get("body", "").split("\n\n") if p.strip()
    )
    paras_en = "".join(
        f'<p class="en-only">{esc(p)}</p>'
        for p in n["en"].get("body", "").split("\n\n")
        if p.strip()
    )
    src_line = ""
    if n.get("sourceUrl"):
        src_line = f"""<p class="source-note">
  <span class="zh-only">来源：{esc(n.get('source',''))} · <a href="{esc(n['sourceUrl'])}">{esc(n['sourceUrl'])}</a></span>
  <span class="en-only">Source: {esc(n.get('source',''))} · <a href="{esc(n['sourceUrl'])}">{esc(n['sourceUrl'])}</a></span>
</p>"""
    body = f"""
<div class="wrap page-title">
  <p><a href="index.html">← News</a></p>
  <time datetime="{n['date']}">{n['date']}</time>
  <h1 class="zh-only">{esc(n['zh']['title'])}</h1>
  <h1 class="en-only">{esc(n['en']['title'])}</h1>
</div>
<div class="wrap content">
  {imgs}
  <div class="zh-only">{paras_zh}</div>
  {paras_en}
  {src_line}
</div>
"""
    write(f"news/{n['id']}.html", shell(f"news/{n['id']}.html", 1, n["en"]["title"][:30], body))


def build_forum(forum: dict) -> None:
    blocks = []
    for block in forum["zh"]["schedule"]:
        items = "".join(f"<li>{esc(i)}</li>" for i in block["items"])
        blocks.append(
            f"""<div class="schedule-block">
  <h3>{esc(block['time'])}</h3>
  <h4>{esc(block['title'])}</h4>
  <ul>{items}</ul>
</div>"""
        )
    schedule_html = "\n".join(blocks)

    zh = forum["zh"]
    en = forum["en"]
    imgs = (
        img_tag(zh["images"]["banner"], 1, zh["title"])
        + img_tag(zh["images"]["poster"], 1, "poster")
        + img_tag(zh["images"]["meeting"], 1, "meeting")
    )
    body = f"""
<div class="wrap page-title">
  <h1 class="zh-only">{esc(zh['title'])}</h1>
  <h1 class="en-only">{esc(en['title'])}</h1>
  <p class="meta zh-only">{esc(zh['subtitle'])}</p>
  <p class="meta en-only">{esc(en['subtitle'])}</p>
</div>
<div class="wrap content wide">
  {imgs}
  <p class="zh-only"><strong>{esc(zh['datetime'])}</strong> · {esc(zh['venue'])}</p>
  <p class="en-only"><strong>{esc(en['datetime'])}</strong> · {esc(en['venue'])}</p>
  <p class="zh-only">{esc(zh['guidance'])}</p>
  <p class="zh-only">{esc(zh['organizer'])}</p>
  <p class="en-only">{esc(en['guidance'])}</p>
  <p class="en-only">{esc(en['organizer'])}</p>
  <h2 style="margin-top:2.5rem">议程</h2>
  {schedule_html}
</div>
"""
    write(
        "events/forum-2026.html",
        shell("events/forum-2026.html", 1, "Forum 2026", body),
    )


def main() -> None:
    news = json.loads((ROOT / "data/news.json").read_text(encoding="utf-8"))
    forum = json.loads((ROOT / "data/forum-2026.json").read_text(encoding="utf-8"))

    print("Building JRICE site…")
    build_index()
    build_about()
    build_research()
    build_contact()
    build_news_index(news)
    for n in news:
        if not n.get("event"):
            build_news_article(n)
    build_forum(forum)
    print("Done.")


if __name__ == "__main__":
    main()
