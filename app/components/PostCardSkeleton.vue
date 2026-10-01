<template>
  <!-- 与 PostRow 结构对齐的行式骨架，避免加载完成时布局跳动 -->
  <div class="border-t border-slate-200 py-6 sm:py-7 dark:border-slate-800">
    <div class="flex items-baseline gap-5 sm:gap-8">
      <div class="h-3 w-5 shrink-0 animate-pulse rounded bg-slate-200/80 dark:bg-slate-800" />

      <div class="min-w-0 flex-1">
        <div class="h-6 w-3/4 animate-pulse rounded bg-slate-200/80 dark:bg-slate-800" />

        <div class="mt-3 space-y-2">
          <div class="h-3.5 w-full animate-pulse rounded bg-slate-200/70 dark:bg-slate-800/70" />
          <div class="h-3.5 w-5/6 animate-pulse rounded bg-slate-200/70 dark:bg-slate-800/70" />
        </div>

        <div class="mt-4 flex gap-4">
          <div class="h-3 w-20 animate-pulse rounded bg-slate-200/70 dark:bg-slate-800/70" />
          <div class="h-3 w-14 animate-pulse rounded bg-slate-200/70 dark:bg-slate-800/70" />
          <div class="h-3 w-12 animate-pulse rounded bg-slate-200/70 dark:bg-slate-800/70" />
        </div>
      </div>
    </div>
  </div>
</template>
