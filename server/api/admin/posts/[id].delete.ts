export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)

  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, statusMessage: '参数不合法' })
  }

  const existing = await prisma.post.findUnique({
    where: { id },
    select: { id: true, authorId: true },
  })
  if (!existing) throw createError({ statusCode: 404, statusMessage: '文章不存在' })

  assertPostOwnership(user, existing.authorId)

  await prisma.post.delete({ where: { id } })

  return { ok: true }
})
