<script setup lang="ts">
import { Tag } from 'lucide-vue-next'

const { data } = await useFetch<{
  tags: Array<{ id: number; name: string; slug: string; count: number }>
}>('/api/taxonomy', { key: 'tags-page' })

const tags = computed(() => data.value?.tags ?? [])

useSeoMeta({
  title: '全部标签',
  description: '按标签浏览站点内的全部文章',
})
</script>

<template>
  <div class="page-container pb-24 pt-14 sm:pt-16">
    <header class="mb-10">
      <p class="mono-label">标签索引</p>
      <h1 class="mt-5 text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl dark:text-slate-50">
        全部标签
      </h1>
      <p class="mt-4 text-sm text-slate-500 dark:text-slate-400">
        共 {{ tags.length }} 个标签
      </p>
    </header>

    <div v-if="tags.length" class="flex flex-wrap gap-3">
      <NuxtLink
        v-for="tag in tags"
        :key="tag.id"
        :to="`/tags/${tag.slug}`"
        :title="`查看标签「${tag.name}」下的文章`"
        class="group inline-flex cursor-pointer items-center gap-2.5 border border-slate-200 px-4 py-2 transition-colors duration-200 hover:border-slate-900 dark:border-slate-800 dark:hover:border-slate-100"
      >
        <span
          class="text-sm font-medium text-slate-800 transition-colors duration-200 group-hover:text-brand-600 dark:text-slate-200 dark:group-hover:text-brand-400"
        >
          {{ tag.name }}
        </span>
        <span class="mono-label">{{ tag.count }}</span>
      </NuxtLink>
    </div>

    <div
      v-else
      class="flex flex-col items-center gap-3 border-t border-slate-200 py-16 text-center dark:border-slate-800"
    >
      <Tag class="h-7 w-7 text-slate-300 dark:text-slate-600" />
      <p class="text-sm text-slate-500 dark:text-slate-400">还没有任何标签</p>
    </div>
  </div>
</template>
