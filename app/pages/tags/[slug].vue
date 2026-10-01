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
  tags: Array<{ id: number; name: string; slug: string; count: number }>
}>('/api/taxonomy', { key: 'tag-detail-taxonomy' })

const tag = computed(() => taxonomy.value?.tags.find((item) => item.slug === slug) ?? null)

const { data } = await useFetch<{ items: PostItem[]; total: number; totalPages: number }>(
  '/api/posts',
  {
    query: computed(() => ({ page: page.value, pageSize: 10, tag: slug })),
    key: `tag-${slug}`,
  },
)

const posts = computed(() => data.value?.items ?? [])

useSeoMeta({
  title: computed(() => `${tag.value?.name ?? slug} - 标签`),
  description: computed(() => `标签 ${tag.value?.name ?? slug} 下的全部文章`),
})
</script>

<template>
  <div class="page-container pb-24 pt-14 sm:pt-16">
    <header class="mb-10">
      <NuxtLink
        to="/posts"
        class="mono-label cursor-pointer transition-colors duration-200 hover:text-brand-600 dark:hover:text-brand-400"
      >
        ← 全部文章
      </NuxtLink>
      <h1
        class="mt-5 text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl dark:text-slate-50"
      >
        {{ tag?.name ?? slug }}
      </h1>
      <p class="mt-4 text-sm text-slate-500 dark:text-slate-400">
        共 {{ data?.total ?? 0 }} 篇相关文章
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
      该标签下暂无文章
    </div>

    <div class="mt-12">
      <PaginationBar :page="page" :total-pages="data?.totalPages ?? 1" />
    </div>
  </div>
</template>
