<template>
  <div class="relative">
    <!-- 全站动态背景：支持多主题切换（金色流星 / 蓝色网络 / 灵动星点 / 柔和晨雾 / 深邃波浪） -->
    <DynamicBackground />

    <!--
      布局核心：桌面端由左侧固定 rail 承担导航，内容区整体右移（rail-offset）；
      移动端 rail 隐藏、改用底部 dock，因此预留 dock-clearance 避免页脚被遮挡。
    -->
    <div class="rail-offset dock-clearance relative z-10 flex min-h-screen flex-col">
      <AppNavigation />

      <main class="relative flex-1">
        <!--
          半透明蒙层：动态背景仍可感知，同时保证正文文字的可读性。
          没有这一层时，长文章的正文会直接压在移动的点线上，阅读体验很差。
        -->
        <div class="main-scrim pointer-events-none absolute inset-0" aria-hidden="true" />

        <div class="relative">
          <slot />
        </div>
      </main>

      <AppFooter />

      <!-- 长文回顶入口 -->
      <BackToTop />
    </div>
  </div>
</template>
