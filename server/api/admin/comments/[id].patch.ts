const ALLOWED_STATUS = ['approved', 'pending', 'hidden']

export default defineEventHandler(async (event) => {
  await requireRole(event, ['admin'])

  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, statusMessage: '参数不合法' })
  }

  const body = await readBody<{ status?: string }>(event)
  const status = String(body?.status ?? '')

  if (!ALLOWED_STATUS.includes(status)) {
    throw createError({ statusCode: 400, statusMessage: '不支持的评论状态' })
  }

  const existing = await prisma.comment.findUnique({ where: { id }, select: { id: true } })
  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: '评论不存在' })
  }

  await prisma.comment.update({ where: { id }, data: { status } })

  return { ok: true }
})
