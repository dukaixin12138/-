<script setup lang="ts">
import { PhCheck, PhPalette } from '@phosphor-icons/vue'

/**
 * placement 决定面板的展开方向。该组件被用在两个位置：
 * - 桌面端左侧 rail（'side'）：按钮贴着屏幕左缘、且位于 rail 底部，
 *   面板必须向右展开并向底部对齐，否则会溢出视口左上角
 * - 移动端顶栏（'bottom'）：常规的右对齐、向下展开
 * 写死单一方向会导致换到 rail 后完全看不见面板。
 */
withDefaults(
  defineProps<{
    placement?: 'bottom' | 'side'
  }>(),
  { placement: 'bottom' },
)

const { themeId, themes, setBackgroundTheme } = useBackgroundTheme()

const open = ref(false)
const root = ref<HTMLElement | null>(null)

function select(id: string) {
  setBackgroundTheme(id)
  open.value = false
}

function handleDocumentClick(event: MouseEvent) {
  if (!open.value) return
  if (root.value && !root.value.contains(event.target as Node)) {
    open.value = false
  }
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') open.value = false
}

onMounted(() => {
  document.addEventListener('click', handleDocumentClick)
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('click', handleDocumentClick)
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <div ref="root" class="relative">
    <button
      type="button"
      class="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition-colors duration-200 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
      :aria-expanded="open"
      title="切换动态背景主题"
      aria-label="切换动态背景主题"
      @click="open = !open"
    >
      <PhPalette :size="19" />
    </button>

    <Transition
      enter-active-class="transition duration-150 ease-out"
      :enter-from-class="`opacity-0 ${placement === 'side' ? '-translate-x-1' : '-translate-y-1'}`"
      leave-active-class="transition duration-100 ease-in"
      :leave-to-class="`opacity-0 ${placement === 'side' ? '-translate-x-1' : '-translate-y-1'}`"
    >
      <div
        v-if="open"
        class="absolute z-50 w-64 rounded-xl border border-slate-200 bg-white p-2 shadow-soft dark:border-slate-800 dark:bg-slate-900"
        :class="placement === 'side' ? 'bottom-0 left-full ml-3' : 'right-0 top-11'"
      >
        <p class="px-2 pb-1.5 pt-1 text-xs font-medium uppercase tracking-wider text-slate-400">
          动态背景
        </p>

        <button
          v-for="theme in themes"
          :key="theme.id"
          type="button"
          :title="theme.name"
          class="flex w-full cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors duration-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          @click="select(theme.id)"
        >
          <span class="h-7 w-7 shrink-0 rounded-md ring-1 ring-black/5" :style="{ background: theme.swatch }" />

          <span class="min-w-0 flex-1">
            <span class="block text-sm text-slate-800 dark:text-slate-200">{{ theme.name }}</span>
            <span class="block truncate text-xs text-slate-400">{{ theme.description }}</span>
          </span>

          <PhCheck
            v-if="themeId === theme.id"
            :size="16"
            weight="bold"
            class="shrink-0 text-brand-600 dark:text-brand-400"
          />
        </button>
      </div>
    </Transition>
  </div>
</template>
