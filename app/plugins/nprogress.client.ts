import NProgress from 'nprogress'
import 'nprogress/nprogress.css'

/**
 * 路由切换时的顶部进度条。
 * 只在客户端注册：SSR 不产生 DOM，避免 Teleport 类似的 hydration 不匹配问题。
 */
export default defineNuxtPlugin((nuxtApp) => {
  NProgress.configure({
    // 关闭右上角旋转图标，只保留顶部细条，视觉更克制
    showSpinner: false,
    // 自动递增的节奏（毫秒），数值越小推进越频繁
    trickleSpeed: 180,
    // 起始进度，避免 0% 时几乎看不到
    minimum: 0.12,
    speed: 400,
    easing: 'ease',
  })

  nuxtApp.hook('page:start', () => {
    NProgress.start()
  })

  nuxtApp.hook('page:finish', () => {
    NProgress.done()
  })

  // 页面组件报错时也要收起，否则进度条会一直卡住
  nuxtApp.hook('vue:error', () => {
    NProgress.done()
  })

  // 首屏为 SSR 渲染，不经过 page:start，挂载后确保进度条已结束
  nuxtApp.hook('app:mounted', () => {
    NProgress.done()
  })
})
