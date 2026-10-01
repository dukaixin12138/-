<script setup lang="ts">
import { ArrowUp } from 'lucide-vue-next'

/*
 * 长文档（导入的工具集文章有几十屏高）滚到底部后没有回顶入口，体验很差。
 * 这里只在滚动超过一屏后出现，避免短页面上多一个无意义的悬浮元素。
 */
const visible = ref(false)
let ticking = false

function update() {
  ticking = false
  visible.value = window.scrollY > 800
}

function onScroll() {
  if (ticking) return
  ticking = true
  requestAnimationFrame(update)
}

function toTop() {
  // 显式指定 smooth：与路由切换的瞬时归零区分开，只有主动点击才平滑滚动
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

onMounted(() => {
  window.addEventListener('scroll', onScroll, { passive: true })
  update()
})

onUnmounted(() => window.removeEventListener('scroll', onScroll))
</script>

<template>
  <Transition
    enter-active-class="transition duration-200 ease-out"
    enter-from-class="opacity-0 translate-y-2"
    leave-active-class="transition duration-150 ease-in"
    leave-to-class="opacity-0 translate-y-2"
  >
    <button
      v-if="visible"
      type="button"
      title="回到顶部"
      aria-label="回到顶部"
      class="fixed right-5 bottom-20 z-30 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-slate-200 bg-white/90 text-slate-600 backdrop-blur-sm transition-colors duration-200 hover:bg-white hover:text-brand-600 lg:bottom-8 dark:border-slate-800 dark:bg-slate-900/90 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-brand-400"
      @click="toTop"
    >
      <ArrowUp class="h-4.5 w-4.5" />
    </button>
  </Transition>
</template>
