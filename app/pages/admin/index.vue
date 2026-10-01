<script setup lang="ts">
import { Eye, FileEdit, FileText, MessageSquare, PenSquare, Send } from 'lucide-vue-next'

definePageMeta({ layout: 'admin' })

useSeoMeta({ title: '后台概览' })

const { data } = await useFetch<{
  total: number
  published: number
  draft: number
  views: number
  comments: number
  recent: Array<{
    id: number
    title: string
    slug: string
    status: string
    views: number
    updatedAt: string
  }>
}>('/api/admin/stats', { key: 'admin-stats' })

const stats = computed(() => [
  { label: '文章总数', value: data.value?.total ?? 0, icon: FileText },
  { label: '已发布', value: data.value?.published ?? 0, icon: Send },
  { label: '草稿', value: data.value?.draft ?? 0, icon: FileEdit },
  { label: '总浏览', value: data.value?.views ?? 0, icon: Eye },
  { label: '评论', value: data.value?.comments ?? 0, icon: MessageSquare },
])
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h1 class="text-xl font-semibold text-slate-900 dark:text-slate-100">概览</h1>
      <NuxtLink to="/admin/posts/new" class="btn btn-primary">
        <PenSquare class="h-4 w-4" />
        写新文章
      </NuxtLink>
    </div>

    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div v-for="item in stats" :key="item.label" class="card-surface flex items-center gap-4 p-5">
        <span
          class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400"
        >
          <component :is="item.icon" class="h-5 w-5" />
        </span>
        <div>
          <p class="text-xs text-slate-500 dark:text-slate-400">{{ item.label }}</p>
          <p class="mt-0.5 text-xl font-semibold text-slate-900 dark:text-slate-100">
            {{ item.value }}
          </p>
        </div>
      </div>
    </div>

    <div class="card-surface overflow-hidden">
      <div class="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
        <h2 class="text-sm font-semibold text-slate-900 dark:text-slate-100">最近编辑</h2>
      </div>

      <ul v-if="data?.recent.length" class="divide-y divide-slate-200 dark:divide-slate-800">
        <li v-for="post in data.recent" :key="post.id">
          <NuxtLink
            :to="`/admin/posts/${post.id}/edit`"
            class="flex cursor-pointer items-center justify-between gap-4 px-5 py-3.5 transition-colors duration-200 hover:bg-slate-50 dark:hover:bg-slate-800/50"
          >
            <span class="min-w-0 flex-1 truncate text-sm text-slate-800 dark:text-slate-200">
              {{ post.title }}
            </span>
            <span
              class="badge shrink-0"
              :class="post.status === 'published' ? 'badge-brand' : ''"
            >
              {{ post.status === 'published' ? '已发布' : '草稿' }}
            </span>
            <span class="w-20 shrink-0 text-right text-xs text-slate-400">
              {{ formatDate(post.updatedAt) }}
            </span>
          </NuxtLink>
        </li>
      </ul>

      <p v-else class="px-5 py-10 text-center text-sm text-slate-400">还没有文章</p>
    </div>
  </div>
</template>
