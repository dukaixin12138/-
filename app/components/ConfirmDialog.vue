<script setup lang="ts">
import { AlertTriangle } from 'lucide-vue-next'

const { visible, title, message, answer } = useConfirm()

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && visible.value) answer(false)
}

onMounted(() => document.addEventListener('keydown', handleKeydown))
onUnmounted(() => document.removeEventListener('keydown', handleKeydown))
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      leave-active-class="transition duration-150 ease-in"
      leave-to-class="opacity-0"
    >
      <div
        v-if="visible"
        class="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/45 px-4 backdrop-blur-sm"
        @click.self="answer(false)"
      >
        <div
          class="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900"
          role="alertdialog"
          aria-modal="true"
        >
          <div class="flex items-start gap-3">
            <span
              class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-600 dark:bg-amber-900/25 dark:text-amber-400"
            >
              <AlertTriangle class="h-4.5 w-4.5" />
            </span>
            <div class="min-w-0">
              <p class="text-sm font-semibold text-slate-900 dark:text-slate-100">{{ title }}</p>
              <p class="mt-1.5 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                {{ message }}
              </p>
            </div>
          </div>

          <div class="mt-6 flex justify-end gap-2">
            <button type="button" class="btn btn-ghost" @click="answer(false)">取消</button>
            <button
              type="button"
              class="btn bg-red-600 text-white hover:bg-red-700"
              @click="answer(true)"
            >
              确定
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
