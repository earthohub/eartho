# 中葡气候与能源联合研究院 · 静态官网（SFTP 上传版）

可直接打包上传至服务器，无需 Node.js 运行环境。

## 本地预览

用浏览器打开 `index.html`，或使用简单 HTTP 服务：

```bash
cd cp-jri-static
python3 -m http.server 8080
# 访问 http://localhost:8080
```

## 重新生成页面

编辑 `data/news.json`、`data/carbon-finance.json` 后运行：

```bash
python3 build.py
```

## 打包上传（FileZilla SFTP）

```bash
./package.sh
```

将生成的 `cp-jri-website-YYYYMMDD.zip` 解压后，**把解压出的所有文件和文件夹**上传到网站根目录（如 `public_html`），不要多包一层目录。

## 目录说明

| 路径 | 说明 |
|------|------|
| `index.html` 等 | 研究院主页、关于、研究、联系 |
| `news/` | 可检索新闻列表与详情 |
| `events/forum-2026.html` | 2026 中葡论坛议程 |
| `departments/carbon-finance/` | 碳金融子部门 |
| `departments/blockchain-finance/` | 区块链金融中心（原始材料说明） |
| `images/forum/` | 论坛宣传图（可替换为您上传的海报） |
| `materials/README.html` | 原 nft.cup.edu.cn 归档说明 |

## 替换论坛图片

将您的会议海报、日程图放入：

- `images/forum/forum-2026-banner.png` — 首页/论坛横幅
- `images/forum/forum-2026-poster.jpg` — 可选，完整日程海报
- `images/forum/forum-2026-meeting.jpg` — 可选，会场照片

替换后无需重新 build（除非改 HTML 结构）。

## 原站材料

区块链金融中心完整 HTML 在仓库 `website/legacy-source/`。丝绸藏品、数字支付栏目**未**纳入本站。
