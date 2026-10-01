<script setup lang="ts">
import { Rss } from 'lucide-vue-next'

const config = useRuntimeConfig()
const year = new Date().getFullYear()

const siteName = computed(() => String(config.public.siteName))
const siteDescription = computed(() => String(config.public.siteDescription))
</script>

<template>
  <!-- 页脚不再使用色块分区，靠一条细线收束版面 -->
  <footer class="mt-10 border-t border-slate-200 dark:border-slate-800">
    <div
      class="page-container flex flex-col gap-5 py-10 sm:flex-row sm:items-center sm:justify-between"
    >
      <div class="space-y-1.5">
        <p class="text-sm font-semibold text-slate-900 dark:text-slate-100">{{ siteName }}</p>
        <p class="text-sm text-slate-500 dark:text-slate-400">{{ siteDescription }}</p>
      </div>

      <div class="flex flex-wrap items-center gap-x-6 gap-y-2">
        <NuxtLink
          to="/about"
          title="关于本站"
          class="mono-label cursor-pointer transition-colors duration-200 hover:text-brand-600 dark:hover:text-brand-400"
        >
          关于
        </NuxtLink>
        <NuxtLink
          to="/archive"
          title="按时间线浏览全部文章"
          class="mono-label cursor-pointer transition-colors duration-200 hover:text-brand-600 dark:hover:text-brand-400"
        >
          归档
        </NuxtLink>
        <a
          href="/rss.xml"
          target="_blank"
          rel="noopener noreferrer"
          title="订阅 RSS 更新"
          class="mono-label inline-flex cursor-pointer items-center gap-1.5 transition-colors duration-200 hover:text-brand-600 dark:hover:text-brand-400"
        >
          <Rss class="h-3.5 w-3.5" />
          RSS
        </a>
        <span class="mono-label">© {{ year }}</span>
      </div>
    </div>
  </footer>
</template>
