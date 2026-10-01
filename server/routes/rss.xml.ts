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
  const siteName = String(config.public.siteName)
  const siteDescription = String(config.public.siteDescription)

  const posts = await prisma.post.findMany({
    where: publishedPostFilter(),
    orderBy: { publishedAt: 'desc' },
    take: 20,
    select: {
      title: true,
      slug: true,
      summary: true,
      content: true,
      publishedAt: true,
      createdAt: true,
      author: { select: { nickname: true, username: true } },
    },
  })

  const items = posts
    .map((post) => {
      const link = `${siteUrl}/posts/${post.slug}`
      const date = (post.publishedAt ?? post.createdAt).toUTCString()
      const description = post.summary || post.content.slice(0, 200)

      return [
        '    <item>',
        `      <title>${escapeXml(post.title)}</title>`,
        `      <link>${escapeXml(link)}</link>`,
        `      <guid isPermaLink="true">${escapeXml(link)}</guid>`,
        `      <pubDate>${date}</pubDate>`,
        `      <description>${escapeXml(description)}</description>`,
        `      <author>${escapeXml(post.author.nickname || post.author.username)}</author>`,
        '    </item>',
      ].join('\n')
    })
    .join('\n')

  setHeader(event, 'Content-Type', 'application/rss+xml; charset=utf-8')

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    '  <channel>',
    `    <title>${escapeXml(siteName)}</title>`,
    `    <link>${escapeXml(siteUrl)}</link>`,
    `    <description>${escapeXml(siteDescription)}</description>`,
    '    <language>zh-CN</language>',
    `    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>`,
    `    <atom:link href="${escapeXml(siteUrl)}/rss.xml" rel="self" type="application/rss+xml" />`,
    items,
    '  </channel>',
    '</rss>',
  ].join('\n')
})
