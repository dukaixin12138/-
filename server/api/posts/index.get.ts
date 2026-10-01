import type { Prisma } from '@prisma/client'

/**
 * 走全文索引检索文章 id。
 *
 * posts 表上有 `posts_fulltext_idx (title, summary, content) WITH PARSER ngram`，
 * 用 MATCH ... AGAINST 才能命中它；此前的 `contains` 会编译成 `LIKE %..%`，
 * 无法使用索引，文章一多就退化成全表扫描。
 *
 * 关键词长度小于 ngram_token_size（默认 2）时全文索引无法匹配，返回 null 交给调用方兜底。
 */
const NGRAM_MIN_LENGTH = 2

/** 上限保护：避免把过长的 id 列表塞进 SQL IN 子句 */
const FULLTEXT_MATCH_LIMIT = 1000

async function searchIdsByFulltext(keyword: string): Promise<number[] | null> {
  if ([...keyword].length < NGRAM_MIN_LENGTH) return null

  try {
    const rows = await prisma.$queryRaw<Array<{ id: number }>>`
      SELECT id
      FROM posts
      WHERE status = 'published'
        AND published_at <= NOW()
        AND MATCH (title, summary, content) AGAINST (${keyword} IN NATURAL LANGUAGE MODE)
      ORDER BY MATCH (title, summary, content) AGAINST (${keyword} IN NATURAL LANGUAGE MODE) DESC
      LIMIT ${FULLTEXT_MATCH_LIMIT}
    `
    return rows.map((row) => row.id)
  } catch {
    // 索引缺失或语法不被支持时静默回退到 LIKE，不能让搜索整体失败
    return null
  }
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)

  const page = Math.max(1, Number(query.page) || 1)
  const pageSize = Math.min(50, Math.max(1, Number(query.pageSize) || 10))
  const category = typeof query.category === 'string' && query.category ? query.category : undefined
  const tag = typeof query.tag === 'string' && query.tag ? query.tag : undefined
  const keyword = typeof query.keyword === 'string' ? query.keyword.trim() : ''

  const where: Prisma.PostWhereInput = { ...publishedPostFilter() }

  if (category) where.category = { slug: category }
  if (tag) where.tags = { some: { tag: { slug: tag } } }

  if (keyword) {
    const matchedIds = await searchIdsByFulltext(keyword)

    if (matchedIds?.length) {
      where.id = { in: matchedIds }
    } else {
      /*
       * 全文索引无命中时回退模糊匹配。触发场景有三类：
       * 1. 关键词短于 ngram_token_size
       * 2. 英文词含 MySQL 默认停用词而被切碎 —— 例如 git 会被切成 gi + it，其中 it 是停用词，
       *    导致整个词无法匹配（edit、unit 等同理）
       * 3. 全文索引不可用
       * 直接返回空结果会让用户误以为站内没有相关内容。
       */
      where.OR = [
        { title: { contains: keyword } },
        { summary: { contains: keyword } },
        { content: { contains: keyword } },
      ]
    }
  }

  const [total, rows] = await Promise.all([
    prisma.post.count({ where }),
    prisma.post.findMany({
      where,
      /*
       * 搜索时不参与「置顶优先」：否则被标记 featured 的文章会永远压在第一位，
       * 哪怕它只是顺带提到了关键词。普通列表仍保留置顶。
       */
      orderBy: keyword
        ? [{ publishedAt: 'desc' }, { id: 'desc' }]
        : [{ featured: 'desc' }, { publishedAt: 'desc' }, { id: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        title: true,
        slug: true,
        summary: true,
        cover: true,
        views: true,
        featured: true,
        readingTime: true,
        publishedAt: true,
        createdAt: true,
        category: { select: { id: true, name: true, slug: true } },
        tags: { select: { tag: { select: { id: true, name: true, slug: true } } } },
      },
    }),
  ])

  return {
    items: rows.map((row) => ({ ...row, tags: row.tags.map((t) => t.tag) })),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  }
})
