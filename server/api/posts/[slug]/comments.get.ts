interface CommentRow {
  id: number
  author: string
  content: string
  createdAt: Date
  parentId: number | null
  userId: number | null
}

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: '缺少文章标识' })
  }

  const post = await prisma.post.findFirst({
    where: { slug, ...publishedPostFilter() },
    select: { id: true, authorId: true },
  })

  if (!post) {
    throw createError({ statusCode: 404, statusMessage: '文章不存在' })
  }

  const rows = await prisma.comment.findMany({
    where: { postId: post.id, status: 'approved' },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      author: true,
      content: true,
      createdAt: true,
      parentId: true,
      userId: true,
    },
  })

  const toItem = (row: CommentRow) => ({
    id: row.id,
    author: row.author,
    content: row.content,
    createdAt: row.createdAt.toISOString(),
    isAuthor: row.userId !== null && row.userId === post.authorId,
  })

  const roots = rows.filter((row) => row.parentId === null)
  const repliesByParent = new Map<number, CommentRow[]>()

  for (const row of rows) {
    if (row.parentId === null) continue
    const list = repliesByParent.get(row.parentId) ?? []
    list.push(row)
    repliesByParent.set(row.parentId, list)
  }

  return {
    total: rows.length,
    items: roots.map((root) => ({
      ...toItem(root),
      replies: (repliesByParent.get(root.id) ?? []).map(toItem),
    })),
  }
})
