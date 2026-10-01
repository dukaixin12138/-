<script setup lang="ts">
import {
  ExternalLink,
  FileText,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  PenSquare,
  User,
  Users,
} from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()

const { data: session } = await useFetch<{
  user: { id: number; username: string; nickname: string; role: string } | null
}>('/api/auth/me', { key: 'admin-session' })

const isAdminRole = computed(() => session.value?.user?.role === 'admin')

const navItems = computed(() => {
  const items = [
    { label: '概览', to: '/admin', icon: LayoutDashboard, exact: true },
    { label: '文章管理', to: '/admin/posts', icon: FileText, exact: false },
  ]

  // 评论与用户管理仅管理员可见
  if (isAdminRole.value) {
    items.push({ label: '评论管理', to: '/admin/comments', icon: MessageSquare, exact: true })
    items.push({ label: '用户管理', to: '/admin/users', icon: Users, exact: true })
  }

  items.push({ label: '写文章', to: '/admin/posts/new', icon: PenSquare, exact: true })
  return items
})

function isActive(item: { to: string; exact: boolean }) {
  if (item.exact) return route.path === item.to
  if (item.to === '/admin/posts') {
    return route.path.startsWith('/admin/posts') && route.path !== '/admin/posts/new'
  }
  return route.path.startsWith(item.to)
}

const loggingOut = ref(false)

async function logout() {
  loggingOut.value = true
  try {
    await $fetch('/api/auth/logout', { method: 'POST' })
    await router.push('/admin/login')
  } finally {
    loggingOut.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-slate-50 dark:bg-slate-950">
    <div class="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-6 lg:flex-row sm:px-8">
      <aside class="lg:w-60 lg:shrink-0">
        <div class="card-surface p-4 lg:sticky lg:top-6">
          <p class="px-2 pb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
            博客后台
          </p>

          <nav class="space-y-1">
            <NuxtLink
              v-for="item in navItems"
              :key="item.to"
              :to="item.to"
              class="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-200"
              :class="
                isActive(item)
                  ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
              "
            >
              <component :is="item.icon" class="h-4 w-4" />
              {{ item.label }}
            </NuxtLink>

            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              class="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors duration-200 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              <ExternalLink class="h-4 w-4" />
              查看站点
            </a>
          </nav>

          <div class="mt-4 border-t border-slate-200 pt-4 dark:border-slate-800">
            <div class="flex items-center gap-2.5 px-2 pb-3">
              <span
                class="inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300"
              >
                <User class="h-4 w-4" />
              </span>
              <div class="min-w-0">
                <p class="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                  {{ session?.user?.nickname || session?.user?.username || '未登录' }}
                </p>
                <p class="truncate text-xs text-slate-400">{{ session?.user?.role }}</p>
              </div>
            </div>

            <button
              type="button"
              class="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors duration-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:text-slate-400 dark:hover:bg-red-900/20 dark:hover:text-red-400"
              :disabled="loggingOut"
              @click="logout"
            >
              <LogOut class="h-4 w-4" />
              退出登录
            </button>
          </div>
        </div>
      </aside>

      <div class="min-w-0 flex-1">
        <slot />
      </div>
    </div>
  </div>
</template>
