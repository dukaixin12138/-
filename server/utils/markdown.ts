import MarkdownIt from 'markdown-it'
import { createHighlighter, type Highlighter } from 'shiki'

/**
 * 预加载的常用语言。
 * 这只是「常用集合」，不是白名单 —— 正文里出现的其它语言（如 prisma）
 * 会在渲染前被自动加载，见 renderMarkdown 里的扫描逻辑。
 */
const PRELOAD_LANGS = [
  'javascript',
  'typescript',
  'jsx',
  'tsx',
  'vue',
  'html',
  'css',
  'scss',
  'json',
  'yaml',
  'markdown',
  'bash',
  'python',
  'java',
  'go',
  'rust',
  'sql',
  'c',
  'cpp',
  'csharp',
  'php',
  'ruby',
  'kotlin',
  'swift',
  'xml',
  'diff',
  'dockerfile',
  'ini',
  'toml',
]

/** 语言别名，统一到 shiki 使用的 id */
const LANG_ALIASES: Record<string, string> = {
  js: 'javascript',
  ts: 'typescript',
  sh: 'bash',
  shell: 'bash',
  zsh: 'bash',
  yml: 'yaml',
  py: 'python',
  rb: 'ruby',
  rs: 'rust',
  md: 'markdown',
  docker: 'dockerfile',
  'c++': 'cpp',
  'c#': 'csharp',
}

function normalizeLang(input: string): string {
  const raw = input.trim().toLowerCase()
  return LANG_ALIASES[raw] ?? raw
}

/** 扫描正文里所有围栏代码块（``` 或 ~~~）用到的语言标识 */
function collectFenceLangs(source: string): Set<string> {
  const langs = new Set<string>()
  for (const line of source.split('\n')) {
    const match = /^\s{0,3}(?:`{3,}|~{3,})\s*([^\s`~]*)/.exec(line)
    if (match?.[1]) langs.add(match[1])
  }
  return langs
}

/**
 * 高亮失败时的降级输出。
 *
 * 必须带上与 shiki 一致的 CSS 变量：暗色模式依赖
 * `.dark .shiki { background-color: var(--shiki-dark-bg) }` 切换配色，
 * 缺少这些变量时该声明会解析失败，代码块在暗色下就没有深色背景。
 */
function fallbackCodeBlock(escapedCode: string): string {
  return (
    '<pre class="shiki" style="background-color:#fff;--shiki-dark-bg:#24292e;' +
    `color:#24292e;--shiki-dark:#e1e4e8"><code>${escapedCode}</code></pre>`
  )
}

export interface TocItem {
  id: string
  text: string
  level: number
}

export interface RenderedContent {
  html: string
  toc: TocItem[]
}

let highlighterPromise: Promise<Highlighter> | null = null

function getHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: ['github-light', 'github-dark'],
      langs: PRELOAD_LANGS,
    })
  }
  return highlighterPromise
}

/** 生成 URL 友好的锚点，保留中英文与数字 */
function slugifyHeading(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[`*_[\]()#!]/g, '')
    .replace(/[^\w\u4e00-\u9fa5\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)
}

/**
 * 将 Markdown 原文渲染为 HTML，并抽取文章目录。
 * 关闭原始 HTML 解析，配合 markdown-it 内建的链接协议校验，规避 XSS。
 */
export async function renderMarkdown(source: string): Promise<RenderedContent> {
  const highlighter = await getHighlighter()
  const toc: TocItem[] = []
  const idCounter = new Map<string, number>()

  // markdown-it 的渲染是同步的，无法在 fence 规则内部 await，
  // 所以先扫描全文用到的语言并在此处加载完，否则未预置的语言会掉进降级分支
  // （降级后没有语法高亮，暗色下的观感也会打折）
  const loaded = new Set(highlighter.getLoadedLanguages())
  const pending = [...collectFenceLangs(source)]
    .map(normalizeLang)
    .filter((lang) => lang && !loaded.has(lang))

  await Promise.all(
    pending.map(async (lang) => {
      try {
        await highlighter.loadLanguage(lang as never)
      } catch {
        // 未知或不支持的语言：留给 fence 规则走降级分支
      }
    }),
  )

  const md = new MarkdownIt({
    html: false,
    xhtmlOut: false,
    breaks: false,
    linkify: true,
    typographer: true,
  })

  md.renderer.rules.fence = (tokens, idx) => {
    const token = tokens[idx]!
    const lang = normalizeLang((token.info || '').trim().split(/\s+/)[0] || 'text')
    const code = token.content

    try {
      return highlighter.codeToHtml(code, {
        lang: lang as never,
        themes: { light: 'github-light', dark: 'github-dark' },
      })
    } catch {
      return fallbackCodeBlock(md.utils.escapeHtml(code))
    }
  }

  // 宽表格需要一层可横向滚动的容器：列数多的表格直接渲染会撑破正文宽度，
  // 把整个页面顶出横向滚动条（长文档里这类表格很常见）
  const defaultTableOpen =
    md.renderer.rules.table_open ??
    ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options))
  const defaultTableClose =
    md.renderer.rules.table_close ??
    ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options))

  md.renderer.rules.table_open = (tokens, idx, options, env, self) =>
    `<div class="table-scroll">${defaultTableOpen(tokens, idx, options, env, self)}`

  md.renderer.rules.table_close = (tokens, idx, options, env, self) =>
    `${defaultTableClose(tokens, idx, options, env, self)}</div>`

  // 正文图片：懒加载 + 异步解码，降低首屏开销与主线程阻塞
  const defaultImageRule =
    md.renderer.rules.image ??
    ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options))

  md.renderer.rules.image = (tokens, idx, options, env, self) => {
    const token = tokens[idx]!
    token.attrSet('loading', 'lazy')
    token.attrSet('decoding', 'async')
    return defaultImageRule(tokens, idx, options, env, self)
  }

  const defaultHeadingOpen =
    md.renderer.rules.heading_open ??
    ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options))

  md.renderer.rules.heading_open = (tokens, idx, options, env, self) => {
    const token = tokens[idx]!
    const inlineToken = tokens[idx + 1]
    const rawText = inlineToken && inlineToken.type === 'inline' ? inlineToken.content : ''

    let id = slugifyHeading(rawText) || `section-${idx}`
    const seen = idCounter.get(id) ?? 0
    idCounter.set(id, seen + 1)
    if (seen > 0) id = `${id}-${seen}`

    const level = Number(token.tag.slice(1))
    // 只收 h2~h3：长文档里 h4 会把目录撑到上百项，反而失去导航价值
    if (level >= 2 && level <= 3) {
      toc.push({ id, text: rawText.replace(/[`*_]/g, ''), level })
    }

    token.attrSet('id', id)
    return defaultHeadingOpen(tokens, idx, options, env, self)
  }

  return { html: md.render(source), toc }
}

/**
 * 渲染结果缓存。
 *
 * 长文档的成本不可忽略：导入的工具集文章单篇有 30KB 正文、70+ 个代码块，
 * Shiki 双主题高亮要遍历每个 token，重复渲染纯属浪费。文章发布后内容基本不变，
 * 因此按「slug + 更新时间」做键 —— 内容一改键就变，自动失效，无需手动清理。
 */
const renderCache = new Map<string, RenderedContent>()

/** 上限防止内存无限增长；超出后丢弃最早插入的一条（近似 FIFO，对本场景足够） */
const RENDER_CACHE_LIMIT = 200

export async function renderMarkdownCached(
  cacheKey: string,
  source: string,
): Promise<RenderedContent> {
  const cached = renderCache.get(cacheKey)
  if (cached) return cached

  const result = await renderMarkdown(source)

  if (renderCache.size >= RENDER_CACHE_LIMIT) {
    const oldest = renderCache.keys().next().value
    if (oldest !== undefined) renderCache.delete(oldest)
  }
  renderCache.set(cacheKey, result)

  return result
}

/** 中文按 350 字/分钟、英文按 200 词/分钟估算阅读时长 */
export function calcReadingTime(source: string): number {
  const cnCount = (source.match(/[\u4e00-\u9fa5]/g) || []).length
  const enCount = (source.match(/[a-zA-Z0-9]+/g) || []).length
  return Math.max(1, Math.round(cnCount / 350 + enCount / 200))
}

/** 由标题生成唯一 slug，保留中文；标题不含可用字符时追加时间戳兜底 */
export function slugifyTitle(title: string): string {
  const base = slugifyHeading(title)
  return base || `post-${Date.now()}`
}
