import { describe, expect, it } from 'vitest'
import { hashPasswordScrypt, verifyPasswordScrypt } from '../server/utils/auth'
import { slugifyTitle } from '../server/utils/markdown'

describe('密码哈希与校验', () => {
  it('相同密码两次哈希结果不同（盐随机）', () => {
    const first = hashPasswordScrypt('s3cret-password')
    const second = hashPasswordScrypt('s3cret-password')
    expect(first).not.toBe(second)
    expect(first).toContain(':')
  })

  it('能校验正确密码', () => {
    const stored = hashPasswordScrypt('s3cret-password')
    expect(verifyPasswordScrypt('s3cret-password', stored)).toBe(true)
  })

  it('拒绝错误密码', () => {
    const stored = hashPasswordScrypt('s3cret-password')
    expect(verifyPasswordScrypt('wrong-password', stored)).toBe(false)
  })

  it('对格式非法的哈希串返回 false 而不是抛错', () => {
    expect(verifyPasswordScrypt('anything', 'invalid')).toBe(false)
    expect(verifyPasswordScrypt('anything', '')).toBe(false)
  })
})

describe('slug 生成（供文章与标签共用）', () => {
  it('生成可读的 URL 片段', () => {
    expect(slugifyTitle('用 Nuxt 4 搭建博客系统')).toBe('用-nuxt-4-搭建博客系统')
  })
})
