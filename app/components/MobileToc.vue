<script setup lang="ts">
import { List, X } from 'lucide-vue-next'

interface TocEntry {
  id: string
  text: string
  level: number
}

const props = defineProps<{ items: TocEntry[] }>()

const open = ref(false)

/**
 * 先把抽屉关掉再滚动。
 * 抽屉是 fixed 全屏遮罩，若在关闭动画期间滚动，浏览器会把遮罩的高度算进可视区，
 * 定位会偏。
 */
function go(id: string) {
  open.value = false
  void nextTick(() => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') open.value = false
}

watch(open, (value) => {
  if (value) document.addEventListener('keydown', handleKeydown)
  else document.removeEventListener('keydown', handleKeydown)
})

onUnmounted(() => document.removeEventListener('keydown', handleKeydown))
</script>

<template>
  <!-- 桌面端已由右侧栏承担目录，这里只服务窄屏 -->
  <div v-if="items.length" class="lg:hidden">
    <button
      type="button"
      title="查看目录"
      aria-label="查看目录"
      class="fixed right-5 bottom-36 z-30 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-slate-200 bg-white/90 text-slate-600 backdrop-blur-sm transition-colors duration-200 hover:bg-white hover:text-brand-600 dark:border-slate-800 dark:bg-slate-900/90 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-brand-400"
      @click="open = true"
    >
      <List class="h-4.5 w-4.5" />
    </button>

    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0"
        leave-active-class="transition duration-150 ease-in"
        leave-to-class="opacity-0"
      >
        <div
          v-if="open"
          class="fixed inset-0 z-50 flex items-end bg-slate-900/40 backdrop-blur-sm"
          @click.self="open = false"
        >
          <Transition
            appear
            enter-active-class="transition duration-250 ease-out"
            enter-from-class="translate-y-full"
            leave-active-class="transition duration-200 ease-in"
            leave-to-class="translate-y-full"
          >
            <div
              v-if="open"
              class="max-h-[70vh] w-full overflow-hidden rounded-t-2xl border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom,0px)] dark:border-slate-800 dark:bg-slate-900"
            >
              <div class="flex items-center justify-between border-b border-slate-200 px-5 py-3.5 dark:border-slate-800">
                <p class="text-sm font-semibold text-slate-900 dark:text-slate-100">目录</p>
                <button
                  type="button"
                  title="关闭目录"
                  aria-label="关闭目录"
                  class="cursor-pointer rounded p-1 text-slate-400 transition-colors duration-200 hover:text-slate-600 dark:hover:text-slate-200"
                  @click="open = false"
                >
                  <X class="h-4.5 w-4.5" />
                </button>
              </div>

              <ul class="thin-scroll max-h-[calc(70vh-4rem)] overflow-y-auto overscroll-contain p-3">
                <li v-for="item in items" :key="item.id">
                  <button
                    type="button"
                    :title="item.text"
                    class="w-full cursor-pointer rounded-lg py-2.5 pr-3 text-left text-sm leading-snug text-slate-700 transition-colors duration-200 hover:bg-slate-100 hover:text-brand-600 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-brand-400"
                    :class="item.level === 3 ? 'pl-7' : 'pl-4'"
                    @click="go(item.id)"
                  >
                    {{ item.text }}
                  </button>
                </li>
              </ul>
            </div>
          </Transition>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
