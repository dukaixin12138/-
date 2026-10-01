import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const total = await prisma.post.count()
const published = await prisma.post.count({ where: { status: 'published' } })
const featured = await prisma.post.count({ where: { featured: true } })

console.log(`文章总数: ${total}  已发布: ${published}  精选: ${featured}`)

const byCategory = await prisma.category.findMany({
  select: { name: true, _count: { select: { posts: true } } },
  orderBy: { sort: 'asc' },
})

console.log('')
console.log('分类分布:')
for (const c of byCategory) console.log(`  ${c.name}: ${c._count.posts} 篇`)

const withCover = await prisma.post.count({ where: { NOT: { cover: null } } })
console.log('')
console.log(`已有封面的文章: ${withCover}`)

await prisma.$disconnect()
