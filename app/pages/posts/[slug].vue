<script setup lang="ts">
import { ArrowLeft, ArrowRight, Calendar, Clock, Eye, Tag } from 'lucide-vue-next'

interface TocEntry {
  id: string
  text: string
  level: number
}

interface PostDetail {
  id: number
  title: string
  slug: string
  summary: string | null
  cover: string | null
  views: number
  readingTime: number
  publishedAt: string | null
  createdAt: string
  updatedAt: string
  html: string
  toc: TocEntry[]
  category: { id: number; name: string; slug: string } | null
  tags: Array<{ id: number; name: string; slug: string }>
  author: { id: number; username: string; nickname: string | null; avatar: string | null }
  prev: { title: string; slug: string } | null
  next: { title: string; slug: string } | null
}

const route = useRoute()
const config = useRuntimeConfig()
const slug = String(route.params.slug)

const { data: post, error } = await useFetch<PostDetail>(`/api/posts/${slug}`, {
  key: `post-${slug}`,
})

if (error.value || !post.value) {
  throw createError({ statusCode: 404, statusMessage: '文章不存在', fatal: true })
}

const current = post.value
const siteUrl = String(config.public.siteUrl).replace(/\/$/, '')
const publishedAt = current.publishedAt ?? current.createdAt

useSeoMeta({
  title: current.title,
  description: current.summary ?? '',
  ogTitle: current.title,
  ogDescription: current.summary ?? '',
  ogType: 'article',
  articlePublishedTime: publishedAt,
  articleModifiedTime: current.updatedAt,
})

useHead({
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: current.title,
        description: current.summary ?? '',
        datePublished: publishedAt,
        dateModified: current.updatedAt,
        author: { '@type': 'Person', name: current.author.nickname || current.author.username },
        mainEntityOfPage: `${siteUrl}/posts/${current.slug}`,
      }).replace(/</g, '\\u003c'),
    },
  ],
})
</script>

<template>
  <div class="pb-20">
    <article>
      <header class="page-container pt-12 sm:pt-16">
        <nav class="mono-label mb-8 flex items-center gap-2" aria-label="面包屑">
          <NuxtLink to="/" class="cursor-pointer hover:text-brand-600 dark:hover:text-brand-400">首页</NuxtLink>
          <span>/</span>
          <NuxtLink to="/posts" class="cursor-pointer hover:text-brand-600 dark:hover:text-brand-400">文章</NuxtLink>
          <template v-if="current.category">
            <span>/</span>
            <NuxtLink
              :to="`/categories/${current.category.slug}`"
              class="cursor-pointer hover:text-brand-600 dark:hover:text-brand-400"
            >
              {{ current.category.name }}
            </NuxtLink>
          </template>
        </nav>

        <!-- 巨型标题跨全宽占据版面，是编辑式排版的视觉锚点 -->
        <h1 class="display-title max-w-5xl text-slate-900 dark:text-slate-50">
          {{ current.title }}
        </h1>

        <p
          v-if="current.summary"
          class="mt-7 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg dark:text-slate-400"
        >
          {{ current.summary }}
        </p>

        <div
          class="mt-9 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-slate-200 pt-5 dark:border-slate-800"
        >
          <span class="mono-label text-[10px]">{{ formatDate(publishedAt) }}</span>
          <span class="text-xs text-slate-500 dark:text-slate-400">
            {{ current.readingTime }} 分钟阅读
          </span>
          <span class="text-xs text-slate-500 dark:text-slate-400">
            {{ current.views + 1 }} 次浏览
          </span>
          <span v-if="current.category" class="text-xs text-brand-600 dark:text-brand-400">
            {{ current.category.name }}
          </span>
        </div>
      </header>

      <div v-if="current.cover" class="page-container mt-10">
        <img
          :src="current.cover"
          :alt="current.title"
          loading="eager"
          decoding="async"
          class="w-full rounded-2xl border border-slate-200 object-cover dark:border-slate-800"
        >
      </div>

      <div class="page-container mt-12">
        <div class="grid gap-14 lg:grid-cols-[minmax(0,1fr)_220px]">
          <!-- 正文单独限制 measure，保证长文可读性；外层容器可更宽以容纳 TOC -->
          <div class="prose-blog min-w-0 max-w-3xl" v-html="current.html" />

          <aside class="hidden lg:block">
            <div class="sticky top-10">
              <TableOfContents :items="current.toc" />
            </div>
          </aside>
        </div>
      </div>
    </article>

    <div class="page-container mt-16">
      <div class="max-w-3xl space-y-10">
        <div
          v-if="current.tags.length"
          class="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-slate-200 pt-6 dark:border-slate-800"
        >
          <Tag class="h-3.5 w-3.5 text-slate-400" />
          <NuxtLink
            v-for="tag in current.tags"
            :key="tag.id"
            :to="{ path: '/posts', query: { tag: tag.slug } }"
            :title="`查看标签「${tag.name}」下的文章`"
            class="mono-label cursor-pointer transition-colors duration-200 hover:text-brand-600 dark:hover:text-brand-400"
          >
            {{ tag.name }}
          </NuxtLink>
        </div>

        <div class="grid gap-x-8 gap-y-8 sm:grid-cols-2">
          <NuxtLink
            v-if="current.prev"
            :to="`/posts/${current.prev.slug}`"
            :title="`上一篇：${current.prev.title}`"
            class="group cursor-pointer border-t border-slate-200 pt-4 transition-colors duration-200 hover:border-slate-900 dark:border-slate-800 dark:hover:border-slate-100"
          >
            <span class="mono-label inline-flex items-center gap-1.5">
              <ArrowLeft class="h-3.5 w-3.5" />
              上一篇
            </span>
            <p
              class="mt-2.5 line-clamp-2 text-sm font-medium text-slate-900 transition-colors duration-200 group-hover:text-brand-600 dark:text-slate-100 dark:group-hover:text-brand-400"
            >
              {{ current.prev.title }}
            </p>
          </NuxtLink>

          <NuxtLink
            v-if="current.next"
            :to="`/posts/${current.next.slug}`"
            :title="`下一篇：${current.next.title}`"
            class="group cursor-pointer border-t border-slate-200 pt-4 transition-colors duration-200 hover:border-slate-900 sm:text-right dark:border-slate-800 dark:hover:border-slate-100"
          >
            <span class="mono-label inline-flex items-center gap-1.5 sm:flex-row-reverse">
              <ArrowRight class="h-3.5 w-3.5" />
              下一篇
            </span>
            <p
              class="mt-2.5 line-clamp-2 text-sm font-medium text-slate-900 transition-colors duration-200 group-hover:text-brand-600 dark:text-slate-100 dark:group-hover:text-brand-400"
            >
              {{ current.next.title }}
            </p>
          </NuxtLink>
        </div>

        <p class="border-t border-slate-200 pt-6 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
          觉得有帮助？欢迎通过
          <a
            href="/rss.xml"
            target="_blank"
            rel="noopener noreferrer"
            class="cursor-pointer font-medium text-brand-600 dark:text-brand-400"
          >
            RSS
          </a>
          订阅后续更新。
        </p>
      </div>
    </div>

    <!-- 窄屏下的目录入口（桌面端由右侧栏承担） -->
    <MobileToc :items="current.toc" />

    <div class="page-container mt-16">
      <CommentSection :slug="current.slug" />
    </div>
  </div>
</template>
