<script setup lang="ts">
import { PhMoon, PhSun } from '@phosphor-icons/vue'

const { isDark, toggleTheme } = useTheme()

const label = computed(() => (isDark.value ? '切换到浅色模式' : '切换到深色模式'))
</script>

<template>
  <button
    type="button"
    :title="label"
    :aria-label="label"
    class="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition-colors duration-200 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
    @click="toggleTheme"
  >
    <PhSun v-if="isDark" :size="19" />
    <PhMoon v-else :size="19" />
  </button>
</template>
