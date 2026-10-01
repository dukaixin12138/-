interface SearchRow {
  id: number
  title: string
  slug: string
  summary: string | null
  publishedAt: Date | null
  score: number
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const keyword = String(query.q ?? '').trim().slice(0, 60)
  const limit = Math.min(20, Math.max(1, Number(query.limit) || 10))

  if (!keyword) {
    return { keyword: '', total: 0, items: [] }
  }

  // 用 FULLTEXT + ngram 做检索；Prisma 不支持 MATCH AGAINST，需走原生查询
  let rows = await prisma.$queryRaw<SearchRow[]>`
    SELECT
      p.id           AS id,
      p.title        AS title,
      p.slug         AS slug,
      p.summary      AS summary,
      p.published_at AS publishedAt,
      MATCH(p.title, p.summary, p.content) AGAINST (${keyword}) AS score
    FROM posts p
    WHERE p.status = 'published'
      AND p.published_at IS NOT NULL
      AND p.published_at <= NOW(3)
      AND MATCH(p.title, p.summary, p.content) AGAINST (${keyword})
    ORDER BY score DESC, p.published_at DESC
    LIMIT ${limit}
  `

  if (!rows.length) {
    /*
     * 全文索引无命中时回退模糊匹配。典型触发场景：
     * - 关键词短于 ngram_token_size
     * - 英文词含 MySQL 默认停用词而被切碎，例如 git → gi + it，其中 it 是停用词，
     *   整个词因此搜不到（edit、unit 等同理）
     * 只走全文索引会让用户误以为站内没有相关内容。
     */
    const like = `%${keyword}%`
    rows = await prisma.$queryRaw<SearchRow[]>`
      SELECT
        p.id           AS id,
        p.title        AS title,
        p.slug         AS slug,
        p.summary      AS summary,
        p.published_at AS publishedAt,
        0              AS score
      FROM posts p
      WHERE p.status = 'published'
        AND p.published_at IS NOT NULL
        AND p.published_at <= NOW(3)
        AND (p.title LIKE ${like} OR p.summary LIKE ${like} OR p.content LIKE ${like})
      ORDER BY p.published_at DESC
      LIMIT ${limit}
    `
  }

  return {
    keyword,
    total: rows.length,
    items: rows.map((row) => ({
      id: row.id,
      title: row.title,
      slug: row.slug,
      summary: row.summary ?? '',
      publishedAt: (row.publishedAt ?? new Date()).toISOString(),
    })),
  }
})
