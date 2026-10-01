import type { Prisma } from '@prisma/client'

export default defineEventHandler(async (event) => {
  await requireRole(event, ['admin'])

  const query = getQuery(event)
  const page = Math.max(1, Number(query.page) || 1)
  const pageSize = Math.min(50, Math.max(1, Number(query.pageSize) || 20))
  const status = typeof query.status === 'string' && query.status ? query.status : undefined
  const keyword = typeof query.keyword === 'string' ? query.keyword.trim() : ''

  const where: Prisma.CommentWhereInput = {}
  if (status) where.status = status
  if (keyword) {
    where.OR = [{ author: { contains: keyword } }, { content: { contains: keyword } }]
  }

  const [total, rows] = await Promise.all([
    prisma.comment.count({ where }),
    prisma.comment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        author: true,
        email: true,
        content: true,
        status: true,
        parentId: true,
        ip: true,
        createdAt: true,
        post: { select: { id: true, title: true, slug: true } },
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
