const ACTIONS = ['delete', 'publish', 'draft', 'feature', 'unfeature'] as const
type BulkAction = (typeof ACTIONS)[number]

export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)
  const body = await readBody<{ action?: string; ids?: unknown }>(event)

  const action = String(body?.action ?? '') as BulkAction
  const ids = Array.isArray(body?.ids)
    ? body.ids
        .map((value) => Number(value))
        .filter((value) => Number.isInteger(value) && value > 0)
        .slice(0, 100)
    : []

  if (!ids.length) {
    throw createError({ statusCode: 400, statusMessage: '请先选择要操作的文章' })
  }
  if (!ACTIONS.includes(action)) {
    throw createError({ statusCode: 400, statusMessage: '不支持的操作类型' })
  }

  // 非管理员只能操作自己的文章（deleteMany/updateMany 不支持关系过滤，这里用 authorId 约束）
  const where = isAdmin(user) ? { id: { in: ids } } : { id: { in: ids }, authorId: user.id }

  if (action === 'delete') {
    const result = await prisma.post.deleteMany({ where })
    return { ok: true, affected: result.count }
  }

  const data =
    action === 'publish'
      ? { status: 'published', publishedAt: new Date() }
      : action === 'draft'
        ? { status: 'draft', publishedAt: null }
        : { featured: action === 'feature' }

  const result = await prisma.post.updateMany({ where, data })

  return { ok: true, affected: result.count }
})
