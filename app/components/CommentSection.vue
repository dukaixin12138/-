<script setup lang="ts">
import { AlertCircle, CheckCircle2, Loader2, MessageSquare, Reply, Send, X } from 'lucide-vue-next'

interface CommentItem {
  id: number
  author: string
  content: string
  createdAt: string
  isAuthor: boolean
  replies: CommentItem[]
}

const props = defineProps<{ slug: string }>()

const { data, refresh } = await useFetch<{ items: CommentItem[]; total: number }>(
  () => `/api/posts/${props.slug}/comments`,
  {
    key: `comments-${props.slug}`,
    default: () => ({ items: [] as CommentItem[], total: 0 }),
  },
)

const comments = computed(() => data.value?.items ?? [])
const total = computed(() => data.value?.total ?? 0)

const form = reactive({ author: '', email: '', content: '' })
const submitting = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const replyTo = ref<CommentItem | null>(null)

// 记住访客信息，减少重复输入
onMounted(() => {
  try {
    form.author = localStorage.getItem('comment-author') ?? ''
    form.email = localStorage.getItem('comment-email') ?? ''
  } catch {
    // 隐私模式下忽略
  }
})

function startReply(item: CommentItem) {
  replyTo.value = item
  errorMessage.value = ''
  nextTick(() => {
    document.getElementById('comment-content')?.focus()
  })
}

function cancelReply() {
  replyTo.value = null
}

async function submit() {
  errorMessage.value = ''
  successMessage.value = ''

  const author = form.author.trim()
  const content = form.content.trim()

  if (!author) {
    errorMessage.value = '请填写昵称'
    return
  }
  if (author.length > 50) {
    errorMessage.value = '昵称不能超过 50 个字符'
    return
  }
  if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    errorMessage.value = '邮箱格式不正确'
    return
  }
  if (content.length < 2) {
    errorMessage.value = '评论内容至少 2 个字符'
    return
  }
  if (content.length > 1000) {
    errorMessage.value = '评论内容不能超过 1000 个字符'
    return
  }

  submitting.value = true
  try {
    await $fetch('/api/comments', {
      method: 'POST',
      body: {
        postSlug: props.slug,
        author,
        email: form.email.trim(),
        content,
        parentId: replyTo.value?.id ?? null,
      },
    })

    try {
      localStorage.setItem('comment-author', author)
      localStorage.setItem('comment-email', form.email.trim())
    } catch {
      // 忽略
    }

    form.content = ''
    replyTo.value = null
    successMessage.value = '评论已发布'
    await refresh()
  } catch (error: unknown) {
    const err = error as { statusMessage?: string; data?: { statusMessage?: string } }
    errorMessage.value = err?.data?.statusMessage || err?.statusMessage || '提交失败，请稍后重试'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <section id="comments" class="mx-auto max-w-3xl scroll-mt-24">
    <h2 class="mb-6 flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
      <MessageSquare class="h-5 w-5 text-slate-400" />
      评论
      <span class="text-sm font-normal text-slate-400">{{ total }}</span>
    </h2>

    <!-- 提交表单 -->
    <form class="card-surface space-y-3 p-5" @submit.prevent="submit">
      <div
        v-if="replyTo"
        class="flex items-center justify-between gap-2 rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-700 dark:bg-brand-900/20 dark:text-brand-300"
      >
        <span class="truncate">正在回复 {{ replyTo.author }}</span>
        <button
          type="button"
          class="shrink-0 cursor-pointer rounded p-0.5 transition-colors duration-200 hover:text-red-600"
          aria-label="取消回复"
          @click="cancelReply"
        >
          <X class="h-3.5 w-3.5" />
        </button>
      </div>

      <div class="grid gap-3 sm:grid-cols-2">
        <input
          v-model="form.author"
          type="text"
          class="field"
          placeholder="昵称（必填）"
          maxlength="50"
          aria-label="昵称"
        >
        <input
          v-model="form.email"
          type="email"
          class="field"
          placeholder="邮箱（可选，不公开）"
          aria-label="邮箱"
        >
      </div>

      <textarea
        id="comment-content"
        v-model="form.content"
        rows="4"
        class="field resize-y"
        placeholder="说点什么…（支持换行）"
        maxlength="1000"
        aria-label="评论内容"
      />

      <div class="flex flex-wrap items-center justify-between gap-3">
        <span class="text-xs text-slate-400">{{ form.content.length }} / 1000</span>

        <button type="submit" class="btn btn-primary" :disabled="submitting">
          <Loader2 v-if="submitting" class="h-4 w-4 animate-spin" />
          <Send v-else class="h-4 w-4" />
          {{ submitting ? '提交中…' : '发表评论' }}
        </button>
      </div>

      <p
        v-if="errorMessage"
        class="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400"
      >
        <AlertCircle class="h-4 w-4 shrink-0" />
        {{ errorMessage }}
      </p>

      <p
        v-if="successMessage"
        class="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400"
      >
        <CheckCircle2 class="h-4 w-4 shrink-0" />
        {{ successMessage }}
      </p>
    </form>

    <!-- 评论列表 -->
    <ul v-if="comments.length" v-auto-animate="{ duration: 280, easing: 'ease-out' }" class="mt-6 space-y-4">
      <li
        v-for="item in comments"
        :key="item.id"
        class="card-surface p-5"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="flex items-center gap-2.5">
            <span
              class="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300"
            >
              {{ item.author.slice(0, 1).toUpperCase() }}
            </span>
            <div>
              <p class="text-sm font-medium text-slate-900 dark:text-slate-100">
                {{ item.author }}
                <span v-if="item.isAuthor" class="badge badge-brand ml-1.5 py-0 text-[10px]">博主</span>
              </p>
              <p class="text-xs text-slate-400">{{ formatDate(item.createdAt, true) }}</p>
            </div>
          </div>

          <button
            type="button"
            class="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-lg px-2 py-1 text-xs text-slate-400 transition-colors duration-200 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            @click="startReply(item)"
          >
            <Reply class="h-3.5 w-3.5" />
            回复
          </button>
        </div>

        <p class="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          {{ item.content }}
        </p>

        <ul
          v-if="item.replies.length"
          v-auto-animate="{ duration: 240, easing: 'ease-out' }"
          class="mt-4 space-y-3 border-l-2 border-slate-100 pl-4 dark:border-slate-800"
        >
          <li v-for="reply in item.replies" :key="reply.id">
            <div class="flex items-center gap-2">
              <p class="text-sm font-medium text-slate-900 dark:text-slate-100">
                {{ reply.author }}
                <span v-if="reply.isAuthor" class="badge badge-brand ml-1.5 py-0 text-[10px]">博主</span>
              </p>
              <span class="text-xs text-slate-400">{{ formatDate(reply.createdAt, true) }}</span>
            </div>
            <p class="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-slate-700 dark:text-slate-300">
              {{ reply.content }}
            </p>
          </li>
        </ul>
      </li>
    </ul>

    <p v-else class="card-surface mt-6 p-8 text-center text-sm text-slate-400">
      还没有评论，来说第一句吧。
    </p>
  </section>
</template>
