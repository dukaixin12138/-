<script setup lang="ts">
import { AlertCircle, Loader2, LockKeyhole, LogIn, User } from 'lucide-vue-next'

definePageMeta({ layout: false })

useSeoMeta({ title: '后台登录' })

const route = useRoute()
const router = useRouter()
const config = useRuntimeConfig()

const form = reactive({ username: '', password: '' })
const loading = ref(false)
const errorMessage = ref('')

async function submit() {
  errorMessage.value = ''

  if (!form.username.trim() || !form.password) {
    errorMessage.value = '请输入用户名和密码'
    return
  }

  loading.value = true
  try {
    await $fetch('/api/auth/login', {
      method: 'POST',
      body: { username: form.username.trim(), password: form.password },
    })

    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/admin'
    await router.push(redirect)
  } catch (error: unknown) {
    const err = error as { statusMessage?: string; data?: { statusMessage?: string } }
    errorMessage.value = err?.data?.statusMessage || err?.statusMessage || '登录失败，请重试'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-slate-50 px-5 dark:bg-slate-950">
    <div class="w-full max-w-sm">
      <div class="mb-8 text-center">
        <h1 class="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
          {{ config.public.siteName }} 后台
        </h1>
        <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">登录后即可管理文章</p>
      </div>

      <form class="card-surface space-y-4 p-6" @submit.prevent="submit">
        <div>
          <label for="username" class="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
            用户名
          </label>
          <div class="relative">
            <User class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id="username"
              v-model="form.username"
              type="text"
              autocomplete="username"
              class="field pl-9"
              placeholder="admin"
            >
          </div>
        </div>

        <div>
          <label for="password" class="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
            密码
          </label>
          <div class="relative">
            <LockKeyhole class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id="password"
              v-model="form.password"
              type="password"
              autocomplete="current-password"
              class="field pl-9"
              placeholder="••••••"
            >
          </div>
        </div>

        <p
          v-if="errorMessage"
          class="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400"
        >
          <AlertCircle class="h-4 w-4 shrink-0" />
          {{ errorMessage }}
        </p>

        <button type="submit" class="btn btn-primary w-full" :disabled="loading">
          <Loader2 v-if="loading" class="h-4 w-4 animate-spin" />
          <LogIn v-else class="h-4 w-4" />
          {{ loading ? '登录中…' : '登录' }}
        </button>
      </form>

      <p class="mt-6 text-center text-xs text-slate-400">
        默认账号来自 <code class="font-mono">.env</code> 中的 ADMIN_USERNAME / ADMIN_PASSWORD
      </p>

      <NuxtLink
        to="/"
        class="mt-4 block text-center text-xs text-slate-400 transition-colors duration-200 hover:text-brand-600"
      >
        ← 返回站点首页
      </NuxtLink>
    </div>
  </div>
</template>
