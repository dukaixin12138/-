<script setup lang="ts">
import { ArrowRight } from 'lucide-vue-next'

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

const config = useRuntimeConfig()
const siteName = String(config.public.siteName)
const siteDescription = String(config.public.siteDescription)
const currentYear = new Date().getFullYear()

const { data: postData } = await useFetch<{ items: PostItem[]; total: number }>('/api/posts', {
  query: { page: 1, pageSize: 6 },
  key: 'home-posts',
})

const { data: taxonomy } = await useFetch<{
  categories: Array<{ id: number; name: string; slug: string; desc: string | null; count: number }>
  tags: Array<{ id: number; name: string; slug: string; count: number }>
}>('/api/taxonomy', { key: 'home-taxonomy' })

const posts = computed(() => postData.value?.items ?? [])
const featuredPost = computed(() => posts.value.find((post) => post.featured) ?? null)
const otherPosts = computed(() => posts.value.filter((post) => post.id !== featuredPost.value?.id))
const categories = computed(() => (taxonomy.value?.categories ?? []).filter((c) => c.count > 0))
const total = computed(() => postData.value?.total ?? 0)

useSeoMeta({
  title: `${siteName} — ${siteDescription}`,
  description: siteDescription,
  ogTitle: siteName,
  ogDescription: siteDescription,
  ogType: 'website',
})
</script>

<template>
  <div>
    <!--
      编辑式开篇：等宽小标注定位版面，巨型标题作为唯一视觉锚点，
      描述文字用 12 栏网格推到右侧形成非对称结构（而不是传统的居中对齐）。
    -->
    <section class="page-container pb-16 pt-14 sm:pb-20 sm:pt-20">
      <p class="mono-label animate-fade-up">{{ currentYear }} 年 · 共 {{ total }} 篇</p>

      <h1 class="display-title mt-6 max-w-4xl animate-fade-up text-slate-900 dark:text-slate-50">
        {{ siteName }}
      </h1>

      <div class="mt-9 grid gap-8 sm:grid-cols-12">
        <p
          class="animate-fade-up text-base leading-relaxed text-slate-600 sm:col-span-6 sm:col-start-7 sm:text-lg dark:text-slate-400"
        >
          {{ siteDescription }}
        </p>
      </div>

      <!-- 订阅入口统一收敛到页脚，首屏只保留一个主行动点 -->
      <div class="mt-10">
        <NuxtLink
          to="/posts"
          title="浏览全部文章"
          class="group inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-900 dark:text-slate-100"
        >
          浏览全部文章
          <ArrowRight class="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
        </NuxtLink>
      </div>
    </section>

    <!-- 精选：标题占 7 栏、摘要占 5 栏，刻意打破对称 -->
    <section v-if="featuredPost" class="page-container pb-16">
      <p class="mono-label mb-5">精选文章</p>

      <NuxtLink
        v-motion
        :to="`/posts/${featuredPost.slug}`"
        class="group block border-t border-slate-200 pt-7 dark:border-slate-800"
        :initial="{ opacity: 0, y: 16 }"
        :visible-once="{ opacity: 1, y: 0, transition: { duration: 450 } }"
      >
        <div class="grid gap-6 sm:grid-cols-12">
          <div class="sm:col-span-7">
            <h2
              class="text-3xl font-semibold leading-tight tracking-tight text-slate-900 transition-colors duration-200 group-hover:text-brand-600 sm:text-4xl dark:text-slate-50 dark:group-hover:text-brand-400"
            >
              {{ featuredPost.title }}
            </h2>
          </div>

          <div class="space-y-4 sm:col-span-5">
            <p class="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              {{ featuredPost.summary }}
            </p>
            <div
              class="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500 dark:text-slate-400"
            >
              <span class="mono-label text-[10px]">
                {{ formatDate(featuredPost.publishedAt ?? featuredPost.createdAt) }}
              </span>
              <span>{{ featuredPost.readingTime }} 分钟</span>
            </div>
          </div>
        </div>
      </NuxtLink>
    </section>

    <!-- 最新文章：编号行列表 -->
    <section class="page-container pb-16">
      <div class="mb-6 flex items-end justify-between gap-4">
        <p class="mono-label">最新发布</p>
        <NuxtLink
          to="/posts"
          class="mono-label cursor-pointer transition-colors duration-200 hover:text-brand-600 dark:hover:text-brand-400"
        >
          全部文章 →
        </NuxtLink>
      </div>

      <div v-if="otherPosts.length" v-auto-animate="{ duration: 260, easing: 'ease-out' }">
        <PostRow
          v-for="(post, index) in otherPosts"
          :key="post.id"
          :post="post"
          :index="index"
        />
        <div class="hairline" />
      </div>

      <p v-else class="border-t border-slate-200 py-10 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
        还没有已发布的文章，去后台写第一篇吧。
      </p>
    </section>

    <!-- 分类：双栏细线列表，右侧只留一个数字 -->
    <section v-if="categories.length" class="page-container pb-24">
      <p class="mono-label mb-5">浏览分类</p>

      <div class="grid gap-x-10 sm:grid-cols-2">
        <NuxtLink
          v-for="category in categories"
          :key="category.id"
          :to="`/categories/${category.slug}`"
          class="group flex cursor-pointer items-baseline justify-between gap-4 border-t border-slate-200 py-5 transition-colors duration-200 hover:border-slate-900 dark:border-slate-800 dark:hover:border-slate-100"
        >
          <div>
            <p
              class="text-lg font-medium text-slate-900 transition-colors duration-200 group-hover:text-brand-600 dark:text-slate-100 dark:group-hover:text-brand-400"
            >
              {{ category.name }}
            </p>
            <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {{ category.desc || '查看该分类下的全部文章' }}
            </p>
          </div>
          <span class="mono-label shrink-0">{{ category.count }}</span>
        </NuxtLink>
      </div>
    </section>
  </div>
</template>
