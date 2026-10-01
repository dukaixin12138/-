export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)

  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, statusMessage: '参数不合法' })
  }

  const post = await prisma.post.findUnique({
    where: { id },
    include: {
      category: { select: { id: true, name: true } },
      tags: { select: { tag: { select: { id: true, name: true } } } },
    },
  })

  if (!post) throw createError({ statusCode: 404, statusMessage: '文章不存在' })

  assertPostOwnership(user, post.authorId)

  return {
    post: {
      ...post,
      tags: post.tags.map((t) => t.tag),
    },
  }
})
