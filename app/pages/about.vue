<script setup lang="ts">
import { BookOpen, Check, Github, Mail, Rss } from 'lucide-vue-next'

const config = useRuntimeConfig()
const siteName = String(config.public.siteName)

/** 占位联系方式，替换成你自己的地址即可 */
const CONTACT_EMAIL = 'hello@example.com'

const techStack = [
  { label: 'Nuxt 4', detail: '服务端渲染框架' },
  { label: 'TypeScript', detail: '类型安全' },
  { label: 'Tailwind CSS v4', detail: '样式方案' },
  { label: 'Prisma + MySQL', detail: '数据持久化' },
  { label: 'Shiki', detail: '代码高亮' },
]

const links = [
  { label: 'RSS 订阅', href: '/rss.xml', icon: Rss },
  { label: 'GitHub', href: 'https://github.com', icon: Github },
]

const emailCopied = ref(false)
let resetTimer: ReturnType<typeof setTimeout> | null = null

/**
 * 邮箱用「点击复制」而不是 mailto:。
 *
 * mailto: 会触发系统邮件客户端，连续点击时浏览器会把多次协议调用排成队列，
 * 一下子弹出多个客户端窗口。改为复制后，重复点击也只会命中一次。
 */
async function copyEmail() {
  if (emailCopied.value) return

  try {
    await navigator.clipboard.writeText(CONTACT_EMAIL)
    emailCopied.value = true
    if (resetTimer) clearTimeout(resetTimer)
    resetTimer = setTimeout(() => {
      emailCopied.value = false
    }, 2000)
  } catch {
    // 剪贴板不可用（非 HTTPS 或权限受限）时退回 mailto
    window.location.href = `mailto:${CONTACT_EMAIL}`
  }
}

onUnmounted(() => {
  if (resetTimer) clearTimeout(resetTimer)
})

useSeoMeta({
  title: '关于',
  description: `关于 ${siteName} 这个站点`,
})
</script>

<template>
  <div class="page-container pb-24 pt-14 sm:pt-16">
    <header class="mb-12">
      <p class="mono-label">关于本站</p>
      <h1 class="display-title mt-6 text-slate-900 dark:text-slate-50">关于</h1>
    </header>

    <!-- 正文与侧栏非对称分栏：左侧叙述，右侧结构化信息 -->
    <div class="grid gap-12 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div class="prose-blog max-w-2xl">
        <p>
          这里是 <strong>{{ siteName }}</strong>。一个用来沉淀技术笔记与日常思考的地方，
          内容主要围绕前端工程、后端实践与工具使用。
        </p>
        <p>
          写作的原则很简单：只写自己真正实践过、并且能讲清楚的东西。
          如果某篇文章帮你解决了一个具体问题，那它的目的就达到了。
        </p>
      </div>

      <aside class="space-y-12">
        <section>
          <p class="mono-label mb-4">技术栈</p>
          <ul>
            <li
              v-for="item in techStack"
              :key="item.label"
              class="flex items-baseline justify-between gap-4 border-t border-slate-200 py-3 dark:border-slate-800"
            >
              <span class="text-sm font-medium text-slate-900 dark:text-slate-100">
                {{ item.label }}
              </span>
              <span class="shrink-0 text-xs text-slate-500 dark:text-slate-400">
                {{ item.detail }}
              </span>
            </li>
          </ul>
        </section>

        <section>
          <p class="mono-label mb-4">联系方式</p>
          <div class="flex flex-col gap-3">
            <button
              type="button"
              class="mono-label inline-flex cursor-pointer items-center gap-2 text-left transition-colors duration-200 hover:text-brand-600 dark:hover:text-brand-400"
              @click="copyEmail"
            >
              <Check v-if="emailCopied" class="h-3.5 w-3.5 text-brand-600 dark:text-brand-400" />
              <Mail v-else class="h-3.5 w-3.5" />
              {{ emailCopied ? '邮箱已复制' : CONTACT_EMAIL }}
            </button>

            <a
              v-for="item in links"
              :key="item.label"
              :href="item.href"
              target="_blank"
              rel="noopener noreferrer"
              class="mono-label inline-flex cursor-pointer items-center gap-2 transition-colors duration-200 hover:text-brand-600 dark:hover:text-brand-400"
            >
              <component :is="item.icon" class="h-3.5 w-3.5" />
              {{ item.label }}
            </a>

            <NuxtLink
              to="/posts"
              class="mono-label mt-1 inline-flex cursor-pointer items-center gap-2 text-brand-600 transition-colors duration-200 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
            >
              <BookOpen class="h-3.5 w-3.5" />
              去看文章
            </NuxtLink>
          </div>
        </section>
      </aside>
    </div>
  </div>
</template>
