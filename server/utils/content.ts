/**
 * 公开可见文章的筛选条件。
 *
 * 除了 status = published，还必须已到达发布时间 —— 后台可以填未来的时间做定时发布，
 * 这类文章在到点前不应出现在列表、详情、归档、分类计数、sitemap 与 RSS 中。
 * 所有对外接口都必须使用本函数，避免遗漏。
 */
export function publishedPostFilter() {
  return {
    status: 'published' as const,
    publishedAt: { lte: new Date() },
  }
}

/** 保证文章 slug 唯一，冲突时追加序号 */
export async function ensureUniquePostSlug(base: string, excludeId?: number): Promise<string> {
  const root = base || `post-${Date.now()}`
  let slug = root
  let index = 1

  for (;;) {
    const found = await prisma.post.findUnique({ where: { slug }, select: { id: true } })
    if (!found || found.id === excludeId) return slug
    slug = `${root}-${index++}`
  }
}

/** 按标签名批量获取或创建标签，返回标签 id 列表 */
export async function resolveTagIds(names: unknown): Promise<number[]> {
  if (!Array.isArray(names)) return []

  const ids: number[] = []
  for (const raw of names) {
    const name = String(raw ?? '').trim()
    if (!name) continue
    if (name.length > 50) continue

    let tag = await prisma.tag.findUnique({ where: { name } })

    if (!tag) {
      const root = slugifyTitle(name)
      let slug = root
      let index = 1
      while (await prisma.tag.findUnique({ where: { slug }, select: { id: true } })) {
        slug = `${root}-${index++}`
      }
      tag = await prisma.tag.create({ data: { name, slug } })
    }

    if (!ids.includes(tag.id)) ids.push(tag.id)
  }

  return ids
}

/** 解析分类：优先使用 categoryId，其次按名称创建 */
export async function resolveCategoryId(input: {
  categoryId?: unknown
  categoryName?: unknown
}): Promise<number | null> {
  const id = Number(input.categoryId)
  if (Number.isInteger(id) && id > 0) return id

  const name = String(input.categoryName ?? '').trim()
  if (!name || name.length > 50) return null

  const existing = await prisma.category.findUnique({ where: { name } })
  if (existing) return existing.id

  const root = slugifyTitle(name)
  let slug = root
  let index = 1
  while (await prisma.category.findUnique({ where: { slug }, select: { id: true } })) {
    slug = `${root}-${index++}`
  }

  const created = await prisma.category.create({ data: { name, slug } })
  return created.id
}
