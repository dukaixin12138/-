import { PrismaClient } from '@prisma/client'
import { randomBytes, scryptSync } from 'node:crypto'

const prisma = new PrismaClient()

function hashPassword(password) {
  const salt = randomBytes(16).toString('hex')
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`
}

function calcReadingTime(source) {
  const cn = (source.match(/[\u4e00-\u9fa5]/g) || []).length
  const en = (source.match(/[a-zA-Z0-9]+/g) || []).length
  return Math.max(1, Math.round(cn / 350 + en / 200))
}

const categories = [
  { name: '前端工程', slug: 'frontend', desc: '框架、构建与工程化实践', sort: 1 },
  { name: '后端笔记', slug: 'backend', desc: '服务端、数据库与架构设计', sort: 2 },
  { name: '随笔', slug: 'essay', desc: '记录一些零散的想法', sort: 3 },
]

/**
 * 生成 URL 友好的 slug，保留中文。
 *
 * 不能用 /[^\w]+/ 之类的规则：\w 不包含中文，像「性能优化」会被整体替换成
 * 一个 '-'，再去掉首尾横线就变成空字符串，前台标签链接直接失效。
 */
function slugify(text) {
  return String(text)
    .trim()
    .toLowerCase()
    .replace(/[`*_[\]()#!]/g, '')
    .replace(/[^\w\u4e00-\u9fa5\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)
}

// 标签必须来自正文实际涉及的技术，避免出现「讲 Nuxt 的文章挂 Tailwind 标签」这类错配
const tagNames = ['Nuxt', 'Vue', 'TypeScript', 'Tailwind', 'Prisma', 'MySQL', '性能优化']

const posts = [
  {
    title: '用 Nuxt 4 搭建一个可部署的博客系统',
    slug: 'build-blog-with-nuxt4',
    summary:
      '从零搭建博客：服务端渲染、Prisma 数据建模、Markdown 渲染与后台管理，一套流程走通。',
    categorySlug: 'frontend',
    // 正文讲的是 Nuxt 渲染模式、Prisma 建模与 Markdown 渲染，全程未涉及 Tailwind
    tags: ['Nuxt', 'Vue', 'TypeScript', 'Prisma'],
    featured: true,
    content: `## 为什么选择 Nuxt

构建博客系统时，最先要解决的是**渲染方式**。纯客户端渲染的 SPA 首屏慢、不利于搜索引擎抓取，而纯静态站点又难以支撑在线编辑。

Nuxt 的价值在于它同时提供两种能力：

- 构建时预渲染（SSG）—— 内容稳定时直接产出静态文件
- 服务端渲染（SSR）—— 需要在后台改完立刻生效

### 数据建模

用 Prisma 描述文章、分类、标签三者的关系：

\`\`\`prisma
model Post {
  id       Int     @id @default(autoincrement())
  title    String  @db.VarChar(200)
  slug     String  @unique
  content  String  @db.LongText
  status   String  @default("draft")
  authorId Int
}
\`\`\`

### 渲染 Markdown

代码高亮放在服务端完成，避免把高亮引擎打进客户端包：

\`\`\`ts
const html = await renderMarkdown(post.content)
\`\`\`

这样做的好处是客户端只需渲染静态 HTML，解析成本降为零。

> 一个原则：能在构建期或服务端算完的东西，就不要留给浏览器。

## 小结

先把数据流跑通，再考虑样式与动效。`,
  },
  {
    title: 'Tailwind CSS v4 的配置方式变了什么',
    slug: 'tailwind-v4-changes',
    summary: 'v4 把配置从 JS 文件搬到了 CSS 里，@theme 取代了 tailwind.config.js。',
    categorySlug: 'frontend',
    tags: ['Tailwind', '性能优化'],
    featured: false,
    content: `## 从 JS 配置到 CSS 配置

Tailwind v3 需要在 \`tailwind.config.js\` 里维护主题，v4 则把设计令牌直接写进 CSS：

\`\`\`css
@import "tailwindcss";

@theme {
  --color-brand-500: #3b82f6;
  --font-sans: "Inter", system-ui, sans-serif;
}
\`\`\`

### 自定义变体

v4 用 \`@custom-variant\` 定义变体，例如把暗色模式从媒体查询改成 class 驱动：

\`\`\`css
@custom-variant dark (&:where(.dark, .dark *));
\`\`\`

### 构建速度

新引擎不再扫描整个项目，增量编译明显更快。实测一个中型项目冷启动从 3.2s 降到 0.8s 左右。

## 迁移建议

如果是从 v3 升级，先把 \`tailwind.config.js\` 中的 theme 段逐条翻译成 CSS 变量，再处理插件部分。`,
  },
  {
    title: 'MySQL 索引设计的几个实际取舍',
    slug: 'mysql-index-tradeoffs',
    summary: '联合索引的列顺序、覆盖索引、以及为什么前缀索引在字符串字段上更划算。',
    categorySlug: 'backend',
    tags: ['MySQL', '性能优化'],
    featured: false,
    content: `## 联合索引的列顺序

最左前缀原则决定了列顺序的重要性。对查询：

\`\`\`sql
SELECT * FROM posts WHERE status = 'published' ORDER BY published_at DESC;
\`\`\`

建立 \`(status, published_at)\` 而不是 \`(published_at, status)\`，才能同时命中过滤与排序。

### 覆盖索引

如果查询只需要少数字段，把它们全部放进索引即可避免回表：

\`\`\`sql
ALTER TABLE posts ADD INDEX idx_cover (status, published_at, id);
\`\`\`

### 前缀索引

对长字符串字段，全字段索引既占空间又慢：

\`\`\`sql
ALTER TABLE posts ADD INDEX idx_slug (slug(32));
\`\`\`

## 别忘了看执行计划

任何索引决策都应该用 \`EXPLAIN\` 验证，而不是凭直觉。`,
  },
  {
    title: '写作这件事，先降低启动成本',
    slug: 'lower-writing-cost',
    summary: '与其纠结工具和排版，不如先把「开始写」这件事变得足够容易。',
    categorySlug: 'essay',
    tags: [],
    featured: false,
    content: `## 拖延的真正原因

大多数时候不是没想法，而是启动成本太高：打开编辑器、选主题、调格式。

### 三个能立刻执行的动作

1. 固定一个新建文章的入口，一键直达编辑器
2. 标题先随便写，写完再改
3. 允许第一版很烂

> 完成比完美重要，尤其是在开始阶段。

## 之后呢

等写作习惯稳定了，再去折腾主题和样式也不迟。`,
  },
]

async function main() {
  const adminUsername = process.env.ADMIN_USERNAME || 'admin'
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123'

  const author = await prisma.user.upsert({
    where: { username: adminUsername },
    update: {},
    create: {
      username: adminUsername,
      nickname: '管理员',
      email: 'admin@example.com',
      passwordHash: hashPassword(adminPassword),
      role: 'admin',
      bio: '保持好奇，持续记录。',
    },
  })

  const categoryMap = new Map()
  for (const item of categories) {
    const category = await prisma.category.upsert({
      where: { slug: item.slug },
      update: { name: item.name, desc: item.desc, sort: item.sort },
      create: item,
    })
    categoryMap.set(item.slug, category.id)
  }

  const tagMap = new Map()
  for (const name of tagNames) {
    const slug = slugify(name)
    const tag = await prisma.tag.upsert({
      where: { name },
      // update 也要写 slug，才能修正历史遗留的错误 slug
      update: { slug },
      create: { name, slug },
    })
    tagMap.set(name, tag.id)
  }

  // 清理历史遗留的空标签（早期测试数据），只删没有任何文章关联的，不动在用标签
  const removed = await prisma.tag.deleteMany({
    where: { name: { notIn: tagNames }, posts: { none: {} } },
  })
  if (removed.count) console.log(`清理了 ${removed.count} 个未被使用的标签`)

  const now = Date.now()

  for (const [index, item] of posts.entries()) {
    const publishedAt = new Date(now - index * 86_400_000 * 3)

    const post = await prisma.post.upsert({
      where: { slug: item.slug },
      update: {
        title: item.title,
        summary: item.summary,
        content: item.content,
        status: 'published',
        featured: item.featured,
        readingTime: calcReadingTime(item.content),
        categoryId: categoryMap.get(item.categorySlug) ?? null,
        publishedAt,
      },
      create: {
        title: item.title,
        slug: item.slug,
        summary: item.summary,
        content: item.content,
        status: 'published',
        featured: item.featured,
        views: Math.floor(Math.random() * 400) + 50,
        readingTime: calcReadingTime(item.content),
        publishedAt,
        authorId: author.id,
        categoryId: categoryMap.get(item.categorySlug) ?? null,
      },
    })

    await prisma.postTag.deleteMany({ where: { postId: post.id } })
    const tagIds = item.tags.map((name) => tagMap.get(name)).filter(Boolean)
    if (tagIds.length) {
      await prisma.postTag.createMany({
        data: tagIds.map((tagId) => ({ postId: post.id, tagId })),
      })
    }
  }

  console.log('种子数据写入完成')
  console.log(`后台账号：${adminUsername} / ${adminPassword}`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
