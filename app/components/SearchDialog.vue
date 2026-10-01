<script setup lang="ts">
import { Loader2, Search, X } from 'lucide-vue-next'

interface SearchItem {
  id: number
  title: string
  slug: string
  summary: string
  publishedAt: string
}

const open = defineModel<boolean>({ default: false })

const keyword = ref('')
const results = ref<SearchItem[]>([])
const pending = ref(false)
const searched = ref(false)
const inputRef = ref<HTMLInputElement | null>(null)
const router = useRouter()

let debounceTimer: ReturnType<typeof setTimeout> | null = null
let requestSeq = 0

async function runSearch(value: string) {
  const q = value.trim()
  const seq = ++requestSeq

  if (!q) {
    results.value = []
    searched.value = false
    pending.value = false
    return
  }

  pending.value = true
  try {
    const res = await $fetch<{ items: SearchItem[] }>('/api/search', {
      query: { q, limit: 10 },
    })
    if (seq !== requestSeq) return // 丢弃过期响应
    results.value = res.items
    searched.value = true
  } catch {
    if (seq === requestSeq) results.value = []
  } finally {
    if (seq === requestSeq) pending.value = false
  }
}

function reset() {
  keyword.value = ''
  results.value = []
  searched.value = false
  pending.value = false
  if (debounceTimer) clearTimeout(debounceTimer)
}

function close() {
  open.value = false
  reset()
}

function goTo(slug: string) {
  close()
  router.push(`/posts/${slug}`)
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') close()
}

watch(keyword, (value) => {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => void runSearch(value), 300)
})

watch(open, async (value) => {
  if (value) {
    await nextTick()
    inputRef.value?.focus()
  } else {
    reset()
  }
})

onMounted(() => document.addEventListener('keydown', handleKeydown))

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
  if (debounceTimer) clearTimeout(debounceTimer)
})
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      leave-active-class="transition duration-150 ease-in"
      leave-to-class="opacity-0"
    >
      <div
        v-if="open"
        class="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/40 px-4 pt-[12vh] backdrop-blur-sm"
        @click.self="close"
      >
        <div
          class="w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900"
        >
          <div class="flex items-center gap-3 border-b border-slate-200 px-4 dark:border-slate-800">
            <Search class="h-5 w-5 shrink-0 text-slate-400" />
            <input
              ref="inputRef"
              v-model="keyword"
              type="text"
              class="h-14 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100"
              placeholder="搜索标题或正文内容…"
            >
            <button
              type="button"
              class="cursor-pointer rounded p-1 text-slate-400 transition-colors duration-200 hover:text-slate-600 dark:hover:text-slate-200"
              aria-label="关闭搜索"
              @click="close"
            >
              <X class="h-4 w-4" />
            </button>
          </div>

          <div class="thin-scroll max-h-80 overflow-y-auto p-2">
            <div v-if="pending" class="flex items-center justify-center gap-2 py-8 text-sm text-slate-400">
              <Loader2 class="h-4 w-4 animate-spin" />
              搜索中
            </div>

            <p v-else-if="searched && !results.length" class="py-8 text-center text-sm text-slate-400">
              没有找到匹配的文章
            </p>

            <p v-else-if="!keyword.trim()" class="py-8 text-center text-sm text-slate-400">
              输入关键词开始检索，支持正文全文搜索
            </p>

            <ul v-else class="space-y-1">
              <li v-for="item in results" :key="item.id">
                <button
                  type="button"
                  class="w-full cursor-pointer rounded-lg px-3 py-2.5 text-left transition-colors duration-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                  @click="goTo(item.slug)"
                >
                  <p class="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                    {{ item.title }}
                  </p>
                  <p class="mt-0.5 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">
                    {{ item.summary || '暂无摘要' }}
                  </p>
                </button>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
