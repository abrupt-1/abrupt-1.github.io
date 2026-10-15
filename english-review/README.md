# 雅思词块复习站

雅思 6.0–6.5 备考向的动词搭配词块库，纯静态页面，用于个人英语复习。
共 **82 条词块**，按 make / take / do / get / have 及其他高频动词分组，每条含中文意图、例句、例句翻译和易错提示。

## 特点

- **纯静态、零外部依赖**：不加载任何 CDN 字体、图标或分析脚本，可离线打开
- **可打印**：打印时自动隐藏导航与按钮，并展开所有中文，方便纸面自测
- **手机可读**：响应式布局，侧栏在小屏收成抽屉菜单
- **深色模式**：跟随系统，可手动切换
- **搜索与筛选**：按关键词搜索、按动词分类或话题标签筛选
- **自测模式**：一键遮挡中文，点卡片展开核对（纯显示切换，不写入任何数据）

## 目录结构

```
english-review/
├── index.html            首页 · 学习路线
├── chunks.html           词块库（82 条）
├── method.html           复习方法
├── 404.html              自定义 404
├── .nojekyll             关闭 Jekyll 处理
├── .gitignore
├── CNAME.example         自定义域名示例
├── .github/workflows/pages.yml
└── assets/
    ├── css/style.css
    └── js/app.js
```

## 部署到 GitHub Pages

### 方式一：分支部署（最简单）

1. 把本目录内容推到仓库根目录（分支 `main`）
2. 仓库 **Settings → Pages**
3. **Source** 选 *Deploy from a branch*
4. **Branch** 选 `main`，目录选 `/ (root)`，**Save**
5. 等最长 10 分钟，访问 `https://<用户名>.github.io`（项目站点则是 `.../<仓库名>`）

> 仓库命名为 `<用户名>.github.io` 时，站点地址就是干净的根域名。

### 方式二：GitHub Actions 部署

1. 仓库 **Settings → Pages → Source** 改为 **GitHub Actions**
2. `.github/workflows/pages.yml` 会在推送时自动运行并发布

## 本地预览

```bash
# Python 3
python -m http.server 8000

# 或直接双击 index.html（file:// 也能读，仅搜索框等交互略受限）
```

## 修改内容

站点的「源码」是 `english-review-tools/`（与本目录同级）：

```
english-review-tools/
├── content/chunks.json   ← 词块资料本体，加词块只改这里
├── pages/*.html          ← 各页正文片段
├── shell.html            ← 页面外壳（顶栏 / 侧栏 / 页脚）
└── build.mjs             ← 生成器
```

**加词块**：在 `content/chunks.json` 的 `chunks` 数组里追加一条，字段如下——

```json
{
  "id": "make-progress",
  "chunk": "make progress",
  "zh": "取得进步",
  "example": "You've made real progress in listening.",
  "exampleZh": "你的听力有了实实在在的进步。",
  "cat": "make",
  "level": "B1+",
  "tags": ["学习"],
  "note": "progress 不可数，不能说 a progress。"
}
```

`cat` 必须是 `categories` 里已有的 id（make / take / do / get / have / other）。
分类计数、标签云、总条数都由构建脚本自动统计，不需要手工维护。

**然后重新构建**：

```bash
cd english-review-tools
node build.mjs
```

> ⚠️ 不要直接改 `english-review/*.html`——它们是生成结果，下次构建会被覆盖。

## 自定义域名

把 `CNAME.example` 改名为 `CNAME`，内容换成你的域名（只要域名，不要 `https://`）。

## 内容说明

- 难度基准：雅思 6.0–6.5（CEFR B1+ ~ B2）
- 词块以**动词搭配**为主，重点覆盖中国学生最常犯的搭配错误
- 例句按学术/社会/环境/教育等雅思常见话题编写
- 本批为「第一批」，后续可继续扩充

## 许可

个人复习用途，内容可自由修改。
