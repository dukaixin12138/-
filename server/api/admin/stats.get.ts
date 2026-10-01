export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)
  const admin = isAdmin(user)

  // 非管理员只统计自己名下的数据
  const postScope = admin ? {} : { authorId: user.id }
  const commentWhere = admin ? {} : { post: { authorId: user.id } }

  const [total, published, draft, viewAgg, commentCount, recent] = await Promise.all([
    prisma.post.count({ where: postScope }),
    prisma.post.count({ where: { ...postScope, status: 'published' } }),
    prisma.post.count({ where: { ...postScope, status: 'draft' } }),
    prisma.post.aggregate({ _sum: { views: true }, where: postScope }),
    prisma.comment.count({ where: commentWhere }),
    prisma.post.findMany({
      where: postScope,
      orderBy: { updatedAt: 'desc' },
      take: 5,
      select: {
        id: true,
        title: true,
        slug: true,
        status: true,
        views: true,
        updatedAt: true,
      },
    }),
  ])

  return {
    total,
    published,
    draft,
    views: viewAgg._sum.views ?? 0,
    comments: commentCount,
    recent,
  }
})
