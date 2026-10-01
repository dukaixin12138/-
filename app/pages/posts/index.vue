<script setup lang="ts">
import { SearchX } from 'lucide-vue-next'

interface PostItem {
  id: number
  title: string
  slug: string
  summary: string | null
  cover: string | null
  views: number
  featured: boolean
  readingTime: number
  publishedAt: string | null
  createdAt: string
  category: { id: number; name: string; slug: string } | null
  tags: Array<{ id: number; name: string; slug: string }>
}

const route = useRoute()

const page = computed(() => Math.max(1, Number(route.query.page) || 1))
const keyword = computed(() => (typeof route.query.keyword === 'string' ? route.query.keyword : ''))
const activeCategory = computed(() =>
  typeof route.query.category === 'string' ? route.query.category : '',
)
const activeTag = computed(() => (typeof route.query.tag === 'string' ? route.query.tag : ''))

const { data, pending } = await useFetch<{
  items: PostItem[]
  total: number
  page: number
  totalPages: number
}>('/api/posts', {
  query: computed(() => ({
    page: page.value,
    pageSize: 10,
    keyword: keyword.value || undefined,
    category: activeCategory.value || undefined,
    tag: activeTag.value || undefined,
  })),
  key: 'post-list',
})

const { data: taxonomy } = await useFetch<{
  categories: Array<{ id: number; name: string; slug: string; count: number }>
  tags: Array<{ id: number; name: string; slug: string; count: number }>
}>('/api/taxonomy', { key: 'post-list-taxonomy' })

const posts = computed(() => data.value?.items ?? [])
const totalPages = computed(() => data.value?.totalPages ?? 1)

const heading = computed(() => {
  if (keyword.value) return `搜索「${keyword.value}」`
  if (activeTag.value) return `标签：${activeTag.value}`
  if (activeCategory.value) {
    const hit = taxonomy.value?.categories.find((c) => c.slug === activeCategory.value)
    return `分类：${hit?.name ?? activeCategory.value}`
  }
  return '全部文章'
})

useSeoMeta({
  title: computed(() => `${heading.value} - 文章列表`),
  description: '按时间浏览全部已发布的文章',
})
</script>

<template>
  <div class="page-container pb-24 pt-14 sm:pt-16">
    <header class="mb-10">
      <p class="mono-label">文章列表</p>
      <h1
        class="mt-5 text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl dark:text-slate-50"
      >
        {{ heading }}
      </h1>
      <p class="mt-4 text-sm text-slate-500 dark:text-slate-400">
        共 {{ data?.total ?? 0 }} 篇文章
      </p>
    </header>

    <!-- 分类筛选改为「细线 + 等宽文字」的分隔条，取代圆角胶囊标签 -->
    <div
      class="mb-10 flex flex-wrap items-center gap-x-7 gap-y-3 border-y border-slate-200 py-4 dark:border-slate-800"
    >
      <NuxtLink
        to="/posts"
        class="mono-label cursor-pointer transition-colors duration-200"
        :class="
          !activeCategory && !activeTag
            ? 'text-brand-600 dark:text-brand-400'
            : 'hover:text-slate-900 dark:hover:text-slate-100'
        "
      >
        全部
      </NuxtLink>
      <NuxtLink
        v-for="category in taxonomy?.categories ?? []"
        :key="category.id"
        :to="{ path: '/posts', query: { category: category.slug } }"
        class="mono-label cursor-pointer transition-colors duration-200"
        :class="
          activeCategory === category.slug
            ? 'text-brand-600 dark:text-brand-400'
            : 'hover:text-slate-900 dark:hover:text-slate-100'
        "
      >
        {{ category.name }}
      </NuxtLink>
    </div>

    <div v-if="pending">
      <PostCardSkeleton v-for="index in 4" :key="`skeleton-${index}`" />
    </div>

    <div v-else-if="posts.length" v-auto-animate="{ duration: 260, easing: 'ease-out' }">
      <PostRow v-for="(post, index) in posts" :key="post.id" :post="post" :index="index" />
      <div class="hairline" />
    </div>

    <div
      v-else
      class="flex flex-col items-center gap-3 border-t border-slate-200 py-16 text-center dark:border-slate-800"
    >
      <SearchX class="h-7 w-7 text-slate-300 dark:text-slate-600" />
      <p class="text-sm text-slate-500 dark:text-slate-400">
        {{ keyword ? '没有匹配的文章，换个关键词试试' : '该条件下暂无文章' }}
      </p>
      <NuxtLink to="/posts" class="btn btn-ghost mt-1">返回全部文章</NuxtLink>
    </div>

    <div class="mt-12">
      <PaginationBar :page="page" :total-pages="totalPages" />
    </div>
  </div>
</template>
