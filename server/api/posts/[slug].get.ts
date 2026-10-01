export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: '缺少文章标识' })
  }

  const post = await prisma.post.findFirst({
    where: { slug, ...publishedPostFilter() },
    include: {
      author: { select: { id: true, username: true, nickname: true, avatar: true } },
      category: { select: { id: true, name: true, slug: true } },
      tags: { select: { tag: { select: { id: true, name: true, slug: true } } } },
    },
  })

  if (!post) {
    throw createError({ statusCode: 404, statusMessage: '文章不存在' })
  }

  // 阅读量自增，失败不影响正文返回
  prisma.post
    .update({ where: { id: post.id }, data: { views: { increment: 1 } } })
    .catch(() => undefined)

  const anchor = post.publishedAt ?? post.createdAt

  const [rendered, prev, next] = await Promise.all([
    // 按 slug + 更新时间缓存：长文档的 Shiki 高亮开销大，内容不变就不必重算
    renderMarkdownCached(`${post.slug}:${post.updatedAt.getTime()}`, post.content),
    prisma.post.findFirst({
      where: { ...publishedPostFilter(), publishedAt: { lt: anchor } },
      orderBy: { publishedAt: 'desc' },
      select: { title: true, slug: true },
    }),
    prisma.post.findFirst({
      where: { ...publishedPostFilter(), publishedAt: { gt: anchor } },
      orderBy: { publishedAt: 'asc' },
      select: { title: true, slug: true },
    }),
  ])

  const { content: _content, tags, ...rest } = post

  return {
    ...rest,
    tags: tags.map((t) => t.tag),
    html: rendered.html,
    toc: rendered.toc,
    prev,
    next,
  }
})
