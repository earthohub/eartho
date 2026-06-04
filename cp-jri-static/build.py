#!/usr/bin/env python3
"""Generate static HTML site for SFTP upload."""

from __future__ import annotations

import json
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent
OUT = ROOT  # deploy root = cp-jri-static/

NAV = [
    ("index.html", "首页", "Home"),
    ("about.html", "关于研究院", "About"),
    ("research.html", "研究方向", "Research"),
    ("news/index.html", "新闻动态", "News"),
    ("events/forum-2026.html", "2026论坛", "Forum 2026"),
    ("departments/carbon-finance/index.html", "碳金融", "Carbon Finance"),
    (
        "departments/blockchain-finance/index.html",
        "区块链金融",
        "Blockchain Finance",
    ),
    ("contact.html", "联系我们", "Contact"),
]


def rel_prefix(depth: int) -> str:
    return "../" * depth if depth else ""


def nav_html(active: str, depth: int) -> str:
    p = rel_prefix(depth)
    items = []
    for href, zh, en in NAV:
        full = p + href
        cls = ' class="active"' if active == href or active == full.replace("../", "") else ""
        items.append(
            f'<li><a href="{full}"{cls}><span class="zh-only">{zh}</span>'
            f'<span class="en-only">{en}</span></a></li>'
        )
    return "\n".join(items)


def shell(active: str, depth: int, title: str, body: str) -> str:
    p = rel_prefix(depth)
    return f"""<!DOCTYPE html>
<html lang="zh-CN" data-lang="zh">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{title} | 中葡气候与能源联合研究院</title>
  <meta name="description" content="中葡气候与能源联合研究院 China-Portugal Joint Research Institute on Climate and Energy">
  <link rel="stylesheet" href="{p}css/style.css">
</head>
<body>
<header class="site-header">
  <div class="container header-inner">
    <a class="brand" href="{p}index.html">
      <span class="zh-only">中葡气候与能源联合研究院</span>
      <span class="en-only">CP-JRI Climate &amp; Energy</span>
      <small class="zh-only">China-Portugal Joint Research Institute</small>
      <small class="en-only">CUP · IST · International Cooperation</small>
    </a>
    <nav>
      <ul class="nav-main">{nav_html(active, depth)}</ul>
    </nav>
    <div class="lang-toggle">
      <button type="button" data-lang="zh" class="active">中文</button>
      <button type="button" data-lang="en">EN</button>
    </div>
  </div>
</header>
<main>
{body}
</main>
<footer class="site-footer">
  <div class="container footer-grid">
    <div>
      <strong class="zh-only">中葡气候与能源联合研究院</strong>
      <strong class="en-only">China-Portugal Joint Research Institute on Climate and Energy</strong>
      <p class="zh-only">中国石油大学（北京） · 葡萄牙里斯本高等理工学院</p>
      <p class="en-only">China University of Petroleum (Beijing) · IST Lisbon</p>
    </div>
    <div>
      <p>Email: <a href="mailto:zong@cup.edu.cn">zong@cup.edu.cn</a></p>
      <p class="zh-only">地址：北京市昌平区府学路18号</p>
      <p class="en-only">No. 18 Fuxue Road, Changping, Beijing</p>
    </div>
    <div>
      <p><a href="{p}materials/README.html" class="zh-only">原始资料归档说明</a></p>
      <p><a href="{p}materials/README.html" class="en-only">Materials archive</a></p>
    </div>
  </div>
</footer>
<script src="{p}js/main.js"></script>
</body>
</html>"""


def write(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")
    print("wrote", path.relative_to(ROOT))


def build_index() -> None:
    body = """
<section class="hero">
  <div class="container">
    <p class="en-title">China-Portugal Joint Research Institute on Climate and Energy</p>
    <h1 class="zh-only">中葡气候与能源联合研究院</h1>
    <h1 class="en-only">China-Portugal Joint Research Institute on Climate and Energy</h1>
    <p class="zh-only">汇聚中国与葡萄牙及欧洲伙伴的科研力量，聚焦气候变化、清洁能源与可持续发展，开展高水平联合研究与人才培养。</p>
    <p class="en-only">Advancing collaborative research and education in climate change, clean energy, and sustainable development between China, Portugal, and Europe.</p>
    <a class="btn btn-primary zh-only" href="about.html">了解研究院</a>
    <a class="btn btn-primary en-only" href="about.html">About the Institute</a>
    <a class="btn btn-outline zh-only" href="events/forum-2026.html">2026 交流论坛</a>
    <a class="btn btn-outline en-only" href="events/forum-2026.html">2026 Forum</a>
  </div>
</section>
<section class="section">
  <div class="container">
    <h2 class="section-title zh-only">下属部门</h2>
    <h2 class="section-title en-only">Departments</h2>
    <div class="card-grid">
      <a class="card" href="departments/carbon-finance/index.html" style="text-decoration:none;color:inherit">
        <h3 class="zh-only">碳金融</h3>
        <h3 class="en-only">Carbon Finance</h3>
        <p class="zh-only">碳科技创新、绿色金融与能源转型实践。</p>
        <p class="en-only">Carbon innovation, green finance, and energy transition.</p>
      </a>
      <a class="card" href="departments/blockchain-finance/index.html" style="text-decoration:none;color:inherit">
        <h3 class="zh-only">区块链金融研究中心</h3>
        <h3 class="en-only">Blockchain Finance Research Center</h3>
        <p class="zh-only">区块链金融理论与能源行业应用（原中心基本材料归档待用）。</p>
        <p class="en-only">Blockchain finance theory and energy-sector applications.</p>
      </a>
    </div>
  </div>
</section>
<section class="section" style="background:#fff;border-top:1px solid var(--border)">
  <div class="container">
    <div style="display:flex;justify-content:space-between;align-items:end;flex-wrap:wrap;gap:1rem;margin-bottom:1.5rem">
      <h2 class="section-title" style="margin:0"> <span class="zh-only">最新动态</span><span class="en-only">Latest News</span></h2>
      <a href="news/index.html"><span class="zh-only">全部新闻 →</span><span class="en-only">All news →</span></a>
    </div>
    <ul class="news-list">
      <li class="news-item">
        <time datetime="2026-05-29">2026-05-29</time>
        <span class="tag">论坛</span><span class="tag">中葡</span>
        <h2><a href="events/forum-2026.html"><span class="zh-only">2026 中葡气候与能源科技交流论坛</span><span class="en-only">2026 China-Portugal Forum on Climate and Energy</span></a></h2>
        <p class="zh-only">5月29日 主楼 C308 · 绿色能源 · AI 科学 · 青年合作</p>
        <p class="en-only">29 May, Room C308 · Green Energy · AI · Youth Cooperation</p>
      </li>
      <li class="news-item">
        <time datetime="2024-10-22">2024-10-22</time>
        <span class="tag">揭牌</span><span class="tag">里斯本</span>
        <h2><a href="news/inauguration-lisbon-2024.html"><span class="zh-only">中葡气候与能源联合研究院在里斯本揭牌成立</span><span class="en-only">Institute inaugurated in Lisbon</span></a></h2>
      </li>
    </ul>
  </div>
</section>
<section class="section">
  <div class="container figure-banner">
    <img src="images/forum/forum-2026-banner.png" alt="2026 Forum banner">
  </div>
</section>
"""
    write(OUT / "index.html", shell("index.html", 0, "首页", body))


def build_about() -> None:
    body = """
<div class="container">
  <header class="page-header">
    <h1 class="zh-only">关于研究院</h1>
    <h1 class="en-only">About the Institute</h1>
    <p class="lead zh-only">由中国石油大学（北京）与葡萄牙里斯本高等理工学院（IST）共建的国际合作研究平台。</p>
    <p class="lead en-only">An international research platform co-established by CUP Beijing and IST Lisbon.</p>
  </header>
  <div class="article-body">
    <p class="zh-only">2024年10月11日，双方于里斯本举行签约暨揭牌仪式。研究院面向气候变化、清洁能源、碳中和未来技术开展联合研究与人才培养，下设<strong>碳金融</strong>、<strong>区块链金融研究中心</strong>等方向。</p>
    <p class="en-only">On 11 October 2024, the two universities held a signing and unveiling ceremony in Lisbon. The institute focuses on climate change, clean energy, and carbon-neutrality technologies, with departments including <strong>Carbon Finance</strong> and the <strong>Blockchain Finance Research Center</strong>.</p>
    <h2 class="section-title zh-only">愿景</h2>
    <h2 class="section-title en-only">Vision</h2>
    <p class="zh-only">成为中葡及欧洲气候与能源领域具有影响力的联合研究枢纽。</p>
    <p class="en-only">To serve as a leading hub for China–Portugal and European cooperation in climate and energy research.</p>
  </div>
</div>
"""
    write(OUT / "about.html", shell("about.html", 0, "关于", body))


def build_research() -> None:
    body = """
<div class="container">
  <header class="page-header">
    <h1 class="zh-only">研究方向</h1>
    <h1 class="en-only">Research Areas</h1>
  </header>
  <div class="card-grid">
    <div class="card"><h3 class="zh-only">气候科学与适应</h3><h3 class="en-only">Climate Science</h3><p class="zh-only">区域气候、极端事件、适应策略。</p><p class="en-only">Regional climate, extremes, adaptation.</p></div>
    <div class="card"><h3 class="zh-only">清洁能源与技术</h3><h3 class="en-only">Clean Energy</h3><p class="zh-only">可再生能源、储能、综合能源系统。</p><p class="en-only">Renewables, storage, integrated systems.</p></div>
    <div class="card"><h3 class="zh-only">能源 + AI</h3><h3 class="en-only">Energy + AI</h3><p class="zh-only">AI for Science、数字孪生、智能基础设施。</p><p class="en-only">AI for science, digital twins, smart infrastructure.</p></div>
    <div class="card"><h3 class="zh-only">碳金融与政策</h3><h3 class="en-only">Carbon Finance & Policy</h3><p class="zh-only">碳市场、绿色金融、中欧政策比较。</p><p class="en-only">Carbon markets, green finance, policy.</p></div>
  </div>
</div>
"""
    write(OUT / "research.html", shell("research.html", 0, "研究方向", body))


def build_contact() -> None:
    body = """
<div class="container">
  <header class="page-header">
    <h1 class="zh-only">联系我们</h1>
    <h1 class="en-only">Contact</h1>
  </header>
  <div class="card" style="max-width:32rem">
    <p><strong>Email:</strong> <a href="mailto:zong@cup.edu.cn">zong@cup.edu.cn</a></p>
    <p class="zh-only"><strong>地址：</strong>北京市昌平区府学路18号 中国石油大学（北京）</p>
    <p class="en-only"><strong>Address:</strong> No. 18 Fuxue Road, Changping, Beijing</p>
    <p class="zh-only"><strong>邮编：</strong>102249</p>
    <p class="en-only"><strong>Postcode:</strong> 102249</p>
  </div>
</div>
"""
    write(OUT / "contact.html", shell("contact.html", 0, "联系", body))


def build_news_index(news: list) -> None:
    items = []
    for n in sorted(news, key=lambda x: x["date"], reverse=True):
        href = n.get("eventPage") or f"news/{n['id']}.html"
        tags = " ".join(f'<span class="tag">{t}</span>' for t in n.get("tags", []))
        search = n["zh"]["title"] + n["zh"]["summary"] + " ".join(n.get("tags", []))
        items.append(
            f"""<li class="news-item" data-search="{search}" data-tags="{','.join(n.get('tags',[]))}">
  <time datetime="{n['date']}">{n['date']}</time>
  {tags}
  <h2><a href="../{href}"><span class="zh-only">{n['zh']['title']}</span><span class="en-only">{n['en']['title']}</span></a></h2>
  <p><span class="zh-only">{n['zh']['summary']}</span><span class="en-only">{n['en']['summary']}</span></p>
</li>"""
        )
    body = f"""
<div class="container">
  <header class="page-header">
    <h1 class="zh-only">新闻动态</h1>
    <h1 class="en-only">News</h1>
    <p class="lead zh-only">可检索中葡气候与能源联合研究院及相关合作新闻。</p>
    <p class="lead en-only">Searchable news on the institute and related cooperation.</p>
  </header>
  <div class="search-bar">
    <input type="search" id="news-search" placeholder="搜索标题、摘要或标签… / Search…" autocomplete="off">
  </div>
  <ul class="news-list" id="news-list">
{"".join(items)}
  </ul>
</div>
"""
    write(OUT / "news/index.html", shell("news/index.html", 1, "新闻", body))


def build_news_article(n: dict, depth: int = 1) -> None:
    p = rel_prefix(depth)
    imgs = ""
    for src in n.get("images", []):
        imgs += f'<img src="{p}{src}" alt="">\n'
    if n.get("image"):
        imgs = f'<img src="{p}{n["image"]}" alt="">\n' + imgs
    paras_zh = "".join(f"<p>{para}</p>" for para in n["zh"]["body"].split("\n\n") if para.strip())
    paras_en = "".join(f"<p class=\"en-only\">{para}</p>" for para in n["en"]["body"].split("\n\n") if para.strip())
    body = f"""
<div class="container">
  <p class="breadcrumb"><a href="{p}news/index.html">← <span class="zh-only">新闻</span><span class="en-only">News</span></a></p>
  <article>
    <time datetime="{n['date']}">{n['date']}</time>
    <header class="page-header">
      <h1 class="zh-only">{n['zh']['title']}</h1>
      <h1 class="en-only">{n['en']['title']}</h1>
    </header>
    <div class="article-body">
      {imgs}
      <div class="zh-only">{paras_zh}</div>
      {paras_en}
    </div>
  </article>
</div>
"""
    write(OUT / f"news/{n['id']}.html", shell(f"news/{n['id']}.html", depth, n["zh"]["title"][:20], body))


def build_forum_2026() -> None:
    body = """
<div class="container">
  <p class="breadcrumb"><a href="../news/index.html">← 新闻</a> · <a href="../index.html">首页</a></p>
  <header class="page-header">
    <h1 class="zh-only">2026 中葡气候与能源科技交流论坛</h1>
    <h1 class="en-only">2026 China-Portugal Science &amp; Technology Forum on Climate and Energy</h1>
    <p class="lead zh-only">绿色能源 · AI 科学 · 青年合作</p>
    <p class="lead en-only">Green Energy · AI for Science · Youth Cooperation</p>
  </header>
  <figure class="figure-banner">
    <img src="../images/forum/forum-2026-banner.png" alt="Forum banner">
  </figure>
  <div class="card" style="margin-bottom:2rem">
    <p><strong class="zh-only">时间：</strong><strong class="en-only">Date:</strong> 2026年5月29日 14:00–18:00</p>
    <p><strong class="zh-only">地点：</strong><strong class="en-only">Venue:</strong> <span class="zh-only">中国石油大学（北京）主楼 C308 会议室</span><span class="en-only">Room C308, Main Building, CUP Beijing</span></p>
    <p class="zh-only"><strong>指导单位：</strong>科技部国际科技合作中心</p>
    <p class="en-only"><strong>Guidance:</strong> China Science and Technology Exchange Center (MOST)</p>
    <p class="zh-only"><strong>主办单位：</strong>中国石油大学（北京）中葡气候与能源联合研究院</p>
    <p class="en-only"><strong>Organizer:</strong> China-Portugal Joint Research Institute on Climate and Energy, CUP</p>
  </div>
  <figure class="figure-banner">
    <img src="../images/forum/forum-2026-meeting.png" alt="Forum meeting">
  </figure>
  <h2 class="section-title zh-only">议程</h2>
  <h2 class="section-title en-only">Agenda</h2>
  <table class="schedule">
    <thead><tr><th class="zh-only">时段</th><th class="en-only">Time</th><th class="zh-only">内容</th><th class="en-only">Program</th></tr></thead>
    <tbody>
      <tr><td colspan="2" class="session zh-only">14:00–14:45 开幕式与签约</td></tr>
      <tr><td colspan="2" class="session en-only">14:00–14:45 Opening & Signing</td></tr>
      <tr><td>14:00</td><td class="zh-only">开幕致辞：张广清副校长（中石油大）、吴燕滨（联合国工发组织 ITPO 北京原主任）</td></tr>
      <tr><td>14:00</td><td class="en-only">Opening remarks by Vice President Zhang Guangqing (CUP) and Wu Yanbin</td></tr>
      <tr><td>14:20</td><td class="zh-only">专家委员会成立、科技合作协议签约（横琴粤澳深度合作区中葡科技交流中心、中关村软件园、全球气候创新中心等）</td></tr>
      <tr><td colspan="2" class="session zh-only">14:45–15:15 中葡机构建设</td></tr>
      <tr><td colspan="2" class="session en-only">14:45–15:15 Institutional Development</td></tr>
      <tr><td>14:45</td><td class="zh-only">中葡气候与能源联合研究院建设进展与规划 — 廖宗湖（院长）、钟欢（横琴中葡中心）</td></tr>
      <tr><td colspan="2" class="session zh-only">15:30–17:35 专题交流与产业合作</td></tr>
      <tr><td>15:30</td><td class="zh-only">能源+AI for Science：里斯本大学 Leonardo Azevedo、João Narciso；都灵理工 Alessandro Decarlis；北工大李方昱；同济程亦兴 等</td></tr>
      <tr><td>16:30</td><td class="zh-only">能源+AI 基础设施：中科院智能、中国电子节能协会、百度、中海油、并行科技 等</td></tr>
      <tr><td colspan="2" class="session zh-only">17:35–18:00 国际青年合作展望</td></tr>
      <tr><td>17:35</td><td class="zh-only">杨威（中石油大）、苏祖琪（全球气候创新中心）</td></tr>
    </tbody>
  </table>
  <p class="zh-only" style="margin-top:2rem;color:var(--muted);font-size:0.9rem">可将您上传的论坛宣传海报保存为 <code>images/forum/forum-2026-poster.jpg</code> 后刷新页面替换横幅图。</p>
</div>
"""
    write(OUT / "events/forum-2026.html", shell("events/forum-2026.html", 1, "2026论坛", body))


def build_carbon_finance(data: dict) -> None:
    sections = ""
    for s in data["zh"]["sections"]:
        sections += f'<div class="card"><h3>{s["title"]}</h3><p>{s["body"]}</p></div>'
    sections_en = ""
    for s in data["en"]["sections"]:
        sections_en += f'<div class="card en-only"><h3>{s["title"]}</h3><p>{s["body"]}</p></div>'
    body = f"""
<div class="container">
  <p class="breadcrumb"><a href="../../index.html">首页</a> / <span class="zh-only">下属部门</span><span class="en-only">Departments</span></p>
  <header class="page-header">
    <h1 class="zh-only">{data['zh']['title']}</h1>
    <h1 class="en-only">{data['en']['title']}</h1>
    <p class="lead zh-only">{data['zh']['subtitle']}</p>
    <p class="lead en-only">{data['en']['subtitle']}</p>
  </header>
  <p class="zh-only">{data['zh']['intro']}</p>
  <p class="en-only">{data['en']['intro']}</p>
  <div class="card-grid zh-only" style="margin-top:2rem">{sections}</div>
  <div class="card-grid en-only" style="margin-top:2rem">{sections_en}</div>
  <p style="margin-top:2rem"><a href="../../news/index.html">← <span class="zh-only">相关新闻</span><span class="en-only">Related news</span></a></p>
</div>
"""
    write(
        OUT / "departments/carbon-finance/index.html",
        shell("departments/carbon-finance/index.html", 2, "碳金融", body),
    )


def build_blockchain() -> None:
    body = """
<div class="container">
  <p class="breadcrumb"><a href="../../index.html">首页</a> / 下属部门</p>
  <header class="page-header">
    <h1 class="zh-only">区块链金融研究中心</h1>
    <h1 class="en-only">Blockchain Finance Research Center</h1>
    <p class="lead zh-only">原中国石油大学（北京）区块链金融研究中心基本材料，作为研究院下属方向保存待用。</p>
    <p class="lead en-only">Former CUP Blockchain Finance Research Center materials, preserved as a sub-department.</p>
  </header>
  <div class="article-body zh-only">
    <p>中国石油大学（北京）区块链金融研究中心（IBF）成立于2022年1月，依托经济管理学院、金融系及中石油大-上海期货交易所金融实验室，围绕区块链金融理论与能源行业应用开展研究。</p>
    <p><strong>研究方向：</strong>产业区块链应用、区块链项目金融现象、能源大宗贸易与期货体系中的数据要素交易等。</p>
    <p>原网站中的「丝绸藏品」「数字支付」栏目已移除，不作为本研究院站点内容。完整原始 HTML 见仓库 <code>website/legacy-source/html/</code>（本地归档）。</p>
  </div>
  <div class="article-body en-only">
    <p>The Institute of Blockchain Finance (IBF) was established in January 2022 at China University of Petroleum (Beijing), focusing on blockchain finance theory and energy-sector applications.</p>
    <p>Legacy pages on silk collections and digital payments are excluded from this site. Raw HTML archives are available in the repository.</p>
  </div>
  <p><a class="btn btn-primary" href="../../materials/README.html" style="margin-top:1rem;display:inline-block;background:var(--primary);color:#fff">查看归档说明</a></p>
</div>
"""
    write(
        OUT / "departments/blockchain-finance/index.html",
        shell("departments/blockchain-finance/index.html", 2, "区块链金融", body),
    )


def build_materials_readme() -> None:
    body = """
<div class="container">
  <header class="page-header">
    <h1 class="zh-only">原始资料归档说明</h1>
    <h1 class="en-only">Materials Archive</h1>
  </header>
  <div class="article-body">
    <p class="zh-only">以下内容已从 <a href="https://nft.cup.edu.cn/" target="_blank" rel="noopener">nft.cup.edu.cn</a> 抓取并保存在项目仓库 <code>website/legacy-source/</code>：</p>
    <ul class="zh-only">
      <li>40 个 HTML 页面（含中心简介、团队、新闻、碳金融等）</li>
      <li>29 张图片</li>
      <li><code>manifest.json</code>、<code>scraped-news.json</code></li>
    </ul>
    <p class="zh-only"><strong>未纳入本站的栏目：</strong>丝绸藏品、数字支付（按您的要求已删除）。</p>
    <p class="zh-only"><strong>已单独建站栏目：</strong>碳金融 → <code>departments/carbon-finance/</code></p>
    <p class="zh-only">重新抓取命令（在开发机）：<code>python3 website/scripts/scrape-legacy-site.py</code></p>
  </div>
</div>
"""
    write(OUT / "materials/README.html", shell("materials/README.html", 1, "归档", body))


def main() -> None:
    news = json.loads((ROOT / "data/news.json").read_text(encoding="utf-8"))
    carbon = json.loads((ROOT / "data/carbon-finance.json").read_text(encoding="utf-8"))

    build_index()
    build_about()
    build_research()
    build_contact()
    build_news_index(news)
    for n in news:
        if not n.get("eventPage"):
            build_news_article(n)
    build_forum_2026()
    build_carbon_finance(carbon)
    build_blockchain()
    build_materials_readme()

    # copy js if not exists
    if not (OUT / "js/main.js").exists():
        shutil.copy(ROOT / "js/main.js", OUT / "js/main.js")
    print("Build complete. Upload all files in cp-jri-static/ to your web root via SFTP.")


if __name__ == "__main__":
    main()
