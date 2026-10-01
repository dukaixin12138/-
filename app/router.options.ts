import type { RouterConfig } from '@nuxt/schema'

/**
 * 路由滚动行为。
 *
 * 注意：这个函数**不能**写在 nuxt.config 的 `router.options` 里 ——
 * 那里只接受 Nuxt 自己的路由选项（linkActiveClass / scrollBehaviorType 等），
 * 传入 scrollBehavior 会被类型检查拒绝，运行时也会被静默忽略。
 * Nuxt 的约定是放在 app/router.options.ts。
 *
 * 三种场景分别处理：
 * - 浏览器前进/后退 → 恢复原位置
 * - 点击目录锚点 → 平滑滚动，并留出被固定元素遮挡的余量
 * - 普通路由切换 → 瞬时归零（长文页面上若用平滑滚动，要滚很久且位置不一定归位）
 */
export default <RouterConfig>{
  scrollBehavior(to, _from, savedPosition) {
    if (savedPosition) return savedPosition
    if (to.hash) return { el: to.hash, top: 96, behavior: 'smooth' }
    return { top: 0 }
  },
}
