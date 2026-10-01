<script setup lang="ts">
import { FolderOpen } from 'lucide-vue-next'

const { data } = await useFetch<{
  categories: Array<{ id: number; name: string; slug: string; desc: string | null; count: number }>
}>('/api/taxonomy', { key: 'categories-page' })

const categories = computed(() => data.value?.categories ?? [])

useSeoMeta({
  title: '全部分类',
  description: '按分类浏览站点内的全部文章',
})
</script>

<template>
  <div class="page-container pb-24 pt-14 sm:pt-16">
    <header class="mb-10">
      <h1 class="text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl dark:text-slate-50">
        全部分类
      </h1>
      <p class="mt-4 text-sm text-slate-500 dark:text-slate-400">
        共 {{ categories.length }} 个分类
      </p>
    </header>

    <div v-if="categories.length" class="grid gap-x-10 sm:grid-cols-2">
      <NuxtLink
        v-for="category in categories"
        :key="category.id"
        :to="`/categories/${category.slug}`"
        class="group flex cursor-pointer items-baseline justify-between gap-4 border-t border-slate-200 py-5 transition-colors duration-200 hover:border-slate-900 dark:border-slate-800 dark:hover:border-slate-100"
      >
        <div>
          <h2
            class="text-lg font-medium text-slate-900 transition-colors duration-200 group-hover:text-brand-600 dark:text-slate-100 dark:group-hover:text-brand-400"
          >
            {{ category.name }}
          </h2>
          <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {{ category.desc || '查看该分类下的全部文章' }}
          </p>
        </div>
        <span class="mono-label shrink-0">{{ category.count }}</span>
      </NuxtLink>
    </div>

    <div
      v-else
      class="flex flex-col items-center gap-3 border-t border-slate-200 py-16 text-center dark:border-slate-800"
    >
      <FolderOpen class="h-7 w-7 text-slate-300 dark:text-slate-600" />
      <p class="text-sm text-slate-500 dark:text-slate-400">还没有创建任何分类</p>
    </div>
  </div>
</template>
