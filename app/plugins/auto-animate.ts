export default defineNuxtPlugin(async (nuxtApp) => {
  // SSR 阶段不加载 auto-animate（其内部依赖 DOM），注册一个空指令占位，
  // 避免服务端渲染时出现 "Failed to resolve directive: auto-animate" 警告
  if (import.meta.server) {
    nuxtApp.vueApp.directive('auto-animate', {})
    return
  }

  // 客户端按需加载：基于 FLIP 自动补间元素增删与位移，无需编写关键帧
  const { autoAnimatePlugin } = await import('@formkit/auto-animate/vue')
  nuxtApp.vueApp.use(autoAnimatePlugin)
})
