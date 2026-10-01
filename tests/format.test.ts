import { describe, expect, it } from 'vitest'
import { formatDate, formatMonthDay, formatRelativeDate, truncate } from '../app/utils/format'

describe('formatDate', () => {
  it('按站点固定时区（Asia/Shanghai）格式化', () => {
    // UTC 2026-01-01 00:00 → 北京时间 08:00
    expect(formatDate('2026-01-01T00:00:00.000Z')).toBe('2026-01-01')
    expect(formatDate('2026-01-01T00:00:00.000Z', true)).toBe('2026-01-01 08:00')
  })

  it('跨 UTC 日期边界时不会错位', () => {
    // UTC 2025-12-31 20:00 → 北京时间 2026-01-01 04:00
    expect(formatDate('2025-12-31T20:00:00.000Z')).toBe('2026-01-01')
    expect(formatDate('2025-12-31T20:00:00.000Z', true)).toBe('2026-01-01 04:00')
  })

  it('对空值与非法输入返回空字符串', () => {
    expect(formatDate(null)).toBe('')
    expect(formatDate(undefined)).toBe('')
    expect(formatDate('not-a-date')).toBe('')
  })
})

describe('formatMonthDay', () => {
  it('只输出月日', () => {
    expect(formatMonthDay('2026-03-05T02:00:00.000Z')).toBe('03-05')
  })
})

describe('formatRelativeDate', () => {
  it('根据传入的基准时间计算相对时间', () => {
    const base = Date.parse('2026-06-01T12:00:00.000Z')
    expect(formatRelativeDate('2026-06-01T11:59:30.000Z', base)).toBe('刚刚')
    expect(formatRelativeDate('2026-06-01T11:30:00.000Z', base)).toBe('30 分钟前')
    expect(formatRelativeDate('2026-06-01T08:00:00.000Z', base)).toBe('4 小时前')
    expect(formatRelativeDate('2026-05-30T12:00:00.000Z', base)).toBe('2 天前')
  })
})

describe('truncate', () => {
  it('超出长度时截断并追加省略号', () => {
    expect(truncate('a'.repeat(20), 10)).toBe(`${'a'.repeat(10)}…`)
  })

  it('未超出长度时原样返回', () => {
    expect(truncate('hello', 10)).toBe('hello')
  })
})
