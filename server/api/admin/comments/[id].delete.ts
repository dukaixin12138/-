export default defineEventHandler(async (event) => {
  await requireRole(event, ['admin'])

  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, statusMessage: '参数不合法' })
  }

  const existing = await prisma.comment.findUnique({ where: { id }, select: { id: true } })
  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: '评论不存在' })
  }

  // 外键未配置级联，先清理其下回复再删除自身
  await prisma.$transaction([
    prisma.comment.deleteMany({ where: { parentId: id } }),
    prisma.comment.delete({ where: { id } }),
  ])

  return { ok: true }
})
