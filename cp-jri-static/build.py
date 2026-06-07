#!/usr/bin/env python3
"""Build JRICE public static site (SFTP-ready)."""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
INSTITUTE_FILE = ROOT / "data/institute.json"
CONTACT_FILE = ROOT / "data/contact.json"
GALLERY_FILE = ROOT / "data/home-gallery.json"
PROGRAMME_FILE = ROOT / "data/forum-2026-from-pdf.txt"
ABOUT_LINKS_FILE = ROOT / "data/about-links.json"
LEADERSHIP_FILE = ROOT / "data/leadership.json"
HOME_IMG_DIR = ROOT / "images/home"
EVENTS_IMG_DIR = ROOT / "images/events"
FORUM_PDF = ROOT / "documents/2026_China_Portugal_Forum_V23-online.pdf"
IMG_EXT = {".jpg", ".jpeg", ".png", ".webp", ".gif"}


def load_institute() -> dict:
    return json.loads(INSTITUTE_FILE.read_text(encoding="utf-8"))


def load_contact() -> dict:
    return json.loads(CONTACT_FILE.read_text(encoding="utf-8"))


def institute_en() -> str:
    return load_institute()["name_en"]


def contacts_html(compact: bool = False) -> str:
    lines = []
    for c in load_contact().get("contacts", []):
        emails = "; ".join(
            f'<a href="mailto:{esc(e)}">{esc(e)}</a>' for e in c["emails"]
        )
        if compact:
            lines.append(f'<p><strong>{esc(c["name_en"])}</strong><br>{emails}</p>')
        else:
            lines.append(
                f'<p><strong class="en-only">{esc(c["name_en"])}</strong>'
                f'<strong class="zh-only">{esc(c.get("name_zh", c["name_en"]))}</strong><br>{emails}</p>'
            )
    return "\n".join(lines)


def home_gallery_items() -> list[dict]:
    if GALLERY_FILE.exists():
        data = json.loads(GALLERY_FILE.read_text(encoding="utf-8"))
        if data.get("images"):
            return data["images"]
    if not HOME_IMG_DIR.exists():
        return []
    items = []
    skip = {"16.jpg", "16.jpeg", "16.png", "16.JPG", "16.JPEG", "16.PNG"}
    for f in sorted(HOME_IMG_DIR.iterdir()):
        if f.name in skip or f.suffix.lower() not in IMG_EXT:
            continue
        items.append({"src": f"images/home/{f.name}", "caption": ""})
    return items


def home_gallery_section() -> str:
    items = home_gallery_items()
    if not items:
        return ""
    cells = []
    for it in items:
        src = it["src"]
        cells.append(
            f'<a class="gallery-item" href="{src}" data-lightbox>'
            f'<img src="{src}" alt="" loading="lazy"></a>'
        )
    return f"""
<section class="section gallery-section">
  <div class="wrap">
    <h2 class="en-only">Events &amp; Gallery</h2>
    <h2 class="zh-only">活动影像</h2>
    <p class="gallery-hint en-only">Click any photo to enlarge.</p>
    <p class="gallery-hint zh-only">点击照片可放大查看。</p>
    <div class="gallery-grid">{"".join(cells)}</div>
    <p class="gallery-more"><a href="events/forum-2026.html" class="en-only">2026 Forum →</a><a href="events/forum-2026.html" class="zh-only">2026 论坛 →</a></p>
  </div>
</section>
"""


def forum_gallery_items() -> list[str]:
    if not EVENTS_IMG_DIR.exists():
        return []
    skip = {"README.txt"}
    files = []
    for f in sorted(EVENTS_IMG_DIR.iterdir()):
        if f.name in skip or f.suffix.lower() not in IMG_EXT:
            continue
        files.append(f"images/events/{f.name}")
    return files


def forum_gallery_section(depth: int = 1) -> str:
    items = forum_gallery_items()
    if not items:
        return ""
    p = pfx(depth)
    cells = []
    for src in items:
        full = f"{p}{src}"
        cells.append(
            f'<a class="gallery-item" href="{full}" data-lightbox>'
            f'<img src="{full}" alt="" loading="lazy"></a>'
        )
    return f"""
<section class="section gallery-section">
  <div class="wrap">
    <h2 class="en-only">Forum Photos</h2>
    <h2 class="zh-only">论坛影像</h2>
    <p class="gallery-hint en-only">Click any photo to enlarge.</p>
    <p class="gallery-hint zh-only">点击照片可放大查看。</p>
    <div class="gallery-grid">{"".join(cells)}</div>
  </div>
</section>
"""


def programme_html() -> str:
    if not PROGRAMME_FILE.exists():
        return "<p>Programme file missing.</p>"
    text = PROGRAMME_FILE.read_text(encoding="utf-8")
    pages = text.split("\f") if "\f" in text else [text]
    blocks = []
    for part in pages:
        part = part.strip()
        if part:
            blocks.append(f'<div class="programme-page"><pre class="programme-verbatim">{esc(part)}</pre></div>')
    return "\n".join(blocks)


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
    inst = load_institute()
    return f"""<!DOCTYPE html>
<html lang="en" data-lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{esc(title)} · JRICE</title>
  <meta name="description" content="JRICE — {esc(inst['name_en'])}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="{p}css/site.css">
</head>
<body>
<div class="top-accent" aria-hidden="true">
  <span class="top-accent-green"></span>
  <span class="top-accent-red"></span>
</div>
<header class="site-header">
  <div class="wrap header-row">
    <a class="logo" href="{p}index.html">
      <strong>JRICE</strong>
      <span class="en-only">{esc(inst['name_en'])}</span>
      <span class="zh-only">{esc(inst['name_zh'])}</span>
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
      <p class="en-only">{esc(inst['name_en'])}</p>
      <p class="zh-only">{esc(inst['name_zh'])}</p>
    </div>
    <div>
      {contacts_html(compact=True)}
    </div>
  </div>
</footer>
<div id="lightbox" class="lightbox" hidden aria-hidden="true">
  <button type="button" class="lightbox-close" aria-label="Close">&times;</button>
  <img src="" alt="" class="lightbox-img">
</div>
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
    full = f"{p}{src}"
    return (
        f'<a href="{full}" data-lightbox class="content-img-link">'
        f'<img src="{full}" alt="{esc(alt)}" loading="lazy"></a>'
    )


def build_index() -> None:
    inst = institute_en()
    body = f"""
<section class="hero">
  <div class="wrap">
    <p class="en-only tagline">International research cooperation on climate change, clean energy, and sustainable development.</p>
    <p class="zh-only tagline">面向气候变化、清洁能源与可持续发展的国际合作研究。</p>
    <h1 class="en-only">{esc(inst)}</h1>
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
        <p class="en-only">Green Energy | AI for Science | Youth Collaboration</p>
        <p class="zh-only">绿色能源 | AI科学 | 青年合作</p>
      </div>
    </div>
  </div>
</section>
{{gallery}}
<section class="section" style="background:var(--surface);border-top:1px solid var(--line)">
  <div class="wrap">
    <h2 class="en-only">Latest</h2>
    <h2 class="zh-only">最新动态</h2>
    <ul class="news-list">
      <li>
        <time datetime="2026-05-31">2026-05-31</time>
        <h3><a href="news/people-daily-forum-2026.html"><span class="zh-only">人民网：“2026中葡气候与能源科技交流论坛”在京举行</span><span class="en-only">People's Daily: 2026 China-Portugal Forum on Climate and Energy in Beijing</span></a></h3>
      </li>
      <li>
        <time datetime="2026-05-29">2026-05-29</time>
        <h3><a href="events/forum-2026.html"><span class="zh-only">2026 中葡气候与能源科技交流论坛</span><span class="en-only">2026 China-Portugal Science &amp; Technology Forum on Climate and Energy</span></a></h3>
      </li>
      <li>
        <time datetime="2024-10-09">2024-10-09</time>
        <h3><a href="news/tecnico-ai-laboratory-2024.html"><span class="zh-only">Técnico：AI for Climate and Energy 合作协议</span><span class="en-only">Técnico: AI for Climate and Energy laboratory</span></a></h3>
      </li>
      <li>
        <time datetime="2024-10-11">2024-10-11</time>
        <h3><a href="news/embassy-inauguration-2024.html"><span class="zh-only">中国驻葡萄牙大使馆：赵本堂大使出席揭牌仪式</span><span class="en-only">Chinese Embassy: Ambassador at JRICE opening</span></a></h3>
      </li>
    </ul>
    <p style="margin-top:1.5rem"><a href="news/index.html" class="en-only">All news →</a><a href="news/index.html" class="zh-only">全部新闻 →</a></p>
  </div>
</section>
"""
    body = body.replace("{gallery}", home_gallery_section())
    write("index.html", shell("index.html", 0, "Home", body))






def leadership_section() -> str:
    if not LEADERSHIP_FILE.exists():
        return ""
    people = json.loads(LEADERSHIP_FILE.read_text(encoding="utf-8"))
    cards = []
    for person in people:
        photo = person["photo"]
        cards.append(
            f"""<article class="director-card">
  <a href="{photo}" data-lightbox class="director-photo-link">
    <img src="{photo}" alt="" loading="lazy">
  </a>
  <div class="director-body">
    <p class="director-role"><span class="zh-only">{esc(person['role_zh'])}</span><span class="en-only">{esc(person['role_en'])}</span></p>
    <h3 class="zh-only">{esc(person['zh']['name'])}</h3>
    <h3 class="en-only">{esc(person['en']['name'])}</h3>
    <p class="director-title zh-only">{esc(person['zh']['title'])}</p>
    <p class="director-title en-only">{esc(person['en']['title'])}</p>
    <p class="zh-only">{esc(person['zh']['bio'])}</p>
    <p class="en-only">{esc(person['en']['bio'])}</p>
    <p><a href="mailto:{esc(person['email'])}">{esc(person['email'])}</a></p>
    <p class="photo-credit zh-only">{esc(person.get('photoCredit_zh',''))}</p>
    <p class="photo-credit en-only">{esc(person.get('photoCredit_en',''))}</p>
  </div>
</article>"""
        )
    return f"""
<section class="section directors-section">
  <div class="wrap content wide">
    <h2 class="en-only">Co-Directors</h2>
    <h2 class="zh-only">联合院长</h2>
    <div class="directors-grid">{"".join(cards)}</div>
  </div>
</section>
"""

def about_links_section() -> str:
    if not ABOUT_LINKS_FILE.exists():
        return ""
    links = json.loads(ABOUT_LINKS_FILE.read_text(encoding="utf-8"))
    items = []
    for link in links:
        items.append(
            f"""<li>
  <time datetime="{esc(link['date'])}">{esc(link['date'])}</time>
  <span class="src"><span class="zh-only">{esc(link['source_zh'])}</span><span class="en-only">{esc(link['source_en'])}</span></span>
  <h3><a href="{esc(link['url'])}" target="_blank" rel="noopener"><span class="zh-only">{esc(link['title_zh'])}</span><span class="en-only">{esc(link['title_en'])}</span></a></h3>
</li>"""
        )
    return f"""
<section class="section" style="background:var(--surface);border-top:1px solid var(--line)">
  <div class="wrap content wide">
    <h2 class="en-only">Related coverage</h2>
    <h2 class="zh-only">相关报道</h2>
    <p class="gallery-hint en-only">Official and partner news about JRICE (external links).</p>
    <p class="gallery-hint zh-only">JRICE 相关官方与合作方报道（外链）。</p>
    <ul class="news-list">{"".join(items)}</ul>
    <p style="margin-top:1.25rem"><a href="news/index.html" class="en-only">All news on this site →</a><a href="news/index.html" class="zh-only">本站全部新闻 →</a></p>
  </div>
</section>
"""

def build_about() -> None:
    inst = institute_en()
    body = f"""
<div class="wrap page-title">
  <h1 class="en-only">About JRICE</h1>
  <h1 class="zh-only">关于 JRICE</h1>
  <p class="meta en-only">{esc(inst)}</p>
  <p class="meta zh-only">中葡气候与能源联合研究院</p>
</div>
<div class="wrap content">
  <p class="zh-only">JRICE（中葡气候与能源联合研究院）由中国石油大学（北京）与葡萄牙里斯本高等理工学院共建，面向气候变化、清洁能源与碳中和未来技术开展联合研究与人才培养。</p>
  <p class="en-only">JRICE ({esc(inst)}) is co-established by China University of Petroleum (Beijing) and Instituto Superior Técnico (IST), Lisbon.</p>
  <p class="zh-only">2024年10月11日，双方于里斯本举行签约暨揭牌仪式。详见 <a href="news/inauguration-lisbon-2024.html">新闻报道</a>。</p>
  <p class="en-only">On 11 October 2024, the signing and unveiling ceremony was held in Lisbon. See <a href="news/tecnico-ai-laboratory-2024.html">Técnico</a>, <a href="news/embassy-inauguration-2024.html">Embassy</a>, and <a href="news/inauguration-cup-2024.html">CUP</a> reports.</p>
  <p class="zh-only">2024年10月11日于里斯本举行签约暨揭牌仪式。参见 <a href="news/tecnico-ai-laboratory-2024.html">Técnico 报道</a>、<a href="news/embassy-inauguration-2024.html">中国驻葡使馆</a>、<a href="news/inauguration-cup-2024.html">中石油大新闻网</a>。</p>
</div>
"""
    body = body + leadership_section() + about_links_section()
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
    body = f"""
<div class="wrap page-title">
  <h1 class="en-only">Contact</h1>
  <h1 class="zh-only">联系</h1>
</div>
<div class="wrap content">
  {contacts_html()}
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


def extract_forum_pdf() -> None:
    if not FORUM_PDF.exists():
        return
    try:
        import pypdf
    except ImportError:
        return
    reader = pypdf.PdfReader(str(FORUM_PDF))
    pages = []
    for page in reader.pages:
        pages.append((page.extract_text() or "").strip())
    PROGRAMME_FILE.write_text("\f\n".join(p for p in pages if p) + "\n", encoding="utf-8")



def build_forum() -> None:
    programme = programme_html()
    gallery = forum_gallery_section(depth=1)
    body = f"""
<div class="wrap page-title">
  <h1 class="zh-only">2026 中葡气候与能源科技交流论坛</h1>
  <h1 class="en-only">2026 China-Portugal Science &amp; Technology Forum on Climate and Energy</h1>
  <p class="meta">绿色能源  |  AI 科学  |  青年合作 · Green Energy | AI for Science | Youth Collaboration</p>
</div>
{gallery}
<div class="wrap content wide">
  <p class="pdf-link"><a href="../documents/2026_China_Portugal_Forum_V23-online.pdf" target="_blank" rel="noopener"><span class="zh-only">下载会议手册（PDF）</span><span class="en-only">Download Conference Programme (PDF)</span></a></p>
  <p class="zh-only" style="color:var(--muted);font-size:0.9rem">以下为 <code>2026_China_Portugal_Forum_V23-online.pdf</code> 原文提取，未作润色。</p>
  <p class="en-only" style="color:var(--muted);font-size:0.9rem">Verbatim text extracted from <code>2026_China_Portugal_Forum_V23-online.pdf</code> (unedited).</p>
  <div class="programme-document">{programme}</div>
</div>
"""
    write("events/forum-2026.html", shell("events/forum-2026.html", 1, "Forum 2026", body))


def main() -> None:
    extract_forum_pdf()
    news = json.loads((ROOT / "data/news.json").read_text(encoding="utf-8"))
    print("Building JRICE site…")
    build_index()
    build_about()
    build_research()
    build_contact()
    build_news_index(news)
    for n in news:
        if not n.get("event"):
            build_news_article(n)
    build_forum()
    print("Done.")


if __name__ == "__main__":
    main()
