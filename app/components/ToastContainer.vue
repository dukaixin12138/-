<script setup lang="ts">
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-vue-next'
import type { ToastType } from '~/composables/useToast'

const { items, remove } = useToast()

const styles: Record<ToastType, { wrap: string; icon: typeof Info }> = {
  success: {
    wrap: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-900/25 dark:text-emerald-300',
    icon: CheckCircle2,
  },
  error: {
    wrap: 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-900/25 dark:text-red-300',
    icon: AlertCircle,
  },
  info: {
    wrap: 'border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200',
    icon: Info,
  },
}
</script>

<template>
  <Teleport to="body">
    <div class="pointer-events-none fixed right-4 top-4 z-70 flex w-[min(20rem,calc(100vw-2rem))] flex-col gap-2">
      <TransitionGroup
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0 -translate-y-2"
        leave-active-class="transition duration-150 ease-in absolute w-full"
        leave-to-class="opacity-0 translate-x-4"
        move-class="transition duration-200"
      >
        <div
          v-for="item in items"
          :key="item.id"
          class="pointer-events-auto flex items-start gap-2.5 rounded-xl border px-3.5 py-3 shadow-soft"
          :class="styles[item.type].wrap"
          role="status"
        >
          <component :is="styles[item.type].icon" class="mt-0.5 h-4 w-4 shrink-0" />
          <p class="flex-1 text-sm leading-relaxed">{{ item.message }}</p>
          <button
            type="button"
            class="shrink-0 cursor-pointer rounded p-0.5 opacity-60 transition-opacity duration-200 hover:opacity-100"
            aria-label="关闭提示"
            @click="remove(item.id)"
          >
            <X class="h-3.5 w-3.5" />
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>
