export default defineEventHandler(async () => {
  const posts = await prisma.post.findMany({
    where: publishedPostFilter(),
    orderBy: { publishedAt: 'desc' },
    select: { id: true, title: true, slug: true, publishedAt: true, createdAt: true },
  })

  const grouped = new Map<string, { year: string; posts: Array<{ id: number; title: string; slug: string; date: string }> }>()

  for (const post of posts) {
    const date = post.publishedAt ?? post.createdAt
    const year = String(date.getFullYear())
    if (!grouped.has(year)) {
      grouped.set(year, { year, posts: [] })
    }
    grouped.get(year)!.posts.push({
      id: post.id,
      title: post.title,
      slug: post.slug,
      date: date.toISOString(),
    })
  }

  return {
    total: posts.length,
    years: Array.from(grouped.values()),
  }
})
