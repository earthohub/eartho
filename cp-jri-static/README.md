# JRICE 官网（静态 · SFTP 上传）

**JRICE** = China-Portugal Joint Research Institute on Climate and Energy（中葡气候与能源联合研究院）

面向公众的宣传网站。纯 HTML，无需 Node.js。

---

## 下载网站（推荐）

浏览器打开下面链接，会自动下载 ZIP：

**https://github.com/earthohub/eartho/archive/refs/heads/cursor/institute-website-0363.zip**

1. 解压 ZIP  
2. 进入文件夹 **`cp-jri-static`**  
3. 双击 **`index.html`** 预览（或见下方「上传服务器」）

---

## 上传服务器（FileZilla SFTP）

将 **`cp-jri-static`** 里的**全部文件**（不是外层 ZIP 夹）上传到网站根目录 `public_html`。

或在仓库里执行：

```bash
cd cp-jri-static
bash package.sh
```

解压生成的 zip 后同样上传到根目录。

---

## 放入您的论坛图片

把您提供的三张图复制到：

`cp-jri-static/images/events/`

文件名：

- `2026-forum-banner.jpg`
- `2026-forum-poster.jpg`
- `2026-forum-meeting.jpg`

详见 `images/events/README.txt`。

---

## 修改内容后重新生成

```bash
cd cp-jri-static
# 编辑 data/news.json 或 data/forum-2026.json
python3 build.py
```

---

## 站点结构

| 页面 | 说明 |
|------|------|
| 首页 | JRICE 简介与最新动态 |
| About / 关于 | 研究院概况 |
| Research / 研究 | 研究方向 |
| News / 新闻 | 可搜索；引用原文报道 |
| Forum 2026 | 论坛信息（原文议程） |
| Contact / 联系 | 联系方式 |

**不包含**：碳金融、区块链金融中心、原始资料归档（已按您的要求移除）。

区块链中心等原始 HTML 仍在仓库 `website/legacy-source/`，仅供内部存档。
