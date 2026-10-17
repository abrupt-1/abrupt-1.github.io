# 雅思词块复习站

雅思 6.0–6.5 备考向的词块库 + 间隔重复复习工具，纯静态页面，个人复习用途。

共 **565 条词块**，按 7 个雅思话题域组织，每条含中文意图、英文例句、例句翻译和易错提示。

## 特点

- **纯静态、零外部依赖**：不加载任何 CDN 字体、图标或分析脚本，可离线打开
- **多维筛选**：话题（导航）· 动词 · 难度 · 类型 · 用途，可任意叠加
- **翻卡模式**：一次一张，底部「上一个 / 下一个」，支持键盘方向键与触屏滑动
- **自测模式**：右上角悬浮按钮一键遮挡中文，点卡片展开核对
- **间隔重复复习**：三档评分 + 固定间隔排期，进度存在浏览器本地，可导出导入
- **可打印**：打印时自动隐藏导航与按钮，展开所有中文
- **深色模式**：跟随系统，可手动切换
- **手机可读**：响应式布局，顶栏下滑自动隐藏，侧栏收成抽屉

## 数据规模

| 话题 | 条数 |
|---|---|
| 教育与学术 | 100 |
| 工作与经济 | 100 |
| 社会与政策 | 100 |
| 日常生活 | 100 |
| 环境与健康 | 65 |
| 科技与媒体 | 55 |
| 文化与心理 | 45 |
| **合计** | **565** |

| 类型 | 条数 |
|---|---|
| 动词类 | 372 |
| 形容词类 | 69 |
| 名词短语 | 68 |
| 写作句式 | 56 |

用途：口语 28 · 通用 261 · 写作 276　　难度：B1 30 · B1+ 131 · B2 404

## 页面结构

```
.
├── index.html              首页 · 学习路线
├── chunks.html             词块库 · 话题总览（7 个话题入口）
├── chunks-<topic>.html  ×7 按话题的翻卡页
├── list-<topic>.html    ×7 按话题的列表页（搜索、筛选、打印）
├── review.html             今日复习
├── method.html             复习方法
├── 404.html                自定义 404
├── .nojekyll               关闭 Jekyll 处理
├── .gitignore
├── CNAME.example           自定义域名示例
└── assets/
    ├── css/  style.css / stage1.css / stage2.css
    └── js/   app.js / stage1.js / stage2.js
```

站点地址：**https://abrupt-1.github.io/**

## 部署方式

本仓库使用**分支部署**：

- **Settings → Pages → Source** = *Deploy from a branch*
- **Branch** = `main`，目录 = `/ (root)`

每次 `git push` 后 GitHub 会自动重新构建，通常一两分钟生效。

> 仓库名必须严格等于 `<用户名>.github.io` 才会被当作「用户站点」发布到根域名。
> 名字不匹配会退化成项目站点，地址变成 `https://<用户名>.github.io/<仓库名>/`。

## 复习规则

| 评分 | 下次出现 |
|---|---|
| 忘了 | 1 天后，熟练度归零 |
| 模糊 | 3 天后，熟练度不变 |
| 记住 | 首次 7 天，连对第 2 次 14 天，第 3 次起 30 天 |

- 每日新卡上限可调（5 / 10 / 20 / 30 / 50），到期复习不受此限制
- 两个问答方向可切换：中→英（默认，练产出）/ 英→中
- 进度存在 `localStorage`（键 `er-review-v1`），**不联网、不上传**
- 换设备或清缓存会丢失，请定期用「导出进度 JSON」备份

## 修改内容

站点的「源码」在本机的构建工具目录里（**不在本仓库中**）：

```
english-review-tools/
├── content/chunks.json       词块资料本体
├── content/incoming/*.json   分批新增的批次文件（幂等合并）
├── pages/*.html              独立页面片段
├── templates/*.html          按话题批量生成的页面模板
├── shell.html                页面外壳（顶栏 / 侧栏 / 页脚）
├── build.mjs                 生成器（输出到本仓库）
├── merge.mjs                 批次合并（校验 + 按 id 去重 + 自动维护总数）
├── check.mjs                 内容质检（重复、近重复、例句与词块是否匹配）
└── verify.mjs                产出校验（链接、锚点、卡片数一致性）
```

**加词块的标准流程**

1. 新建 `content/incoming/<话题>.json`，写入数组，字段如下：

```json
{
  "id": "unique-kebab-id",
  "chunk": "make a decision",
  "zh": "做决定",
  "example": "We had to make a decision fast.",
  "exampleZh": "我们必须尽快做决定。",
  "cat": "make",
  "level": "B1+",
  "type": "v",
  "purpose": "both",
  "tags": ["工作", "日常"],
  "note": "decision 的动词搭档是 make。",
  "topic": "work"
}
```

- `type`：`v` 动词类 / `a` 形容词类 / `n` 名词短语 / `f` 写作句式
- `purpose`：`speak` 口语 / `write` 写作 / `both` 通用
- `cat` **仅动词类必填**，取值 `make` / `take` / `do` / `get` / `have` / `other`
- `topic` 建议显式写，缺省时按 `tags` 推导

2. 依次运行：

```bash
node merge.mjs    # 校验并合并，任何一条不合法就整体中止
node check.mjs    # 内容质检，应零提示
node build.mjs    # 生成页面到本仓库
node verify.mjs   # 产出校验，应全部通过
```

3. `git add -A && git commit && git push`

> 不要直接手改 `chunks-*.html` / `list-*.html` / `review.html`，它们是生成结果。

## 自定义域名

把 `CNAME.example` 改名为 `CNAME`，内容换成你的域名（只要域名，不要 `https://`）。

## 许可

个人复习用途，内容可自由修改。
