<script setup lang="ts">
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
const slug = String(route.params.slug)
const page = computed(() => Math.max(1, Number(route.query.page) || 1))

const { data: taxonomy } = await useFetch<{
  categories: Array<{ id: number; name: string; slug: string; desc: string | null; count: number }>
}>('/api/taxonomy', { key: 'category-detail-taxonomy' })

const category = computed(
  () => taxonomy.value?.categories.find((item) => item.slug === slug) ?? null,
)

const { data } = await useFetch<{ items: PostItem[]; total: number; totalPages: number }>(
  '/api/posts',
  {
    query: computed(() => ({ page: page.value, pageSize: 10, category: slug })),
    key: `category-${slug}`,
  },
)

const posts = computed(() => data.value?.items ?? [])

useSeoMeta({
  title: computed(() => `${category.value?.name ?? slug} - 分类`),
  description: computed(() => category.value?.desc ?? `分类 ${slug} 下的全部文章`),
})
</script>

<template>
  <div class="page-container pb-24 pt-14 sm:pt-16">
    <header class="mb-10">
      <NuxtLink
        to="/categories"
        class="mono-label cursor-pointer transition-colors duration-200 hover:text-brand-600 dark:hover:text-brand-400"
      >
        ← 全部分类
      </NuxtLink>
      <h1
        class="mt-5 text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl dark:text-slate-50"
      >
        {{ category?.name ?? slug }}
      </h1>
      <p class="mt-4 text-sm text-slate-500 dark:text-slate-400">
        {{ category?.desc || '该分类下的全部文章' }} · 共 {{ data?.total ?? 0 }} 篇
      </p>
    </header>

    <div v-if="posts.length">
      <PostRow v-for="(post, index) in posts" :key="post.id" :post="post" :index="index" />
      <div class="hairline" />
    </div>

    <div
      v-else
      class="border-t border-slate-200 py-16 text-center text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400"
    >
      该分类下暂无文章
    </div>

    <div class="mt-12">
      <PaginationBar :page="page" :total-pages="data?.totalPages ?? 1" />
    </div>
  </div>
</template>
