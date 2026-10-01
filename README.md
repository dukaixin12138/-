<div align="center">
  <img src="./public/icon.svg" alt="博客系统图标" width="96" height="96">
  <h1>博客系统</h1>
  <p>基于 Nuxt 4 的全栈博客，前台展示 + 后台管理一体，支持在线 Markdown 写作。</p>
</div>

---

> **图标含义**：三条长短不等的横线代表「文章列表」，也正是本站编辑式版式的核心元素；
> 最后一根用品牌蓝，呼应正站里「当前项高亮」的交互。纯几何、无细线，缩到 16px 仍可辨认。

## 技术栈

| 层 | 选型 |
|---|---|
| 框架 | Nuxt 4.5（SSR 与 Nitro 后端一体） |
| 语言 | TypeScript |
| 样式 | Tailwind CSS v4（`@tailwindcss/vite`） |
| 版式 | 编辑式（Swiss）：左侧固定 rail + 编号行列表，无卡片化 |
| 图标 | Phosphor Icons（导航区，支持 fill/regular 切换）+ Lucide（功能图标） |
| 数据库 | MySQL 8+ / 26.x |
| ORM | Prisma 6 |
| 鉴权 | nuxt-auth-utils（Sealed Cookie Session）+ scrypt 口令哈希 |
| Markdown | markdown-it + Shiki（双主题代码高亮，结果按 slug 缓存） |
| 编辑器 | md-editor-v3 |
| 搜索 | MySQL FULLTEXT + ngram 解析器（中文分词，无命中时回退 LIKE） |
| 动画 | @vueuse/motion（声明式 v-motion）+ AutoAnimate（列表增删自动补间） |
| 路由进度条 | NProgress（页面切换时的顶部指示条，配色已适配明暗模式） |
| 动态背景 | 5 套可切换主题：金色流星（原生 Canvas + 星图层）+ Vanta.js 的 NET / DOTS / FOG / WAVES |
| 外观自定义 | 明暗模式、动态背景主题、全站字体颜色，三者均持久化并防首屏闪烁 |

## 快速开始

### 1. 启动 MySQL

本项目使用本地 MySQL 实例（数据目录 `C:\Users\32795\mysql-data`）。

```powershell
& 'C:\Program Files\MySQL\MySQL Server 26.7\bin\mysqld.exe' --datadir='C:\Users\32795\mysql-data' --port=3306
```

首次使用需初始化数据目录与数据库：

```powershell
& 'C:\Program Files\MySQL\MySQL Server 26.7\bin\mysqld.exe' --initialize-insecure --datadir='C:\Users\32795\mysql-data' --console
& 'C:\Program Files\MySQL\MySQL Server 26.7\bin\mysql.exe' -u root --skip-password -e "ALTER USER 'root'@'localhost' IDENTIFIED BY 'MySQL123!'; CREATE DATABASE IF NOT EXISTS my_blog CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

### 2. 安装与初始化

```bash
npm install          # 安装依赖（会自动执行 prisma generate）
npm run db:migrate   # 应用数据库迁移
npm run db:seed      # 写入示例文章与管理员账号
```

### 3. 启动

```bash
npm run dev          # http://localhost:3000
```

## 环境变量

复制 `.env.example` 为 `.env` 并按需修改：

| 变量 | 说明 |
|---|---|
| `DATABASE_URL` | MySQL 连接串 |
| `NUXT_SESSION_PASSWORD` | 会话加密密钥，至少 32 位，生产环境务必更换 |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | 首次登录时自动创建的管理员账号（默认 `admin` / `admin123`） |
| `NUXT_PUBLIC_SITE_URL` | 站点地址，用于 sitemap 与 RSS |

## 可用脚本

| 命令 | 作用 |
|---|---|
| `npm run dev` | 启动开发服务器 |
| `npm run build` | 生产构建 |
| `npm run preview` | 预览生产构建 |
| `npm run db:migrate` | 应用迁移（推荐，有版本记录） |
| `npm run db:push` | 直接同步 schema（仅开发期快速验证，不产生迁移文件） |
| `npm run db:studio` | 打开 Prisma Studio 可视化数据 |
| `npm run db:seed` | 写入种子数据 |
| `npm run typecheck` | Vue + TypeScript 类型检查 |
| `npm test` | 运行单元测试（Vitest） |

## 目录结构

```
├─ app/
│  ├─ assets/css/main.css      # Tailwind v4 主题与设计令牌
│  ├─ components/              # 通用组件（含 Markdown 编辑器、搜索弹窗）
│  ├─ composables/useTheme.ts  # 明暗主题
│  ├─ layouts/                 # default / admin 两套布局
│  ├─ middleware/              # 后台鉴权中间件
│  ├─ pages/                   # 前台页面 + admin/ 后台页面
│  └─ utils/format.ts          # 日期等格式化
├─ prisma/
│  ├─ schema.prisma            # 数据模型
│  └─ seed.mjs                 # 种子数据
└─ server/
   ├─ api/                     # 公开接口、auth、admin 接口
   ├─ routes/                  # sitemap.xml、rss.xml
   └─ utils/                   # prisma 实例、Markdown 渲染、鉴权
```

## 路由一览

| 路径 | 说明 |
|---|---|
| `/` | 首页（置顶 + 最新文章 + 分类） |
| `/posts` | 文章列表（支持 `keyword` / `category` / `tag` 筛选） |
| `/posts/:slug` | 文章详情（目录、代码高亮、上下篇） |
| `/categories`、`/categories/:slug` | 分类 |
| `/tags/:slug` | 标签 |
| `/archive` | 按年份归档 |
| `/about` | 关于 |
| `/rss.xml`、`/sitemap.xml` | 订阅与站点地图 |
| `/admin/login` | 后台登录 |
| `/admin` | 后台概览 |
| `/admin/posts` | 文章管理 |
| `/admin/posts/:id/edit` | 编辑文章 |
| `/admin/posts/new` | 写新文章（粘贴 / 拖拽图片自动上传） |
| `/admin/comments` | 评论管理（通过 / 隐藏 / 删除，支持批量） |
| `/admin/users` | 用户管理（仅管理员可见，可调整角色） |
| `/robots.txt` | 爬虫规则 |

## 后台能力说明

| 能力 | 说明 |
|---|---|
| **草稿自动保存** | 编辑器停止输入 3 秒后自动保存；新建文章首次自动保存即落库并转为编辑态，避免内容丢失 |
| **定时发布** | 发布设置里可填未来时间。到点前文章不会出现在列表、详情、归档、分类计数、sitemap 与 RSS 中（统一由 `publishedPostFilter()` 控制） |
| **正文全文搜索** | 基于 MySQL FULLTEXT + ngram，标题命中的排序权重高于正文 |
| **多作者与权限** | `admin` 可管理全部内容与用户；`author` 仅能查看与编辑自己的文章，访问用户管理会返回 403 |
| **批量操作** | 文章支持批量发布 / 转草稿 / 删除；评论支持批量通过 / 隐藏 / 删除（单次上限 100 条） |
| **交互反馈** | 全局 Toast 与确认弹窗替代原生 `alert`/`confirm`；列表加载有骨架屏与顶部进度条 |

## 动态背景

右上角的调色板图标可切换背景主题，选择结果会记入 `localStorage`，刷新后保持。

| 主题 | 实现 | 说明 |
|---|---|---|
| **金色流星**（默认） | 原生 Canvas 2D | 斜向划过的金色微光，带渐变拖尾；明暗模式各一套配色 |
| 蓝色网络 | Vanta NET | 连线交织成的网格 |
| 灵动星点 | Vanta DOTS | 随光标流动的点阵 |
| 柔和晨雾 | Vanta FOG | 低饱和的流动雾面 |
| 深邃波浪 | Vanta WAVES | 层叠起伏的水面 |

实现要点：

- 背景挂在 `layouts/default.vue`，`position: fixed` 铺满视口，内容层 `z-10`；后台布局不受影响。
- `.main-scrim` 渐变蒙层：首屏顶部仅 18% 遮罩（背景清晰可见），到 420px 渐至 82%、底部 88%，兼顾背景可见与长文可读。
- Vanta 主题按需动态加载（`vanta/dist/vanta.<name>.min.js`，各自独立 chunk）；three.js 只在切到 Vanta 主题时才加载，默认的流星主题零依赖。
- Vanta 的 UMD 导出形态不统一，`resolveVantaFactory()` 会逐层探测 `default` → `default.default` → 全局 `VANTA[NAME]` 兜底。
- 遵守 `prefers-reduced-motion`；初始化失败只在控制台告警并降级为纯色背景，不影响页面。

## 持续集成

`.github/workflows/ci.yml` 会在 push 与 PR 时依次执行：安装依赖 → `prisma generate` → 类型检查 → 单元测试 → 生产构建。

## 部署提示

- 部署到 Vercel 等 Serverless 平台时，`DATABASE_URL` 需指向公网可访问的 MySQL（本地实例不可用），推荐 PlanetScale / TiDB Cloud Serverless 等兼容 MySQL 协议的服务。
- 生产环境务必更换 `NUXT_SESSION_PASSWORD`，并把会话 Cookie 的 `secure` 保持为 `true`（`nuxt.config.ts` 中已按 `NODE_ENV` 自动切换）。
- 登录失败同一 IP 15 分钟内超过 5 次会被临时锁定；评论同一 IP 每分钟最多 3 条。
- **图片上传当前写入本地 `public/uploads`，仅适用于本地开发与自托管**。Serverless 平台没有持久化磁盘，必须改用对象存储（R2 / OSS / COS / S3）：替换 `server/utils/storage.ts` 中 `saveImage` 的实现即可，接口与调用方无需改动。
- 日期格式化统一使用 `app/utils/format.ts` 中的 `SITE_TIME_ZONE`（默认 `Asia/Shanghai`）。**不要改回浏览器本地时区**，否则 SSR 与客户端结果不一致会触发 hydration 警告。
- 数据库结构变更请使用 `npm run db:migrate` 生成迁移文件并提交到版本控制，不要在生产环境用 `db push`。
