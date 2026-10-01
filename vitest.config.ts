import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // 首次运行需要初始化 Shiki，给足超时时间
    testTimeout: 20_000,
  },
})
