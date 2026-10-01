const ACTIONS = ['delete', 'approve', 'hide'] as const
type BulkAction = (typeof ACTIONS)[number]

export default defineEventHandler(async (event) => {
  await requireRole(event, ['admin'])

  const body = await readBody<{ action?: string; ids?: unknown }>(event)

  const action = String(body?.action ?? '') as BulkAction
  const ids = Array.isArray(body?.ids)
    ? body.ids
        .map((value) => Number(value))
        .filter((value) => Number.isInteger(value) && value > 0)
        .slice(0, 100)
    : []

  if (!ids.length) {
    throw createError({ statusCode: 400, statusMessage: '请先选择要操作的评论' })
  }
  if (!ACTIONS.includes(action)) {
    throw createError({ statusCode: 400, statusMessage: '不支持的操作类型' })
  }

  if (action === 'delete') {
    // 外键未配置级联，先删子回复再删自身
    await prisma.$transaction([
      prisma.comment.deleteMany({ where: { parentId: { in: ids } } }),
      prisma.comment.deleteMany({ where: { id: { in: ids } } }),
    ])
    return { ok: true, affected: ids.length }
  }

  const status = action === 'approve' ? 'approved' : 'hidden'
  const result = await prisma.comment.updateMany({ where: { id: { in: ids } }, data: { status } })

  return { ok: true, affected: result.count }
})
