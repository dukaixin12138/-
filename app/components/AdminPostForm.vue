<script setup lang="ts">
import { AlertCircle, Loader2, Plus, Save, Send, Trash2, Upload, X } from 'lucide-vue-next'

interface AdminPostDetail {
  id: number
  title: string
  slug: string
  summary: string | null
  content: string
  cover: string | null
  status: string
  featured: boolean
  categoryId: number | null
  publishedAt: string | null
  category: { id: number; name: string } | null
  tags: Array<{ id: number; name: string }>
}

const props = defineProps<{ postId?: number }>()

const router = useRouter()
const { confirm } = useConfirm()
const toast = useToast()

/** 新建文章在首次自动保存后会拿到真实 id，之后统一以它为准 */
const currentPostId = ref<number | null>(props.postId ?? null)
const isEdit = computed(() => currentPostId.value !== null)

const form = reactive({
  title: '',
  slug: '',
  summary: '',
  content: '',
  cover: '',
  status: 'draft',
  featured: false,
  categoryId: null as number | null,
  categoryName: '',
  tags: [] as string[],
  /** datetime-local 输入值，留空表示立即发布 */
  publishedAt: '',
})

const loading = ref(false)
const saving = ref(false)
const errorMessage = ref('')
const tagInput = ref('')

// —— 草稿自动保存 ——
const autoSaveState = ref<'idle' | 'saving' | 'saved' | 'error'>('idle')
const lastSavedAt = ref('')
let autoSaveTimer: ReturnType<typeof setTimeout> | null = null
let lastSnapshot = ''

/** 表单内容快照：只有内容真的变化过才触发自动保存，避免初始化时误触发 */
function takeSnapshot() {
  return JSON.stringify([
    form.title,
    form.summary,
    form.content,
    form.cover,
    form.slug,
    form.status,
    form.featured,
    form.categoryId,
    form.categoryName,
    form.publishedAt,
    form.tags,
  ])
}

/** ISO 字符串 → datetime-local 输入值（浏览器本地时区） */
function toDateTimeLocal(iso: string | null | undefined): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** datetime-local 输入值 → ISO 字符串（UTC） */
function toIsoString(local: string): string | null {
  if (!local) return null
  const date = new Date(local)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

const { data: taxonomy } = await useFetch<{
  categories: Array<{ id: number; name: string; slug: string; count: number }>
  tags: Array<{ id: number; name: string; slug: string; count: number }>
}>('/api/taxonomy', { key: 'admin-taxonomy' })

if (props.postId) {
  const { data, error } = await useFetch<{ post: AdminPostDetail }>(
    `/api/admin/posts/${props.postId}`,
    { key: `admin-post-${props.postId}` },
  )

  if (error.value || !data.value?.post) {
    throw createError({ statusCode: 404, statusMessage: '文章不存在', fatal: true })
  }

  const post = data.value.post
  form.title = post.title
  form.slug = post.slug
  form.summary = post.summary ?? ''
  form.content = post.content
  form.cover = post.cover ?? ''
  form.status = post.status
  form.featured = post.featured
  form.categoryId = post.categoryId
  form.tags = post.tags.map((tag) => tag.name)
  form.publishedAt = toDateTimeLocal(post.publishedAt)
}

lastSnapshot = takeSnapshot()

function addTag(name: string) {
  const value = name.trim()
  if (!value || form.tags.includes(value)) return
  form.tags.push(value)
  tagInput.value = ''
}

function removeTag(name: string) {
  form.tags = form.tags.filter((tag) => tag !== name)
}

function handleTagKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' || event.key === ',') {
    event.preventDefault()
    addTag(tagInput.value)
  }
}

function handleTitleBlur() {
  if (form.title && !form.slug) {
    form.slug = form.title
      .trim()
      .toLowerCase()
      .replace(/[^\w\u4e00-\u9fa5\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
  }
}

function buildPayload() {
  return {
    title: form.title.trim(),
    slug: form.slug.trim(),
    summary: form.summary.trim(),
    content: form.content,
    cover: form.cover.trim(),
    status: form.status,
    featured: form.featured,
    categoryId: form.categoryId,
    categoryName: form.categoryName.trim(),
    tags: form.tags,
    publishedAt: toIsoString(form.publishedAt),
  }
}

/** 新建或更新，返回文章 id；手动保存与自动保存共用 */
async function persist(): Promise<number> {
  const body = buildPayload()

  if (currentPostId.value) {
    await $fetch(`/api/admin/posts/${currentPostId.value}`, { method: 'PUT', body })
    return currentPostId.value
  }

  const res = await $fetch<{ post: { id: number } }>('/api/admin/posts', {
    method: 'POST',
    body,
  })
  currentPostId.value = res.post.id
  return res.post.id
}

async function submit(status?: 'draft' | 'published') {
  errorMessage.value = ''

  if (status) form.status = status
  if (!form.title.trim()) {
    errorMessage.value = '请填写标题'
    return
  }
  if (!form.content.trim()) {
    errorMessage.value = '请填写正文内容'
    return
  }

  if (autoSaveTimer) clearTimeout(autoSaveTimer)
  saving.value = true
  try {
    await persist()
    lastSnapshot = takeSnapshot()
    await router.push('/admin/posts')
  } catch (error: unknown) {
    const err = error as { statusMessage?: string; data?: { statusMessage?: string } }
    errorMessage.value = err?.data?.statusMessage || err?.statusMessage || '保存失败，请重试'
  } finally {
    saving.value = false
  }
}

/** 防抖自动保存：仅在内容确有变化、且标题与正文都非空时执行 */
async function autoSave() {
  if (saving.value) return
  if (takeSnapshot() === lastSnapshot) return
  if (!form.title.trim() || !form.content.trim()) return

  autoSaveState.value = 'saving'
  try {
    await persist()
    lastSnapshot = takeSnapshot()
    lastSavedAt.value = formatDateTime(new Date())
    autoSaveState.value = 'saved'
  } catch {
    autoSaveState.value = 'error'
  }
}

watch(
  () => takeSnapshot(),
  () => {
    if (saving.value) return
    autoSaveState.value = 'idle'
    if (autoSaveTimer) clearTimeout(autoSaveTimer)
    autoSaveTimer = setTimeout(() => void autoSave(), 3000)
  },
)

onUnmounted(() => {
  if (autoSaveTimer) clearTimeout(autoSaveTimer)
})

async function remove() {
  if (!currentPostId.value) return
  if (!(await confirm('确定要删除这篇文章吗？该操作不可恢复。'))) return

  loading.value = true
  try {
    await $fetch(`/api/admin/posts/${currentPostId.value}`, { method: 'DELETE' })
    toast.success('文章已删除')
    await router.push('/admin/posts')
  } catch {
    errorMessage.value = '删除失败，请重试'
    toast.error('删除失败，请重试')
  } finally {
    loading.value = false
  }
}

const uploadingCover = ref(false)

async function uploadCover(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  uploadingCover.value = true
  errorMessage.value = ''

  try {
    const body = new FormData()
    body.append('file', file)
    const res = await $fetch<{ url: string }>('/api/admin/upload', { method: 'POST', body })
    form.cover = res.url
  } catch (error: unknown) {
    const err = error as { data?: { statusMessage?: string }; statusMessage?: string }
    errorMessage.value = err?.data?.statusMessage || err?.statusMessage || '封面上传失败'
  } finally {
    uploadingCover.value = false
    input.value = ''
  }
}
</script>

<template>
  <form class="space-y-5" @submit.prevent="submit()">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h1 class="text-xl font-semibold text-slate-900 dark:text-slate-100">
        {{ isEdit ? '编辑文章' : '写新文章' }}
      </h1>

      <div class="flex flex-wrap items-center gap-2">
        <span
          v-if="autoSaveState === 'saving'"
          class="inline-flex items-center gap-1.5 text-xs text-slate-400"
        >
          <Loader2 class="h-3.5 w-3.5 animate-spin" />
          自动保存中
        </span>
        <span
          v-else-if="autoSaveState === 'saved'"
          class="text-xs text-emerald-600 dark:text-emerald-400"
        >
          已自动保存 {{ lastSavedAt }}
        </span>
        <span v-else-if="autoSaveState === 'error'" class="text-xs text-red-500">
          自动保存失败
        </span>

        <NuxtLink to="/admin/posts" class="btn btn-ghost">返回列表</NuxtLink>

        <button
          v-if="isEdit"
          type="button"
          class="btn btn-ghost text-red-600 dark:text-red-400"
          :disabled="loading"
          @click="remove"
        >
          <Trash2 class="h-4 w-4" />
          删除
        </button>

        <button type="button" class="btn btn-ghost" :disabled="saving" @click="submit('draft')">
          <Save class="h-4 w-4" />
          存为草稿
        </button>

        <button type="submit" class="btn btn-primary" :disabled="saving" @click="submit('published')">
          <Loader2 v-if="saving" class="h-4 w-4 animate-spin" />
          <Send v-else class="h-4 w-4" />
          发布
        </button>
      </div>
    </div>

    <p
      v-if="errorMessage"
      class="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400"
    >
      <AlertCircle class="h-4 w-4 shrink-0" />
      {{ errorMessage }}
    </p>

    <div class="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div class="space-y-5">
        <div class="card-surface space-y-4 p-5">
          <div>
            <label for="post-title" class="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              标题
            </label>
            <input
              id="post-title"
              v-model="form.title"
              type="text"
              class="field"
              placeholder="给文章起一个清晰的标题"
              @blur="handleTitleBlur"
            >
          </div>

          <div>
            <label for="post-slug" class="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              链接标识（slug）
            </label>
            <input
              id="post-slug"
              v-model="form.slug"
              type="text"
              class="field font-mono text-sm"
              placeholder="留空则根据标题自动生成"
            >
            <p class="mt-1.5 text-xs text-slate-400">最终地址：/posts/{{ form.slug || 'your-slug' }}</p>
          </div>

          <div>
            <label for="post-summary" class="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              摘要
            </label>
            <textarea
              id="post-summary"
              v-model="form.summary"
              rows="3"
              class="field resize-y"
              placeholder="一两句话概括文章内容，用于列表与搜索结果"
            />
          </div>
        </div>

        <div class="card-surface p-5">
          <label class="mb-2.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
            正文（Markdown）
          </label>

          <ClientOnly>
            <MarkdownEditor v-model="form.content" />
            <template #fallback>
              <div
                class="flex h-140 items-center justify-center rounded-xl border border-slate-200 text-sm text-slate-400 dark:border-slate-800"
              >
                编辑器加载中…
              </div>
            </template>
          </ClientOnly>
        </div>
      </div>

      <aside class="space-y-5">
        <div class="card-surface space-y-4 p-5">
          <p class="text-sm font-medium text-slate-700 dark:text-slate-300">发布设置</p>

          <div>
            <label for="post-status" class="mb-1.5 block text-xs text-slate-500 dark:text-slate-400">
              状态
            </label>
            <select id="post-status" v-model="form.status" class="field">
              <option value="draft">草稿</option>
              <option value="published">已发布</option>
            </select>
          </div>

          <label class="flex cursor-pointer items-center gap-2.5 text-sm text-slate-700 dark:text-slate-300">
            <input
              v-model="form.featured"
              type="checkbox"
              class="h-4 w-4 cursor-pointer rounded border-slate-300 accent-brand-600"
            >
            设为置顶推荐
          </label>

          <div>
            <label for="post-published" class="mb-1.5 block text-xs text-slate-500 dark:text-slate-400">
              发布时间
            </label>
            <input
              id="post-published"
              v-model="form.publishedAt"
              type="datetime-local"
              class="field"
            >
            <p class="mt-1.5 text-xs text-slate-400">
              留空则保存后立即发布，填未来时间即为定时发布
            </p>
          </div>
        </div>

        <div class="card-surface space-y-4 p-5">
          <p class="text-sm font-medium text-slate-700 dark:text-slate-300">分类</p>

          <select v-model="form.categoryId" class="field">
            <option :value="null">未分类</option>
            <option v-for="item in taxonomy?.categories ?? []" :key="item.id" :value="item.id">
              {{ item.name }}
            </option>
          </select>

          <div>
            <label for="post-category" class="mb-1.5 block text-xs text-slate-500 dark:text-slate-400">
              或新建分类
            </label>
            <input
              id="post-category"
              v-model="form.categoryName"
              type="text"
              class="field"
              placeholder="留空则不创建"
            >
          </div>
        </div>

        <div class="card-surface space-y-3 p-5">
          <p class="text-sm font-medium text-slate-700 dark:text-slate-300">标签</p>

          <div v-if="form.tags.length" class="flex flex-wrap gap-1.5">
            <span
              v-for="tag in form.tags"
              :key="tag"
              class="badge badge-brand gap-1 pr-1.5"
            >
              {{ tag }}
              <button
                type="button"
                class="cursor-pointer rounded p-0.5 transition-colors duration-200 hover:text-red-600"
                :aria-label="`移除标签 ${tag}`"
                @click="removeTag(tag)"
              >
                <X class="h-3 w-3" />
              </button>
            </span>
          </div>

          <div class="flex gap-2">
            <input
              v-model="tagInput"
              type="text"
              class="field"
              placeholder="输入后回车添加"
              @keydown="handleTagKeydown"
            >
            <button
              type="button"
              class="btn btn-ghost shrink-0 px-3"
              aria-label="添加标签"
              @click="addTag(tagInput)"
            >
              <Plus class="h-4 w-4" />
            </button>
          </div>

          <div v-if="taxonomy?.tags.length" class="flex flex-wrap gap-1.5 pt-1">
            <button
              v-for="item in taxonomy.tags"
              :key="item.id"
              type="button"
              class="cursor-pointer rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-500 transition-colors duration-200 hover:bg-slate-200 disabled:opacity-40 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
              :disabled="form.tags.includes(item.name)"
              @click="addTag(item.name)"
            >
              + {{ item.name }}
            </button>
          </div>
        </div>

        <div class="card-surface space-y-4 p-5">
          <div>
            <label for="post-cover" class="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              封面图
            </label>
            <div class="flex gap-2">
              <input
                id="post-cover"
                v-model="form.cover"
                type="text"
                class="field"
                placeholder="图片地址，或点右侧上传"
              >
              <label
                class="btn btn-ghost shrink-0 cursor-pointer px-3"
                :class="{ 'pointer-events-none opacity-50': uploadingCover }"
              >
                <Loader2 v-if="uploadingCover" class="h-4 w-4 animate-spin" />
                <Upload v-else class="h-4 w-4" />
                <input type="file" accept="image/*" class="hidden" @change="uploadCover">
              </label>
            </div>
            <p class="mt-1.5 text-xs text-slate-400">支持 jpg / png / gif / webp / avif，最大 5MB</p>
          </div>

          <img
            v-if="form.cover"
            :src="form.cover"
            alt="封面预览"
            class="w-full rounded-lg border border-slate-200 object-cover dark:border-slate-800"
          >
        </div>
      </aside>
    </div>
  </form>
</template>
