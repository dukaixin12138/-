/**
 * 把「全栈开发通用工具集」这批 Markdown 文档导入成博客文章。
 *
 * 拆分策略：按**技术主题**成篇，而不是按文件成篇。
 * 单主题目录内是「01-xxx.md … + 常用指南.md」，合并后正好是一篇结构完整的文章；
 * 若按文件拆会碎成 170+ 篇短文，若全部合成一篇则是 0.5MB 的巨型单页，两者都不合适。
 *
 * 用法：node scripts/import-toolkit.mjs
 */
import { PrismaClient } from '@prisma/client'
import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'

const prisma = new PrismaClient()

const SOURCE_ROOT = 'f:\\全栈开发通用工具集'
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin'
const CATEGORY_SLUG = 'tooling'

/** 一篇文章 = 一个技术主题目录 */
const ARTICLES = [
  {
    dir: 'JS全栈工具集.md',
    slug: 'js-fullstack-toolkit-overview',
    title: 'JS 全栈工具集：全景地图与生产注意事项',
    extra: ['生产注意事项与进阶方向.md'],
    summary: '把全栈开发要用到的工具分成「通用工具」与「JS 生态专属」两类，并附上生产环境的注意事项与进阶方向。',
    tags: ['工具', '工程化', '全栈'],
  },
  {
    dir: '共享约定.md',
    slug: 'shared-conventions-across-docs',
    title: '跨文档共享约定：容器网络、启动顺序与配置注入',
    summary: '多套技术文档中反复出现、且最容易写错的一组共识：容器内寻址、depends_on 的真实语义、env 注入、SIGTERM 转发与 proxy_pass 尾斜杠。',
    tags: ['Docker', '运维', '约定'],
  },
  {
    dir: 'Apifox技术文档',
    slug: 'apifox-guide',
    title: 'Apifox 使用指南：接口设计、Mock 与自动化测试',
    tags: ['API', '测试', '工具'],
  },
  { dir: 'axios技术文档', slug: 'axios-guide', title: 'axios 使用指南', tags: ['HTTP', '前端'] },
  {
    dir: 'CICD技术文档',
    slug: 'cicd-guide',
    title: 'CI/CD 入门：从流水线概念到落地实践',
    tags: ['CI/CD', '自动化', '运维'],
  },
  { dir: 'curl技术文档', slug: 'curl-guide', title: 'curl 使用指南：参数速查与实战场景', tags: ['命令行', 'HTTP'] },
  {
    dir: 'Docker容器化技术文档',
    slug: 'docker-guide',
    title: 'Docker 容器化指南：从镜像到 Compose 编排',
    tags: ['Docker', '容器化', '运维'],
  },
  { dir: 'ELK技术文档', slug: 'elk-guide', title: 'ELK 日志系统：采集、存储与检索', tags: ['日志', 'ELK', '运维'] },
  {
    dir: 'ESLint技术文档',
    slug: 'eslint-guide',
    title: 'ESLint 配置指南：规则、插件与团队规范',
    tags: ['代码规范', '前端工程化'],
  },
  // git大全 整体 101 KB，按内容主题重新拆成三篇，避免单篇过长
  {
    files: ['git大全/git基础.md', 'git大全/git实际应用.md'],
    slug: 'git-essentials',
    title: 'Git 基础与实战：从提交到团队协作',
    summary: '从工作区 / 暂存区 / 版本库三层模型讲起，覆盖日常命令、撤销与回退、分支协作，以及实践中真正会踩到的坑。',
    tags: ['Git', '版本控制'],
  },
  {
    files: [
      'git大全/Gitee连接配置流程.md',
      'git大全/从GitHub和Gitee下载开源项目步骤笔记.md',
      'git大全/Gitee分支管理与分支结构解读笔记.md',
    ],
    slug: 'git-remote-and-branch',
    title: 'Git 远程仓库与分支管理：Gitee / GitHub 实操',
    summary: 'SSH 连接配置、从远程克隆开源项目、分支结构设计与协作流程的完整实操记录。',
    tags: ['Git', '版本控制'],
  },
  {
    files: ['git大全/CICD流水线.md'],
    slug: 'git-cicd-pipeline-notes',
    title: 'CI/CD 流水线实战笔记',
    summary: '把构建、测试、部署串成自动流水线的具体配置与踩坑记录。',
    tags: ['CI/CD', '自动化'],
  },
  { dir: 'Grafana技术文档', slug: 'grafana-guide', title: 'Grafana 可视化指南：面板与告警', tags: ['监控', 'Grafana'] },
  { dir: 'Husky技术文档', slug: 'husky-guide', title: 'Husky 与 Git 钩子：提交前自动检查', tags: ['Git', '前端工程化'] },
  { dir: 'JMeter技术文档', slug: 'jmeter-guide', title: 'JMeter 性能测试指南', tags: ['性能测试', '测试'] },
  { dir: 'Nginx技术文档', slug: 'nginx-guide', title: 'Nginx 配置指南：反向代理、静态资源与 HTTPS', tags: ['Nginx', '运维'] },
  {
    dir: 'Prettier技术文档',
    slug: 'prettier-guide',
    title: 'Prettier 格式化指南：与 ESLint 的配合',
    tags: ['代码规范', '前端工程化'],
  },
  {
    dir: 'Prometheus技术文档',
    slug: 'prometheus-guide',
    title: 'Prometheus 监控指南：指标、查询与告警规则',
    tags: ['监控', 'Prometheus'],
  },
  { dir: 'Sentry技术文档', slug: 'sentry-guide', title: 'Sentry 错误监控指南', tags: ['监控', '错误追踪'] },
  {
    dir: 'SkyWalking技术文档',
    slug: 'skywalking-guide',
    title: 'SkyWalking 链路追踪指南',
    tags: ['监控', '链路追踪'],
  },
  { dir: 'Swagger技术文档', slug: 'swagger-guide', title: 'Swagger / OpenAPI 接口文档指南', tags: ['API', '接口文档'] },
  { dir: 'vite官方文档', slug: 'vite-guide', title: 'Vite 构建工具指南', tags: ['Vite', '构建工具'] },
  {
    dir: '前端监控技术文档',
    slug: 'frontend-monitoring-guide',
    title: '前端监控体系：错误捕获、性能度量与排错',
    tags: ['监控', '前端'],
  },
  { dir: '安全扫描技术文档', slug: 'security-scan-guide', title: '安全扫描实践：依赖审计与代码扫描', tags: ['安全', '工程化'] },
  {
    dir: '密钥与配置技术文档',
    slug: 'secrets-and-config-guide',
    title: '密钥与配置管理：不要把它们写进代码',
    tags: ['安全', '配置管理'],
  },
]

/**
 * 把 Markdown 标题整体降一级（h1→h2、h2→h3…）。
 * 文章标题由博客系统渲染成 h1，正文里再出现 h1 会破坏文档结构。
 * 代码块内部的 `#` 是注释，必须原样保留。
 */
function demoteHeadings(markdown) {
  const lines = markdown.split('\n')
  const out = []
  let inFence = false
  let fenceChar = ''

  for (const line of lines) {
    const fence = /^\s{0,3}(`{3,}|~{3,})/.exec(line)

    if (fence) {
      const char = fence[1][0]
      if (!inFence) {
        inFence = true
        fenceChar = char
      } else if (char === fenceChar) {
        inFence = false
      }
      out.push(line)
      continue
    }

    if (!inFence && /^#{1,5}\s/.test(line)) {
      out.push(`#${line}`)
      continue
    }

    out.push(line)
  }

  return out.join('\n')
}

/** 指向本地文件的相对链接在合并后必然失效，转成纯文本 */
function stripLocalLinks(markdown) {
  return markdown.replace(/\[([^\]]+)\]\((?:\.{1,2}\/)?[^)]+\.md(?:#[^)]*)?\)/g, '$1')
}

/** 从 README 的引用块里提取一段可直接用作摘要的话 */
function buildSummaryFromReadme(readme) {
  if (!readme) return null

  const text = readme
    .split('\n')
    .filter((line) => line.trim().startsWith('>'))
    .map((line) => line.replace(/^\s*>\s?/, '').trim())
    .filter((line) => line && !line.startsWith('[') && !line.startsWith('http'))
    .join(' ')
    .replace(/[*`\[\]]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

  if (!text) return null
  return text.length > 160 ? `${text.slice(0, 160)}…` : text
}

/** 中文按 350 字/分钟、英文按 200 词/分钟估算阅读时长 */
function calcReadingTime(source) {
  const cn = (source.match(/[\u4e00-\u9fa5]/g) || []).length
  const en = (source.match(/[a-zA-Z0-9]+/g) || []).length
  return Math.max(1, Math.round(cn / 350 + en / 200))
}

/** 按标签名批量获取或创建标签 */
async function resolveTagIds(names) {
  const ids = []

  for (const raw of names) {
    const name = String(raw).trim()
    if (!name) continue

    let tag = await prisma.tag.findUnique({ where: { name } })
    if (!tag) {
      const base = name
        .toLowerCase()
        .replace(/[^\w\u4e00-\u9fa5]+/g, '-')
        .replace(/^-|-$/g, '') || `tag-${Date.now()}`
      let slug = base
      let index = 1
      while (await prisma.tag.findUnique({ where: { slug }, select: { id: true } })) {
        slug = `${base}-${index++}`
      }
      tag = await prisma.tag.create({ data: { name, slug } })
    }
    if (!ids.includes(tag.id)) ids.push(tag.id)
  }

  return ids
}

/** 章节排序：编号文件按数字排，其余（如「常用指南」）按中文序排在最后 */
function sortChapterFiles(names) {
  return [...names].sort((a, b) => {
    const na = Number.parseInt(a, 10)
    const nb = Number.parseInt(b, 10)
    if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb
    if (!Number.isNaN(na)) return -1
    if (!Number.isNaN(nb)) return 1
    return a.localeCompare(b, 'zh')
  })
}

/**
 * 收集一篇文章要合并的源文件（相对 SOURCE_ROOT 的路径）。
 *
 * 兼容三种目录形态：
 * 1. 标准形态：README + 编号章节 + 常用指南 → 章节在前、速查收尾，README 仅用于取摘要
 * 2. 单文件形态：目录里只有 README（axios / vite 就是这种）→ README 本身就是全部正文
 * 3. 显式列举：跨目录挑若干篇重新分组（如 git 主题）
 */
async function collectSources(spec) {
  const paths = []
  let readme = null

  if (spec.files?.length) {
    paths.push(...spec.files)
  } else if (spec.dir) {
    if (spec.dir.endsWith('.md')) {
      paths.push(spec.dir)
    } else {
      readme = await readFile(join(SOURCE_ROOT, spec.dir, 'README.md'), 'utf8').catch(() => null)

      const chapters = sortChapterFiles(
        (await readdir(join(SOURCE_ROOT, spec.dir))).filter(
          (f) => f.endsWith('.md') && f !== 'README.md',
        ),
      )

      if (chapters.length) {
        paths.push(...chapters.map((f) => join(spec.dir, f)))
      } else if (readme) {
        // 目录内只有 README：它本身就是正文，不能当导航文件排除掉
        paths.push(join(spec.dir, 'README.md'))
      }
    }
  }

  paths.push(...(spec.extra ?? []))

  return { paths, readme }
}

/** 读取并按统一规则合并成一篇正文 */
async function buildContent(paths) {
  const parts = []
  for (const relative of paths) {
    const raw = await readFile(join(SOURCE_ROOT, relative), 'utf8')
    parts.push(demoteHeadings(stripLocalLinks(raw)).trim())
  }
  return parts.join('\n\n---\n\n')
}

async function main() {
  const author = await prisma.user.findUnique({ where: { username: ADMIN_USERNAME } })
  if (!author) throw new Error(`找不到管理员账号：${ADMIN_USERNAME}`)

  const category = await prisma.category.upsert({
    where: { slug: CATEGORY_SLUG },
    update: { name: '工具与运维', desc: '全栈开发常用工具、工程化与运维实践' },
    create: {
      name: '工具与运维',
      slug: CATEGORY_SLUG,
      desc: '全栈开发常用工具、工程化与运维实践',
      sort: 4,
    },
  })

  const now = Date.now()
  let created = 0
  let updated = 0

  for (const [index, article] of ARTICLES.entries()) {
    const { paths, readme } = await collectSources(article)
    const content = await buildContent(paths)

    const summary = article.summary ?? buildSummaryFromReadme(readme)
    const publishedAt = new Date(now - index * 6 * 3_600_000)

    const existing = await prisma.post.findUnique({ where: { slug: article.slug } })

    const post = await prisma.post.upsert({
      where: { slug: article.slug },
      update: {
        title: article.title,
        summary,
        content,
        status: 'published',
        readingTime: calcReadingTime(content),
        categoryId: category.id,
        publishedAt,
      },
      create: {
        title: article.title,
        slug: article.slug,
        summary,
        content,
        status: 'published',
        featured: false,
        views: 0,
        readingTime: calcReadingTime(content),
        publishedAt,
        authorId: author.id,
        categoryId: category.id,
      },
    })

    await prisma.postTag.deleteMany({ where: { postId: post.id } })
    const tagIds = await resolveTagIds(article.tags ?? [])
    if (tagIds.length) {
      await prisma.postTag.createMany({
        data: tagIds.map((tagId) => ({ postId: post.id, tagId })),
      })
    }

    if (existing) updated += 1
    else created += 1

    console.log(
      `${existing ? '更新' : '新增'}  ${article.slug.padEnd(36)} ${String(Math.round(content.length / 1024)).padStart(4)} KB  ← ${article.dir}`,
    )
  }

  console.log(`\n完成：新增 ${created} 篇，更新 ${updated} 篇，共 ${ARTICLES.length} 篇`)
  console.log(`分类：${category.name}（/${CATEGORY_SLUG}）`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
