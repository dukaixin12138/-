export default defineEventHandler(async (event) => {
  const current = await requireRole(event, ['admin'])

  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, statusMessage: '参数不合法' })
  }

  if (id === current.id) {
    throw createError({ statusCode: 400, statusMessage: '不能删除当前登录的账号' })
  }

  const target = await prisma.user.findUnique({
    where: { id },
    select: { id: true, _count: { select: { posts: true } } },
  })

  if (!target) {
    throw createError({ statusCode: 404, statusMessage: '用户不存在' })
  }

  if (target._count.posts > 0) {
    throw createError({
      statusCode: 409,
      statusMessage: `该账号名下还有 ${target._count.posts} 篇文章，请先转移或删除后再操作`,
    })
  }

  await prisma.user.delete({ where: { id } })

  return { ok: true }
})
