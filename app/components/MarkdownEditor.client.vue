<script setup lang="ts">
import { MdEditor } from 'md-editor-v3'
import 'md-editor-v3/lib/style.css'

const model = defineModel<string>({ default: '' })

const props = withDefaults(
  defineProps<{
    height?: string
    placeholder?: string
  }>(),
  {
    height: '560px',
    placeholder: '开始写作吧，支持 Markdown 语法，图片可直接粘贴或拖拽上传…',
  },
)

const { isDark } = useTheme()

const theme = computed(() => (isDark.value ? 'dark' : 'light'))

const notify = ref('')
let notifyTimer: ReturnType<typeof setTimeout> | null = null

function flash(message: string) {
  notify.value = message
  if (notifyTimer) clearTimeout(notifyTimer)
  notifyTimer = setTimeout(() => {
    notify.value = ''
  }, 3000)
}

onUnmounted(() => {
  if (notifyTimer) clearTimeout(notifyTimer)
})

/** 编辑器内粘贴 / 拖拽图片时上传到服务端 */
async function onUploadImg(files: File[], callback: (urls: string[]) => void) {
  const urls: string[] = []

  for (const file of files) {
    const form = new FormData()
    form.append('file', file)

    try {
      const res = await $fetch<{ url: string }>('/api/admin/upload', {
        method: 'POST',
        body: form,
      })
      urls.push(res.url)
    } catch (error: unknown) {
      const err = error as { data?: { statusMessage?: string } }
      flash(err?.data?.statusMessage || `${file.name} 上传失败`)
    }
  }

  callback(urls)
}
</script>

<template>
  <div>
    <p
      v-if="notify"
      class="mb-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:bg-amber-900/20 dark:text-amber-400"
    >
      {{ notify }}
    </p>

    <MdEditor
      v-model="model"
      :theme="theme"
      :style="{ height: props.height }"
      :placeholder="props.placeholder"
      :toolbars-exclude="['github', 'save', 'preview']"
      preview-theme="github"
      code-theme="github"
      language="zh-CN"
      :on-upload-img="onUploadImg"
    />
  </div>
</template>

<style>
.md-editor {
  --md-bk-color: #ffffff;
  border-radius: 0.75rem;
  border-color: var(--color-slate-200);
}

.dark .md-editor {
  border-color: var(--color-slate-800);
}
</style>
