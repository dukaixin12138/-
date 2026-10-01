import { describe, expect, it } from 'vitest'
import { calcReadingTime, renderMarkdown, slugifyTitle } from '../server/utils/markdown'

describe('calcReadingTime', () => {
  it('中文按 350 字/分钟估算', () => {
    expect(calcReadingTime('中'.repeat(700))).toBe(2)
  })

  it('至少返回 1 分钟', () => {
    expect(calcReadingTime('短')).toBe(1)
    expect(calcReadingTime('')).toBe(1)
  })
})

describe('slugifyTitle', () => {
  it('保留中文与数字，空格转连字符', () => {
    expect(slugifyTitle('Nuxt 4 入门')).toBe('nuxt-4-入门')
  })

  it('剔除特殊符号', () => {
    expect(slugifyTitle('Hello, World!')).toBe('hello-world')
  })
})

describe('renderMarkdown', () => {
  it('渲染标题并生成目录与锚点 id', async () => {
    const { html, toc } = await renderMarkdown('## 第一节\n\n正文内容')
    expect(html).toContain('id="第一节"')
    expect(toc).toEqual([{ id: '第一节', text: '第一节', level: 2 }])
  })

  it('重复标题的锚点自动去重', async () => {
    const { toc } = await renderMarkdown('## 标题\n\n## 标题')
    expect(toc.map((item) => item.id)).toEqual(['标题', '标题-1'])
  })

  it('不解析原始 HTML，规避 XSS', async () => {
    const { html } = await renderMarkdown('<script>alert(1)</script>')
    expect(html).not.toContain('<script>')
  })

  it('代码块交由 Shiki 高亮', async () => {
    const { html } = await renderMarkdown('```ts\nconst a = 1\n```')
    expect(html).toContain('shiki')
  })
})
