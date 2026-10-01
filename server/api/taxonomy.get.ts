export default defineEventHandler(async () => {
  const [categories, tags, categoryCounts, tagCounts] = await Promise.all([
    prisma.category.findMany({
      orderBy: [{ sort: 'asc' }, { id: 'asc' }],
      select: { id: true, name: true, slug: true, desc: true },
    }),
    prisma.tag.findMany({
      orderBy: { id: 'asc' },
      select: { id: true, name: true, slug: true },
    }),
    prisma.post.groupBy({
      by: ['categoryId'],
      where: publishedPostFilter(),
      _count: { _all: true },
    }),
    prisma.postTag.groupBy({
      by: ['tagId'],
      where: { post: publishedPostFilter() },
      _count: { _all: true },
    }),
  ])

  const categoryCountMap = new Map<number, number>()
  for (const row of categoryCounts) {
    if (row.categoryId !== null) categoryCountMap.set(row.categoryId, row._count._all)
  }

  const tagCountMap = new Map<number, number>()
  for (const row of tagCounts) {
    tagCountMap.set(row.tagId, row._count._all)
  }

  return {
    categories: categories.map((item) => ({
      ...item,
      count: categoryCountMap.get(item.id) ?? 0,
    })),
    // 过滤掉没有任何已发布文章的标签，避免标签云里出现点进去空空如也的死标签
    tags: tags
      .map((item) => ({ ...item, count: tagCountMap.get(item.id) ?? 0 }))
      .filter((item) => item.count > 0),
  }
})
