function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const siteUrl = String(config.public.siteUrl).replace(/\/$/, '')

  const [posts, categories, tags] = await Promise.all([
    prisma.post.findMany({
      where: publishedPostFilter(),
      select: { slug: true, updatedAt: true },
      orderBy: { publishedAt: 'desc' },
    }),
    prisma.category.findMany({ select: { slug: true } }),
    prisma.tag.findMany({ select: { slug: true } }),
  ])

  const entries: string[] = []

  const push = (loc: string, changefreq: string, priority: string, lastmod?: string) => {
    entries.push(
      [
        '  <url>',
        `    <loc>${escapeXml(loc)}</loc>`,
        lastmod ? `    <lastmod>${lastmod}</lastmod>` : '',
        `    <changefreq>${changefreq}</changefreq>`,
        `    <priority>${priority}</priority>`,
        '  </url>',
      ]
        .filter(Boolean)
        .join('\n'),
    )
  }

  push(`${siteUrl}/`, 'daily', '1.0')
  push(`${siteUrl}/posts`, 'daily', '0.9')
  push(`${siteUrl}/archive`, 'weekly', '0.7')
  push(`${siteUrl}/categories`, 'weekly', '0.6')

  for (const post of posts) {
    push(`${siteUrl}/posts/${post.slug}`, 'weekly', '0.8', post.updatedAt.toISOString())
  }
  for (const category of categories) {
    push(`${siteUrl}/categories/${category.slug}`, 'weekly', '0.6')
  }
  for (const tag of tags) {
    push(`${siteUrl}/tags/${tag.slug}`, 'weekly', '0.5')
  }

  setHeader(event, 'Content-Type', 'application/xml; charset=utf-8')

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    entries.join('\n'),
    '</urlset>',
  ].join('\n')
})
