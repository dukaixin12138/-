<script setup lang="ts">
import {
  PhArchive,
  PhArticle,
  PhFolders,
  PhHouse,
  PhInfo,
  PhMagnifyingGlass,
  PhTag,
} from '@phosphor-icons/vue'

const config = useRuntimeConfig()
const route = useRoute()

const siteName = computed(() => String(config.public.siteName))
const initial = computed(() => siteName.value.slice(0, 1) || 'B')

/*
 * 图标统一用 Phosphor：它的 weight 属性支持在 regular / bold / fill 间切换，
 * 因此可以做「未选中描边、选中填充」—— 主流侧边栏（Notion / Linear 等）的通行做法，
 * 比清一色的线性图标更有层次。title 用于鼠标悬停提示。
 */
const navItems = [
  { label: '首页', to: '/', icon: PhHouse, title: '返回首页' },
  { label: '文章', to: '/posts', icon: PhArticle, title: '浏览全部文章' },
  { label: '分类', to: '/categories', icon: PhFolders, title: '按分类浏览文章' },
  { label: '标签', to: '/tags', icon: PhTag, title: '按标签浏览文章' },
  { label: '归档', to: '/archive', icon: PhArchive, title: '按时间线浏览全部文章' },
  { label: '关于', to: '/about', icon: PhInfo, title: '关于本站' },
]

const searchOpen = ref(false)

function isActive(to: string) {
  if (to === '/') return route.path === '/'
  return route.path.startsWith(to)
}

function handleKeydown(event: KeyboardEvent) {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault()
    searchOpen.value = true
  }
}

onMounted(() => window.addEventListener('keydown', handleKeydown))
onUnmounted(() => window.removeEventListener('keydown', handleKeydown))
</script>

<template>
  <!-- 桌面端：左侧固定 rail，取代传统的顶部导航栏 -->
  <aside class="site-rail" aria-label="站点导航">
    <NuxtLink
      to="/"
      title="返回首页"
      class="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl bg-slate-900 text-base font-semibold text-white transition-colors duration-200 hover:bg-brand-600 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-brand-500"
      :aria-label="siteName"
    >
      {{ initial }}
    </NuxtLink>

    <nav class="flex flex-col items-center gap-1">
      <NuxtLink
        v-for="item in navItems"
        :key="item.to"
        :to="item.to"
        :title="item.title"
        class="rail-link cursor-pointer"
        :class="
          isActive(item.to)
            ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300'
            : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100'
        "
      >
        <component
          :is="item.icon"
          :size="20"
          :weight="isActive(item.to) ? 'fill' : 'regular'"
        />
        <span>{{ item.label }}</span>
      </NuxtLink>
    </nav>

    <!--
      底部只保留全局工具。
      RSS 入口曾在这里常驻，但全站同时还有页脚、文章底部等多处订阅入口，
      常驻可见的那一个最显眼也最冗余，因此移除，订阅统一收敛到页脚。
    -->
    <div class="flex flex-col items-center gap-1.5">
      <button
        type="button"
        title="搜索文章（Ctrl + K）"
        class="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-slate-500 transition-colors duration-200 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
        aria-label="搜索文章"
        @click="searchOpen = true"
      >
        <PhMagnifyingGlass :size="19" />
      </button>

      <TextColorPicker placement="side" />
      <BackgroundThemePicker placement="side" />
      <ThemeToggle />
    </div>
  </aside>

  <!-- 移动端：顶部极简条 -->
  <header
    class="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur-md lg:hidden dark:border-slate-800 dark:bg-slate-950/90"
  >
    <div class="flex h-14 items-center justify-between gap-3 px-5">
      <NuxtLink
        to="/"
        title="返回首页"
        class="text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-100"
      >
        {{ siteName }}
      </NuxtLink>

      <div class="flex items-center gap-1">
        <button
          type="button"
          title="搜索文章"
          class="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-slate-600 transition-colors duration-200 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          aria-label="搜索文章"
          @click="searchOpen = true"
        >
          <PhMagnifyingGlass :size="19" />
        </button>
        <TextColorPicker />
        <BackgroundThemePicker />
        <ThemeToggle />
      </div>
    </div>
  </header>

  <!-- 移动端：底部导航，比汉堡菜单更贴合单手持机习惯 -->
  <nav class="mobile-dock lg:hidden" aria-label="移动端导航">
    <div class="flex items-stretch justify-around px-2 py-1.5">
      <NuxtLink
        v-for="item in navItems"
        :key="item.to"
        :to="item.to"
        :title="item.title"
        class="flex flex-1 cursor-pointer flex-col items-center gap-1 rounded-lg py-1.5 text-[10px] font-medium transition-colors duration-200"
        :class="
          isActive(item.to) ? 'text-brand-600 dark:text-brand-400' : 'text-slate-500 dark:text-slate-400'
        "
      >
        <component
          :is="item.icon"
          :size="22"
          :weight="isActive(item.to) ? 'fill' : 'regular'"
        />
        <span>{{ item.label }}</span>
      </NuxtLink>
    </div>
  </nav>

  <SearchDialog v-model="searchOpen" />
</template>
