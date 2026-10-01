<script setup lang="ts">
import { EyeOff, MessageSquare, Search, ShieldCheck, Trash2 } from 'lucide-vue-next'

definePageMeta({ layout: 'admin' })

useSeoMeta({ title: '评论管理' })

interface AdminCommentItem {
  id: number
  author: string
  email: string | null
  content: string
  status: string
  parentId: number | null
  ip: string | null
  createdAt: string
  post: { id: number; title: string; slug: string }
}

const route = useRoute()
const router = useRouter()
const { confirm } = useConfirm()
const toast = useToast()

const page = computed(() => Math.max(1, Number(route.query.page) || 1))
const status = computed(() => (typeof route.query.status === 'string' ? route.query.status : ''))
const keyword = ref(typeof route.query.keyword === 'string' ? route.query.keyword : '')

const { data, refresh } = await useFetch<{
  items: AdminCommentItem[]
  total: number
  totalPages: number
}>('/api/admin/comments', {
  query: computed(() => ({
    page: page.value,
    pageSize: 20,
    status: status.value || undefined,
    keyword: keyword.value.trim() || undefined,
  })),
  key: 'admin-comments',
})

const comments = computed(() => data.value?.items ?? [])
const totalPages = computed(() => data.value?.totalPages ?? 1)
const busyId = ref<number | null>(null)

const statusMap: Record<string, { label: string; class: string }> = {
  approved: { label: '已通过', class: 'badge-brand' },
  pending: { label: '待审核', class: '' },
  hidden: { label: '已隐藏', class: '' },
}

const filters = [
  { label: '全部', value: '' },
  { label: '已通过', value: 'approved' },
  { label: '待审核', value: 'pending' },
  { label: '已隐藏', value: 'hidden' },
]

function applyStatus(value: string) {
  router.push({ path: '/admin/comments', query: value ? { status: value } : {} })
}

function search() {
  router.push({
    path: '/admin/comments',
    query: keyword.value.trim() ? { keyword: keyword.value.trim() } : {},
  })
}

async function updateStatus(item: AdminCommentItem, next: string) {
  busyId.value = item.id
  try {
    await $fetch(`/api/admin/comments/${item.id}`, { method: 'PATCH', body: { status: next } })
    toast.success(next === 'approved' ? '评论已通过' : '评论已隐藏')
    await refresh()
  } catch {
    toast.error('操作失败，请重试')
  } finally {
    busyId.value = null
  }
}

async function remove(item: AdminCommentItem) {
  if (!(await confirm(`确定删除 ${item.author} 的这条评论吗？其下的回复会一并删除。`))) return

  busyId.value = item.id
  try {
    await $fetch(`/api/admin/comments/${item.id}`, { method: 'DELETE' })
    toast.success('评论已删除')
    await refresh()
  } catch {
    toast.error('删除失败，请重试')
  } finally {
    busyId.value = null
  }
}

// —— 批量操作 ——
const selected = ref<number[]>([])

const allSelected = computed(
  () => comments.value.length > 0 && selected.value.length === comments.value.length,
)

function toggleAll(event: Event) {
  const checked = (event.target as HTMLInputElement).checked
  selected.value = checked ? comments.value.map((item) => item.id) : []
}

function toggleOne(id: number) {
  selected.value = selected.value.includes(id)
    ? selected.value.filter((item) => item !== id)
    : [...selected.value, id]
}

watch([page, status, keyword], () => {
  selected.value = []
})

const bulkBusy = ref(false)
const bulkLabels: Record<string, string> = {
  delete: '删除',
  approve: '通过',
  hide: '隐藏',
}

async function runBulk(action: 'delete' | 'approve' | 'hide') {
  if (!selected.value.length) return

  if (
    action === 'delete' &&
    !(await confirm(`确定删除选中的 ${selected.value.length} 条评论吗？其下的回复会一并删除。`))
  ) {
    return
  }

  bulkBusy.value = true
  try {
    const res = await $fetch<{ affected: number }>('/api/admin/comments/bulk', {
      method: 'POST',
      body: { action, ids: selected.value },
    })
    toast.success(`已${bulkLabels[action]} ${res.affected} 条评论`)
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
        <h1 class="text-xl font-semibold text-slate-900 dark:text-slate-100">评论管理</h1>
        <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">共 {{ data?.total ?? 0 }} 条</p>
      </div>
    </div>

    <div class="flex flex-wrap items-center gap-3">
      <div class="flex flex-wrap items-center gap-1.5">
        <button
          v-for="option in filters"
          :key="option.value"
          type="button"
          class="cursor-pointer rounded-lg px-3 py-1.5 text-sm transition-colors duration-200"
          :class="
            status === option.value
              ? 'bg-brand-600 font-medium text-white'
              : 'border border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800'
          "
          @click="applyStatus(option.value)"
        >
          {{ option.label }}
        </button>
      </div>

      <form class="ml-auto flex items-center gap-2" @submit.prevent="search">
        <input v-model="keyword" type="text" class="field w-48" placeholder="搜索昵称或内容">
        <button type="submit" class="btn btn-ghost shrink-0 px-3" aria-label="搜索">
          <Search class="h-4 w-4" />
        </button>
      </form>
    </div>

    <div
      v-if="comments.length"
      class="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2.5 dark:border-slate-800 dark:bg-slate-900"
    >
      <label class="flex cursor-pointer items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
        <input
          type="checkbox"
          class="h-4 w-4 cursor-pointer accent-brand-600"
          :checked="allSelected"
          @change="toggleAll"
        >
        全选本页
      </label>

      <div v-if="selected.length" class="ml-auto flex flex-wrap items-center gap-2">
        <span class="text-sm text-slate-500 dark:text-slate-400">已选 {{ selected.length }} 条</span>
        <button type="button" class="btn btn-ghost" :disabled="bulkBusy" @click="runBulk('approve')">
          批量通过
        </button>
        <button type="button" class="btn btn-ghost" :disabled="bulkBusy" @click="runBulk('hide')">
          批量隐藏
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

    <ul v-if="comments.length" v-auto-animate="{ duration: 260, easing: 'ease-out' }" class="space-y-3">
      <li v-for="item in comments" :key="item.id" class="card-surface p-5">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <input
                type="checkbox"
                class="h-4 w-4 cursor-pointer accent-brand-600"
                :checked="selected.includes(item.id)"
                :aria-label="`选择 ${item.author} 的评论`"
                @change="toggleOne(item.id)"
              >
              <span class="text-sm font-medium text-slate-900 dark:text-slate-100">{{ item.author }}</span>
              <span class="badge" :class="statusMap[item.status]?.class ?? ''">
                {{ statusMap[item.status]?.label ?? item.status }}
              </span>
              <span v-if="item.parentId" class="badge">回复</span>
              <span v-if="item.email" class="text-xs text-slate-400">{{ item.email }}</span>
            </div>

            <p class="mt-2 whitespace-pre-wrap wrap-break-word text-sm leading-relaxed text-slate-700 dark:text-slate-300">
              {{ item.content }}
            </p>

            <div class="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
              <NuxtLink
                :to="`/posts/${item.post.slug}`"
                target="_blank"
                class="cursor-pointer transition-colors duration-200 hover:text-brand-600"
              >
                {{ item.post.title }}
              </NuxtLink>
              <span>{{ formatDate(item.createdAt, true) }}</span>
              <span v-if="item.ip" class="font-mono">{{ item.ip }}</span>
            </div>
          </div>

          <div class="flex shrink-0 items-center gap-1">
            <button
              v-if="item.status !== 'approved'"
              type="button"
              class="cursor-pointer rounded-lg p-2 text-slate-400 transition-colors duration-200 hover:bg-emerald-50 hover:text-emerald-600 disabled:opacity-40 dark:hover:bg-emerald-900/20 dark:hover:text-emerald-400"
              :disabled="busyId === item.id"
              aria-label="通过该评论"
              @click="updateStatus(item, 'approved')"
            >
              <ShieldCheck class="h-4 w-4" />
            </button>
            <button
              v-if="item.status !== 'hidden'"
              type="button"
              class="cursor-pointer rounded-lg p-2 text-slate-400 transition-colors duration-200 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              :disabled="busyId === item.id"
              aria-label="隐藏该评论"
              @click="updateStatus(item, 'hidden')"
            >
              <EyeOff class="h-4 w-4" />
            </button>
            <button
              type="button"
              class="cursor-pointer rounded-lg p-2 text-slate-400 transition-colors duration-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-40 dark:hover:bg-red-900/20 dark:hover:text-red-400"
              :disabled="busyId === item.id"
              aria-label="删除该评论"
              @click="remove(item)"
            >
              <Trash2 class="h-4 w-4" />
            </button>
          </div>
        </div>
      </li>
    </ul>

    <div v-else class="card-surface flex flex-col items-center gap-3 p-14 text-center">
      <MessageSquare class="h-8 w-8 text-slate-300 dark:text-slate-600" />
      <p class="text-sm text-slate-400">暂无评论</p>
    </div>

    <PaginationBar :page="page" :total-pages="totalPages" />
  </div>
</template>
