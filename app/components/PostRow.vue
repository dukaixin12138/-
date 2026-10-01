<script setup lang="ts">
import { ArrowUpRight } from 'lucide-vue-next'

interface PostRowData {
  id?: number
  title: string
  slug: string
  summary?: string | null
  views: number
  readingTime: number
  featured?: boolean
  publishedAt?: string | Date | null
  createdAt?: string | Date | null
  category?: { name: string; slug: string } | null
  tags?: Array<{ name: string; slug: string }>
}

const props = defineProps<{
  post: PostRowData
  index: number
}>()

const publishedDate = computed(() => props.post.publishedAt ?? props.post.createdAt)
const number = computed(() => String(props.index + 1).padStart(2, '0'))
</script>

<template>
  <!--
    编辑式列表行：用「编号 + 排版层级 + 细线」组织信息，
    刻意不使用卡片、圆角与阴影 —— 那正是传统博客网格的视觉特征。
  -->
  <NuxtLink
    :to="`/posts/${post.slug}`"
    :title="post.title"
    class="group block cursor-pointer border-t border-slate-200 py-6 transition-colors duration-200 hover:border-slate-900 sm:py-7 dark:border-slate-800 dark:hover:border-slate-100"
  >
    <div class="flex items-baseline gap-5 sm:gap-8">
      <span
        class="mono-label shrink-0 pt-1 transition-colors duration-200 group-hover:text-brand-600 dark:group-hover:text-brand-400"
      >
        {{ number }}
      </span>

      <div class="min-w-0 flex-1">
        <div class="flex items-start justify-between gap-4">
          <h3
            class="text-xl font-semibold leading-snug tracking-tight text-slate-900 transition-transform duration-300 group-hover:translate-x-1 sm:text-2xl dark:text-slate-100"
          >
            {{ post.title }}
          </h3>

          <ArrowUpRight
            class="mt-1 h-5 w-5 shrink-0 text-slate-300 opacity-0 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-brand-600 group-hover:opacity-100 dark:text-slate-600 dark:group-hover:text-brand-400"
          />
        </div>

        <p
          v-if="post.summary"
          class="mt-2.5 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-400"
        >
          {{ post.summary }}
        </p>

        <div
          class="mt-3.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500 dark:text-slate-400"
        >
          <span class="mono-label text-[10px]">{{ formatDate(publishedDate) }}</span>
          <span>{{ post.readingTime }} 分钟</span>
          <span>{{ post.views }} 次浏览</span>
          <span v-if="post.category" class="text-brand-600 dark:text-brand-400">
            {{ post.category.name }}
          </span>
        </div>
      </div>
    </div>
  </NuxtLink>
</template>
