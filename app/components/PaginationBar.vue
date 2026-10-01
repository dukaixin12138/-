<script setup lang="ts">
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'

const props = defineProps<{
  page: number
  totalPages: number
}>()

const route = useRoute()

const pages = computed(() => {
  const total = props.totalPages
  const current = props.page
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1)

  const start = Math.max(1, Math.min(current - 2, total - 4))
  return Array.from({ length: 5 }, (_, i) => start + i)
})

function target(page: number) {
  const query = { ...route.query }
  if (page <= 1) {
    delete query.page
  } else {
    query.page = String(page)
  }
  return { path: route.path, query }
}
</script>

<template>
  <nav v-if="totalPages > 1" class="flex items-center justify-center gap-1.5 pt-2" aria-label="分页导航">
    <NuxtLink
      v-if="page > 1"
      :to="target(page - 1)"
      :title="`前往第 ${page - 1} 页`"
      class="inline-flex h-9 cursor-pointer items-center gap-1 rounded-lg border border-slate-200 px-3 text-sm text-slate-600 transition-colors duration-200 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
    >
      <ChevronLeft class="h-4 w-4" />
      上一页
    </NuxtLink>

    <NuxtLink
      v-for="item in pages"
      :key="item"
      :to="target(item)"
      :title="`前往第 ${item} 页`"
      class="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-sm transition-colors duration-200"
      :class="
        item === page
          ? 'bg-brand-600 font-medium text-white'
          : 'border border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800'
      "
    >
      {{ item }}
    </NuxtLink>

    <NuxtLink
      v-if="page < totalPages"
      :to="target(page + 1)"
      :title="`前往第 ${page + 1} 页`"
      class="inline-flex h-9 cursor-pointer items-center gap-1 rounded-lg border border-slate-200 px-3 text-sm text-slate-600 transition-colors duration-200 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
    >
      下一页
      <ChevronRight class="h-4 w-4" />
    </NuxtLink>
  </nav>
</template>
