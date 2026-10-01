<script setup lang="ts">
const route = useRoute()
const config = useRuntimeConfig()

useThemeInit()

const siteUrl = String(config.public.siteUrl).replace(/\/$/, '')

// 全站 canonical：后台与 API 不参与索引
const canonicalLinks = computed(() => {
  if (route.path.startsWith('/admin')) return []
  const path = route.path === '/' ? '/' : route.path.replace(/\/$/, '')
  return [{ rel: 'canonical' as const, href: `${siteUrl}${path}` }]
})

useHead({ link: canonicalLinks })
</script>

<template>
  <div>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>

    <!-- 两者都用 Teleport 传送到 body，SSR 不渲染，避免 hydration 节点不匹配 -->
    <ClientOnly>
      <ToastContainer />
      <ConfirmDialog />
    </ClientOnly>
  </div>
</template>
