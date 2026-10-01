import type { Prisma } from '@prisma/client'

export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)

  const query = getQuery(event)
  const page = Math.max(1, Number(query.page) || 1)
  const pageSize = Math.min(50, Math.max(1, Number(query.pageSize) || 10))
  const status = typeof query.status === 'string' && query.status ? query.status : undefined
  const keyword = typeof query.keyword === 'string' ? query.keyword.trim() : ''

  const where: Prisma.PostWhereInput = {}

  // 非管理员只能看到自己创建的文章
  if (!isAdmin(user)) where.authorId = user.id

  if (status) where.status = status
  if (keyword) {
    where.OR = [{ title: { contains: keyword } }, { slug: { contains: keyword } }]
  }

  const [total, rows] = await Promise.all([
    prisma.post.count({ where }),
    prisma.post.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        title: true,
        slug: true,
        status: true,
        views: true,
        featured: true,
        publishedAt: true,
        createdAt: true,
        updatedAt: true,
        category: { select: { id: true, name: true } },
      },
    }),
  ])

  return {
    items: rows,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  }
})
