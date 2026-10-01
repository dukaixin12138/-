export default defineEventHandler(async (event) => {
  await requireRole(event, ['admin'])

  const users = await prisma.user.findMany({
    orderBy: { id: 'asc' },
    select: {
      id: true,
      username: true,
      nickname: true,
      email: true,
      role: true,
      bio: true,
      createdAt: true,
      _count: { select: { posts: true } },
    },
  })

  return {
    items: users.map(({ _count, ...rest }) => ({ ...rest, postCount: _count.posts })),
  }
})
