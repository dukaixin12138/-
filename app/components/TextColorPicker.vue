<script setup lang="ts">
import { PhArrowCounterClockwise, PhTextAa } from '@phosphor-icons/vue'

/**
 * placement 决定面板展开方向，与 BackgroundThemePicker 一致：
 * 桌面端 rail（'side'）向右展开，移动端顶栏（'bottom'）向下展开。
 */
withDefaults(
  defineProps<{
    placement?: 'bottom' | 'side'
  }>(),
  { placement: 'bottom' },
)

const {
  textColor,
  resolvedColor,
  isCustom,
  isAdjusted,
  setTextColor,
  resetTextColor,
  restoreTextColor,
} = useTextColor()

const { isDark } = useTheme()

const open = ref(false)
const customColor = ref('#60a5fa')
const root = ref<HTMLElement | null>(null)

/**
 * 色板显示的是「当前模式下实际会生效的颜色」，而不是原始色值。
 * 直接显示原色会误导：比如「纯白」在浅色模式下实际是深灰，
 * 用户点之前看到的和点之后得到的不一致。
 */
const presetSwatches = computed(() =>
  TEXT_COLOR_PRESETS.map((preset) => {
    const pair = buildTextColorPair(preset.value)
    const shown = isDark.value ? pair.dark : pair.light
    return { ...preset, shown, adjusted: shown !== pair.intent }
  }),
)

/** 打开时把当前色同步进取色器，避免显示与现状不符 */
watch(open, (value) => {
  if (value && isCustom.value) customColor.value = textColor.value
})

function select(color: string) {
  setTextColor(color)
}

function onCustomInput(event: Event) {
  const value = (event.target as HTMLInputElement).value
  customColor.value = value
  setTextColor(value)
}

function clear() {
  resetTextColor()
}

function handleDocumentClick(event: MouseEvent) {
  if (!open.value) return
  if (root.value && !root.value.contains(event.target as Node)) open.value = false
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') open.value = false
}

onMounted(() => {
  // 首屏脚本已把颜色写进 DOM，这里把状态同步回 Vue（否则按钮上的色点不会显示）
  restoreTextColor()
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
      class="relative inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg transition-colors duration-200"
      :class="
        isCustom
          ? 'text-slate-900 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-800'
          : 'border border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800'
      "
      :aria-expanded="open"
      title="调整字体颜色"
      aria-label="调整字体颜色"
      @click="open = !open"
    >
      <PhTextAa :size="19" />

      <!-- 已自定义时给个色点，显示的是「当前模式下真正生效」的颜色 -->
      <span
        v-if="isCustom"
        class="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-white dark:ring-slate-950"
        :style="{ background: resolvedColor }"
        aria-hidden="true"
      />
    </button>

    <Transition
      enter-active-class="transition duration-150 ease-out"
      :enter-from-class="`opacity-0 ${placement === 'side' ? '-translate-x-1' : '-translate-y-1'}`"
      leave-active-class="transition duration-100 ease-in"
      :leave-to-class="`opacity-0 ${placement === 'side' ? '-translate-x-1' : '-translate-y-1'}`"
    >
      <div
        v-if="open"
        class="absolute z-50 w-64 rounded-xl border border-slate-200 bg-white p-3 shadow-soft dark:border-slate-800 dark:bg-slate-900"
        :class="placement === 'side' ? 'bottom-0 left-full ml-3' : 'right-0 top-11'"
      >
        <div class="mb-2.5 flex items-center justify-between">
          <p class="text-xs font-medium uppercase tracking-wider text-slate-400">字体颜色</p>
          <button
            v-if="isCustom"
            type="button"
            title="恢复默认颜色"
            class="inline-flex cursor-pointer items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-slate-400 transition-colors duration-200 hover:text-slate-700 dark:hover:text-slate-200"
            @click="clear"
          >
            <PhArrowCounterClockwise :size="12" />
            恢复默认
          </button>
        </div>

        <div class="grid grid-cols-6 gap-1.5">
          <button
            v-for="preset in presetSwatches"
            :key="preset.value"
            type="button"
            :title="
              preset.adjusted
                ? `${preset.name}（当前模式下自动调整为 ${preset.shown}）`
                : preset.name
            "
            class="h-7 w-full cursor-pointer rounded-md ring-1 ring-black/10 transition-transform duration-150 hover:scale-110 dark:ring-white/15"
            :class="textColor === preset.value ? 'outline-2 outline-offset-1 outline-brand-500' : ''"
            :style="{ background: preset.shown }"
            @click="select(preset.value)"
          />
        </div>

        <div class="mt-3 border-t border-slate-200 pt-3 dark:border-slate-800">
          <label
            class="flex cursor-pointer items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-300"
          >
            <span>自定义颜色</span>
            <span class="flex items-center gap-2">
              <span class="font-mono text-[11px] text-slate-400">{{ customColor }}</span>
              <input
                type="color"
                :value="customColor"
                class="h-7 w-10 cursor-pointer rounded border border-slate-200 bg-transparent dark:border-slate-700"
                @input="onCustomInput"
              >
            </span>
          </label>
        </div>

        <p
          v-if="isAdjusted"
          class="mt-3 rounded-md bg-slate-100 px-2 py-1.5 text-[11px] leading-relaxed text-slate-500 dark:bg-slate-800 dark:text-slate-400"
        >
          当前为{{ isDark ? '深色' : '浅色' }}模式，已自动调整为
          <span class="font-mono" :style="{ color: resolvedColor }">{{ resolvedColor }}</span>
        </p>

        <p class="mt-2.5 text-[11px] leading-relaxed text-slate-400">
          仅调整文字，不影响背景与强调色。切换深浅色时会自动调亮或调暗，保证始终看得清。
        </p>
      </div>
    </Transition>
  </div>
</template>
