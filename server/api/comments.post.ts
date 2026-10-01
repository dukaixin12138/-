interface CommentPayload {
  postSlug?: string
  author?: string
  email?: string
  content?: string
  parentId?: number | null
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default defineEventHandler(async (event) => {
  const body = await readBody<CommentPayload>(event)

  const postSlug = String(body?.postSlug ?? '').trim()
  const author = String(body?.author ?? '').trim()
  const email = String(body?.email ?? '').trim()
  const content = String(body?.content ?? '').trim()
  const rawParentId = Number(body?.parentId)
  const parentId = Number.isInteger(rawParentId) && rawParentId > 0 ? rawParentId : null

  if (!postSlug) {
    throw createError({ statusCode: 400, statusMessage: '缺少文章标识' })
  }
  if (!author) {
    throw createError({ statusCode: 400, statusMessage: '请填写昵称' })
  }
  if (author.length > 50) {
    throw createError({ statusCode: 400, statusMessage: '昵称不能超过 50 个字符' })
  }
  if (email && !EMAIL_PATTERN.test(email)) {
    throw createError({ statusCode: 400, statusMessage: '邮箱格式不正确' })
  }
  if (content.length < 2) {
    throw createError({ statusCode: 400, statusMessage: '评论内容至少 2 个字符' })
  }
  if (content.length > 1000) {
    throw createError({ statusCode: 400, statusMessage: '评论内容不能超过 1000 个字符' })
  }

  const ip = getClientIp(event)
  await assertCommentAllowed(ip)

  const post = await prisma.post.findFirst({
    where: { slug: postSlug, ...publishedPostFilter() },
    select: { id: true },
  })

  if (!post) {
    throw createError({ statusCode: 404, statusMessage: '文章不存在或未发布' })
  }

  if (parentId !== null) {
    const parent = await prisma.comment.findFirst({
      where: { id: parentId, postId: post.id },
      select: { id: true },
    })
    if (!parent) {
      throw createError({ statusCode: 400, statusMessage: '要回复的评论不存在' })
    }
  }

  // 邮箱命中站内账号时关联用户，用于在评论区标记「博主」
  let userId: number | null = null
  if (email) {
    const account = await prisma.user.findUnique({ where: { email }, select: { id: true } })
    userId = account?.id ?? null
  }

  const comment = await prisma.comment.create({
    data: {
      postId: post.id,
      author,
      email: email || null,
      content,
      parentId,
      userId,
      ip,
      status: 'approved',
    },
    select: { id: true },
  })

  return { ok: true, id: comment.id }
})
