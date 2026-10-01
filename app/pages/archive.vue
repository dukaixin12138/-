<script setup lang="ts">
const { data } = await useFetch<{
  total: number
  years: Array<{ year: string; posts: Array<{ id: number; title: string; slug: string; date: string }> }>
}>('/api/archive', { key: 'archive-page' })

const years = computed(() => data.value?.years ?? [])

useSeoMeta({
  title: '归档',
  description: '按时间顺序浏览全部文章',
})
</script>

<template>
  <div class="page-container pb-24 pt-14 sm:pt-16">
    <header class="mb-12">
      <h1 class="text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl dark:text-slate-50">
        归档
      </h1>
      <p class="mt-4 text-sm text-slate-500 dark:text-slate-400">
        共 {{ data?.total ?? 0 }} 篇文章
      </p>
    </header>

    <!-- 年份快速跳转：文章上百篇时不必一路滚 -->
    <nav
      v-if="years.length > 1"
      class="mb-12 flex flex-wrap items-center gap-x-7 gap-y-3 border-y border-slate-200 py-4 dark:border-slate-800"
      aria-label="按年份跳转"
    >
      <a
        v-for="group in years"
        :key="group.year"
        :href="`#year-${group.year}`"
        :title="`跳到 ${group.year} 年`"
        class="mono-label cursor-pointer transition-colors duration-200 hover:text-brand-600 dark:hover:text-brand-400"
      >
        {{ group.year }}
      </a>
    </nav>

    <div v-if="years.length" class="space-y-12">
      <section v-for="group in years" :id="`year-${group.year}`" :key="group.year" class="scroll-mt-8">
        <div class="mb-4 flex items-baseline gap-4">
          <h2 class="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            {{ group.year }}
          </h2>
          <span class="mono-label">{{ group.posts.length }} 篇</span>
        </div>

        <ul>
          <li v-for="post in group.posts" :key="post.id">
            <NuxtLink
              :to="`/posts/${post.slug}`"
              class="group flex cursor-pointer items-baseline gap-5 border-t border-slate-200 py-3 transition-colors duration-200 hover:border-slate-900 dark:border-slate-800 dark:hover:border-slate-100"
            >
              <span class="mono-label shrink-0 text-[10px]">{{ formatMonthDay(post.date) }}</span>
              <span
                class="text-sm text-slate-700 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-brand-600 dark:text-slate-300 dark:group-hover:text-brand-400"
              >
                {{ post.title }}
              </span>
            </NuxtLink>
          </li>
        </ul>
      </section>
    </div>

    <div
      v-else
      class="border-t border-slate-200 py-16 text-center text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400"
    >
      还没有已发布的文章
    </div>
  </div>
</template>
