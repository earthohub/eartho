# 中葡气候与能源联合研究院 · 官方网站

现代、简约的研究机构官网，支持中英文切换与新闻动态展示。

## 本地开发

```bash
cd website
npm install
npm run dev
```

浏览器访问 [http://localhost:3000](http://localhost:3000)。

## 如何更新内容（上传原网站材料）

### 1. 站点文案（关于我们、研究方向、联系方式等）

编辑 **`src/content/site.json`**：

- `zh`：中文内容
- `en`：英文内容

可直接把原网站对应段落复制到相应字段。联系方式请更新 `contact.emailValue`、`contact.addressValue` 等。

### 2. 新闻动态

编辑 **`src/content/news.json`**，每条新闻格式如下：

```json
{
  "id": "唯一英文标识",
  "date": "2025-06-01",
  "featured": true,
  "zh": {
    "title": "标题",
    "summary": "列表页摘要",
    "body": "详情正文，段落之间用 \\n\\n 分隔"
  },
  "en": {
    "title": "Title",
    "summary": "Summary",
    "body": "Full article body..."
  }
}
```

- `id` 会用于网址：`/news/你的id`
- `featured` 暂未用于筛选，可保留作扩展
- 日期越新，排序越靠前

### 3. 图片与附件

将图片放入 **`public/`**，例如 `public/images/seminar.jpg`，在新闻 `body` 中可写说明，或后续扩展 Markdown 支持。

### 4. 合作伙伴 Logo

首页合作伙伴占位区在 `src/app/page.tsx` 底部，可将占位块替换为真实 Logo 图片链接。

## 部署

```bash
npm run build
npm start
```

也可部署至 [Vercel](https://vercel.com)、Netlify 等，根目录选择 **`website`** 文件夹。

## 技术栈

- [Next.js](https://nextjs.org)（App Router）
- [Tailwind CSS](https://tailwindcss.com)
- 内容：JSON 文件，便于非开发人员维护

## 原站归档（nft.cup.edu.cn）

已从 [https://nft.cup.edu.cn/](https://nft.cup.edu.cn/) 抓取区块链金融研究中心站点内容（含中葡研究院揭牌新闻），保存在 **`legacy-source/`**：

- `legacy-source/html/` — 原始 HTML（40 页）
- `legacy-source/images/` — 图片资源
- `legacy-source/manifest.json` — 页面索引与正文抽取
- `legacy-source/scraped-news.json` — 新闻/公告结构化列表

重新抓取：`python3 scripts/scrape-legacy-site.py`
