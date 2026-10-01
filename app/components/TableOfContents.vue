<script setup lang="ts">
interface TocEntry {
  id: string
  text: string
  level: number
}

const props = defineProps<{ items: TocEntry[] }>()

const activeId = ref('')
const containerRef = ref<HTMLElement | null>(null)
const linkRefs = new Map<string, HTMLAnchorElement>()

let headings: HTMLElement[] = []
let ticking = false
let resizeObserver: ResizeObserver | null = null

function resolveHeadings() {
  headings = props.items
    .map((item) => document.getElementById(item.id))
    .filter((el): el is HTMLElement => Boolean(el))
}

/**
 * 用滚动位置计算当前章节，而不是 IntersectionObserver。
 *
 * observer 只在元素「进出观察区」时回调，entries 里没有当前全部可见标题的信息，
 * 快速滚动容易漏判；同一屏压着多个标题时也很难稳定地取到最上面那个。
 * 直接比较各标题到视口顶部的距离更可靠。
 */
function updateActive() {
  ticking = false
  if (!headings.length) return

  // 高亮应反映「已经读到哪里」，所以取最后一个越过视口顶部的标题
  const threshold = 96
  let current = headings[0]!

  for (const heading of headings) {
    if (heading.getBoundingClientRect().top <= threshold) current = heading
    else break
  }

  // 滚到页面底部时，最后几个标题可能都没越过阈值，直接兜底到最后一项
  const doc = document.documentElement
  if (window.innerHeight + window.scrollY >= doc.scrollHeight - 2) {
    current = headings[headings.length - 1]!
  }

  activeId.value = current.id
}

function onScroll() {
  if (ticking) return
  ticking = true
  requestAnimationFrame(updateActive)
}

/**
 * 把高亮项滚入目录自身的可视区。
 * 只调整目录容器的 scrollTop，不能用 scrollIntoView —— 那会连带滚动整个页面。
 */
function revealActive() {
  const container = containerRef.value
  const link = linkRefs.get(activeId.value)
  if (!container || !link) return

  const linkTop = link.offsetTop
  const linkBottom = linkTop + link.offsetHeight
  const viewTop = container.scrollTop
  const viewBottom = viewTop + container.clientHeight

  if (linkTop < viewTop) {
    container.scrollTop = linkTop - 8
  } else if (linkBottom > viewBottom) {
    container.scrollTop = linkBottom - container.clientHeight + 8
  }
}

watch(activeId, () => void nextTick(revealActive))

/*
 * 从一篇文章切到另一篇（如点「下一篇」）时路由参数变化，Vue 会复用同一个页面组件实例，
 * onMounted 不会重跑。若不在此重新解析，目录高亮会停留在上一篇文章的锚点上。
 */
watch(
  () => props.items,
  () => {
    void nextTick(() => {
      resolveHeadings()
      updateActive()
    })
  },
)

onMounted(() => {
  resolveHeadings()
  updateActive()

  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', onScroll, { passive: true })

  // 正文图片加载完会改变高度，锚点位置随之变化，需要重算
  resizeObserver = new ResizeObserver(onScroll)
  resizeObserver.observe(document.body)
})

onUnmounted(() => {
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('resize', onScroll)
  resizeObserver?.disconnect()
  linkRefs.clear()
})
</script>

<template>
  <nav v-if="items.length" class="text-sm" aria-label="文章目录">
    <p class="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">目录</p>

    <!--
      长目录必须限制高度并允许内部滚动：
      外层虽然是 sticky，但 sticky 元素一旦高过视口就粘不住，
      滚动时会连同目录一起离开视野。
    -->
    <ul
      ref="containerRef"
      class="toc-scroll max-h-[calc(100vh-8rem)] space-y-1.5 overflow-y-auto overscroll-contain border-l border-slate-200 dark:border-slate-800"
    >
      <li v-for="item in items" :key="item.id">
        <a
          :ref="(el) => { if (el) linkRefs.set(item.id, el as HTMLAnchorElement) }"
          :href="`#${item.id}`"
          :title="item.text"
          class="block cursor-pointer border-l-2 py-1 leading-snug transition-colors duration-200"
          :class="[
            item.level === 3 ? 'pl-6' : item.level === 4 ? 'pl-9' : 'pl-3',
            activeId === item.id
              ? 'border-brand-500 font-medium text-brand-600 dark:text-brand-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200',
          ]"
        >
          {{ item.text }}
        </a>
      </li>
    </ul>
  </nav>
</template>
