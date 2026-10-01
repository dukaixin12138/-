<script setup lang="ts">
import { Home, SearchX } from 'lucide-vue-next'
import type { NuxtError } from '#app'

const props = defineProps<{ error: NuxtError }>()

const isNotFound = computed(() => props.error?.statusCode === 404)

useSeoMeta({
  title: computed(() => `${props.error?.statusCode ?? '出错了'}`),
})
</script>

<template>
  <div class="flex min-h-screen flex-col items-center justify-center gap-5 bg-white px-6 text-center dark:bg-slate-950">
    <SearchX class="h-12 w-12 text-slate-300 dark:text-slate-600" />

    <div>
      <p class="font-mono text-sm text-slate-400">{{ error?.statusCode ?? 500 }}</p>
      <h1 class="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-50">
        {{ isNotFound ? '页面不存在' : '出了点问题' }}
      </h1>
      <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">
        {{ isNotFound ? '你要找的内容可能已被移动或删除。' : error?.statusMessage || '请稍后重试。' }}
      </p>
    </div>

    <div class="flex flex-wrap items-center justify-center gap-3">
      <NuxtLink to="/" class="btn btn-primary">
        <Home class="h-4 w-4" />
        回到首页
      </NuxtLink>
      <NuxtLink to="/posts" class="btn btn-ghost">浏览文章</NuxtLink>
    </div>
  </div>
</template>
