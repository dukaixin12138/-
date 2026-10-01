interface PostPayload {
  title?: string
  slug?: string
  summary?: string
  content?: string
  cover?: string
  status?: string
  featured?: boolean
  categoryId?: number | null
  categoryName?: string
  tags?: string[]
  publishedAt?: string | null
}

export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)
  const body = await readBody<PostPayload>(event)

  const title = String(body?.title ?? '').trim()
  const content = String(body?.content ?? '')

  if (!title) throw createError({ statusCode: 400, statusMessage: '标题不能为空' })
  if (!content.trim()) throw createError({ statusCode: 400, statusMessage: '正文不能为空' })

  const status = body.status === 'published' ? 'published' : 'draft'
  const slug = await ensureUniquePostSlug(
    String(body.slug ?? '').trim() || slugifyTitle(title),
  )
  const [tagIds, categoryId] = await Promise.all([
    resolveTagIds(body.tags),
    resolveCategoryId({ categoryId: body.categoryId, categoryName: body.categoryName }),
  ])

  const post = await prisma.post.create({
    data: {
      title,
      slug,
      summary: String(body.summary ?? '').trim().slice(0, 500) || null,
      content,
      cover: String(body.cover ?? '').trim() || null,
      status,
      featured: Boolean(body.featured),
      readingTime: calcReadingTime(content),
      publishedAt:
        status === 'published' ? (body.publishedAt ? new Date(body.publishedAt) : new Date()) : null,
      authorId: user.id,
      categoryId,
      tags: { create: tagIds.map((tagId) => ({ tagId })) },
    },
    select: { id: true, slug: true, status: true },
  })

  return { post }
})
