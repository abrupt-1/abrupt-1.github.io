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

站点文件就在**仓库根目录**：

```
.
├── index.html            首页 · 学习路线
├── chunks.html           词块库（82 条）
├── method.html           复习方法
├── 404.html              自定义 404
├── .nojekyll             关闭 Jekyll 处理（纯静态站不需要 Jekyll）
├── .gitignore
├── CNAME.example         自定义域名示例
└── assets/
    ├── css/style.css
    └── js/app.js
```

站点地址：**https://abrupt-1.github.io/**

## 部署方式

本仓库使用**分支部署**：

- **Settings → Pages → Source** = *Deploy from a branch*
- **Branch** = `main`，目录 = `/ (root)`

每次 `git push` 后 GitHub 会自动重新构建，通常一两分钟生效。

> 仓库名必须严格等于 `<用户名>.github.io` 才会被当作「用户站点」发布到根域名。
> 名字不匹配（例如 `abrupt.github.io`）会退化成项目站点，地址变成
> `https://<用户名>.github.io/<仓库名>/`。

本仓库**没有**使用 GitHub Actions 部署，因此不含 `.github/workflows/`。
若以后想改用 Actions，在 Settings → Pages 把 Source 改成 GitHub Actions，
再补一个基于官方模板
[`pages/static.yml`](https://github.com/actions/starter-workflows/blob/main/pages/static.yml)
的工作流即可。

## 本地预览

```bash
# Python 3
python -m http.server 8000

# 或直接双击 index.html（file:// 也能读，仅搜索框等交互略受限）
```

## 修改内容

### 方式一：直接改 HTML（快，适合小改动）

`index.html`、`chunks.html`、`method.html` 是普通静态 HTML，直接改文字即可。

> 注意：**不要在 `chunks.html` 里增删词块卡片**。那部分是构建生成的，
> 手工加进去的卡片会在下次重新构建时丢失。增删词块请用方式二。

### 方式二：改数据再重新构建（推荐，用于增删词块）

词块资料本体是一个 JSON 文件，保存在本机的构建工具目录里
（**不在本仓库中**）：

```
english-review-tools/          ← 在本机工作区，与仓库同级
├── content/chunks.json        ← 词块资料本体，加词块只改这里
├── pages/*.html               ← 各页正文片段
├── shell.html                 ← 页面外壳（顶栏 / 侧栏 / 页脚）
└── build.mjs                  ← 生成器
```

**加一条词块**：在 `content/chunks.json` 的 `chunks` 数组里追加：

```json
{
  "id": "take-turns",
  "chunk": "take turns doing sth",
  "zh": "轮流做某事",
  "example": "We take turns doing the dishes in our flat.",
  "exampleZh": "我们在公寓里轮流洗碗。",
  "cat": "take",
  "level": "B1+",
  "tags": ["日常", "家庭"],
  "note": "固定搭配，turns 用复数。"
}
```

- `cat` 必须是 `categories` 里已有的 id（`make` / `take` / `do` / `get` / `have` / `other`）
- 分类计数、标签云、总条数、侧栏数字都由构建脚本自动统计，**不要手工维护**

**然后重新构建**：

```bash
cd english-review-tools
node build.mjs
```

构建会把页面输出到 `english-review/` 目录，把它里面的文件复制到本仓库根目录，
再提交推送即可。

## 自定义域名

把 `CNAME.example` 改名为 `CNAME`，内容换成你的域名（只要域名，不要 `https://`）。

## 内容说明

- 难度基准：雅思 6.0–6.5（CEFR B1+ ~ B2）
- 词块以**动词搭配**为主，重点覆盖中国学生最常犯的搭配错误
- 例句按学术/社会/环境/教育等雅思常见话题编写
- 本批为「第一批」，后续可继续扩充

## 许可

个人复习用途，内容可自由修改。
