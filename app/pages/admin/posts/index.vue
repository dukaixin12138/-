<script setup lang="ts">
import { ExternalLink, PenSquare, Search, Trash2 } from 'lucide-vue-next'

definePageMeta({ layout: 'admin' })

useSeoMeta({ title: '文章管理' })

interface AdminPostItem {
  id: number
  title: string
  slug: string
  status: string
  views: number
  featured: boolean
  publishedAt: string | null
  updatedAt: string
  category: { id: number; name: string } | null
}

const route = useRoute()
const router = useRouter()
const { confirm } = useConfirm()
const toast = useToast()

const page = computed(() => Math.max(1, Number(route.query.page) || 1))
const status = computed(() => (typeof route.query.status === 'string' ? route.query.status : ''))
const keyword = ref(typeof route.query.keyword === 'string' ? route.query.keyword : '')

const { data, refresh } = await useFetch<{
  items: AdminPostItem[]
  total: number
  totalPages: number
}>('/api/admin/posts', {
  query: computed(() => ({
    page: page.value,
    pageSize: 10,
    status: status.value || undefined,
    keyword: keyword.value.trim() || undefined,
  })),
  key: 'admin-posts',
})

const posts = computed(() => data.value?.items ?? [])
const totalPages = computed(() => data.value?.totalPages ?? 1)
const deleting = ref<number | null>(null)

function setStatus(value: string) {
  router.push({ path: '/admin/posts', query: value ? { status: value } : {} })
}

function search() {
  router.push({
    path: '/admin/posts',
    query: keyword.value.trim() ? { keyword: keyword.value.trim() } : {},
  })
}

async function remove(post: AdminPostItem) {
  if (!(await confirm(`确定删除《${post.title}》吗？该操作不可恢复。`))) return

  deleting.value = post.id
  try {
    await $fetch(`/api/admin/posts/${post.id}`, { method: 'DELETE' })
    toast.success('文章已删除')
    await refresh()
  } catch {
    toast.error('删除失败，请重试')
  } finally {
    deleting.value = null
  }
}

// —— 批量操作 ——
const selected = ref<number[]>([])

const allSelected = computed(
  () => posts.value.length > 0 && selected.value.length === posts.value.length,
)

function toggleAll(event: Event) {
  const checked = (event.target as HTMLInputElement).checked
  selected.value = checked ? posts.value.map((post) => post.id) : []
}

function toggleOne(id: number) {
  selected.value = selected.value.includes(id)
    ? selected.value.filter((item) => item !== id)
    : [...selected.value, id]
}

// 切换筛选或翻页后清空选择，避免误操作到不可见的数据
watch([page, status, keyword], () => {
  selected.value = []
})

const bulkBusy = ref(false)
const bulkLabels: Record<string, string> = {
  delete: '删除',
  publish: '发布',
  draft: '转为草稿',
}

async function runBulk(action: 'delete' | 'publish' | 'draft') {
  if (!selected.value.length) return

  if (
    action === 'delete' &&
    !(await confirm(`确定删除选中的 ${selected.value.length} 篇文章吗？该操作不可恢复。`))
  ) {
    return
  }

  bulkBusy.value = true
  try {
    const res = await $fetch<{ affected: number }>('/api/admin/posts/bulk', {
      method: 'POST',
      body: { action, ids: selected.value },
    })
    toast.success(`已${bulkLabels[action]} ${res.affected} 篇文章`)
    selected.value = []
    await refresh()
  } catch (error: unknown) {
    const err = error as { data?: { statusMessage?: string } }
    toast.error(err?.data?.statusMessage || '批量操作失败')
  } finally {
    bulkBusy.value = false
  }
}
</script>

<template>
  <div class="space-y-5">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="text-xl font-semibold text-slate-900 dark:text-slate-100">文章管理</h1>
        <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">共 {{ data?.total ?? 0 }} 篇</p>
      </div>
      <NuxtLink to="/admin/posts/new" class="btn btn-primary">
        <PenSquare class="h-4 w-4" />
        写新文章
      </NuxtLink>
    </div>

    <div class="flex flex-wrap items-center gap-3">
      <div class="flex flex-wrap items-center gap-1.5">
        <button
          v-for="option in [
            { label: '全部', value: '' },
            { label: '已发布', value: 'published' },
            { label: '草稿', value: 'draft' },
          ]"
          :key="option.value"
          type="button"
          class="cursor-pointer rounded-lg px-3 py-1.5 text-sm transition-colors duration-200"
          :class="
            status === option.value
              ? 'bg-brand-600 font-medium text-white'
              : 'border border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800'
          "
          @click="setStatus(option.value)"
        >
          {{ option.label }}
        </button>
      </div>

      <form class="ml-auto flex items-center gap-2" @submit.prevent="search">
        <input v-model="keyword" type="text" class="field w-48" placeholder="搜索标题或 slug">
        <button type="submit" class="btn btn-ghost shrink-0 px-3" aria-label="搜索">
          <Search class="h-4 w-4" />
        </button>
      </form>
    </div>

    <div
      v-if="selected.length"
      class="flex flex-wrap items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 dark:border-brand-900 dark:bg-brand-900/20"
    >
      <span class="text-sm text-brand-700 dark:text-brand-300">已选择 {{ selected.length }} 篇</span>
      <div class="ml-auto flex flex-wrap items-center gap-2">
        <button type="button" class="btn btn-ghost" :disabled="bulkBusy" @click="runBulk('publish')">
          批量发布
        </button>
        <button type="button" class="btn btn-ghost" :disabled="bulkBusy" @click="runBulk('draft')">
          转为草稿
        </button>
        <button
          type="button"
          class="btn bg-red-600 text-white hover:bg-red-700"
          :disabled="bulkBusy"
          @click="runBulk('delete')"
        >
          批量删除
        </button>
      </div>
    </div>

    <div class="card-surface overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full min-w-170 text-sm">
          <thead>
            <tr class="border-b border-slate-200 text-left text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
              <th class="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  class="h-4 w-4 cursor-pointer accent-brand-600"
                  :checked="allSelected"
                  aria-label="全选本页文章"
                  @change="toggleAll"
                >
              </th>
              <th class="px-5 py-3 font-medium">标题</th>
              <th class="w-24 px-3 py-3 font-medium">状态</th>
              <th class="w-28 px-3 py-3 font-medium">分类</th>
              <th class="w-20 px-3 py-3 font-medium">浏览</th>
              <th class="w-28 px-3 py-3 font-medium">更新时间</th>
              <th class="w-32 px-5 py-3 text-right font-medium">操作</th>
            </tr>
          </thead>

          <tbody class="divide-y divide-slate-200 dark:divide-slate-800">
            <tr
              v-for="post in posts"
              :key="post.id"
              class="transition-colors duration-200 hover:bg-slate-50 dark:hover:bg-slate-800/40"
            >
              <td class="px-4 py-3.5">
                <input
                  type="checkbox"
                  class="h-4 w-4 cursor-pointer accent-brand-600"
                  :checked="selected.includes(post.id)"
                  :aria-label="`选择文章 ${post.title}`"
                  @change="toggleOne(post.id)"
                >
              </td>
              <td class="px-5 py-3.5">
                <NuxtLink
                  :to="`/admin/posts/${post.id}/edit`"
                  class="cursor-pointer font-medium text-slate-800 transition-colors duration-200 hover:text-brand-600 dark:text-slate-200 dark:hover:text-brand-400"
                >
                  {{ post.title }}
                </NuxtLink>
                <p class="mt-0.5 font-mono text-xs text-slate-400">/{{ post.slug }}</p>
              </td>
              <td class="px-3 py-3.5">
                <span class="badge" :class="post.status === 'published' ? 'badge-brand' : ''">
                  {{ post.status === 'published' ? '已发布' : '草稿' }}
                </span>
              </td>
              <td class="px-3 py-3.5 text-slate-500 dark:text-slate-400">
                {{ post.category?.name ?? '—' }}
              </td>
              <td class="px-3 py-3.5 text-slate-500 dark:text-slate-400">{{ post.views }}</td>
              <td class="px-3 py-3.5 text-xs text-slate-500 dark:text-slate-400">
                {{ formatDate(post.updatedAt) }}
              </td>
              <td class="px-5 py-3.5">
                <div class="flex items-center justify-end gap-1">
                  <a
                    :href="`/posts/${post.slug}`"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="cursor-pointer rounded-lg p-2 text-slate-400 transition-colors duration-200 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                    aria-label="查看文章"
                  >
                    <ExternalLink class="h-4 w-4" />
                  </a>
                  <NuxtLink
                    :to="`/admin/posts/${post.id}/edit`"
                    class="cursor-pointer rounded-lg p-2 text-slate-400 transition-colors duration-200 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                    aria-label="编辑文章"
                  >
                    <PenSquare class="h-4 w-4" />
                  </NuxtLink>
                  <button
                    type="button"
                    class="cursor-pointer rounded-lg p-2 text-slate-400 transition-colors duration-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-40 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                    :disabled="deleting === post.id"
                    aria-label="删除文章"
                    @click="remove(post)"
                  >
                    <Trash2 class="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p v-if="!posts.length" class="px-5 py-14 text-center text-sm text-slate-400">
        没有符合条件的文章
      </p>
    </div>

    <PaginationBar :page="page" :total-pages="totalPages" />
  </div>
</template>
