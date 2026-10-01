import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  css: ['~/assets/css/main.css'],

  vite: {
    plugins: [tailwindcss()],
  },

  modules: ['nuxt-auth-utils', '@vueuse/motion/nuxt'],

  router: {
    options: {
      // 锚点平滑滚动由 app/router.options.ts 的 scrollBehavior 控制，
      // 这里只声明滚动动画类型（Nuxt 自己的选项）
      scrollBehaviorType: 'smooth',
    },
  },

  runtimeConfig: {
    session: {
      name: 'nuxt-session',
      password: '',
      maxAge: 60 * 60 * 24 * 7,
      cookie: {
        // 生产环境走 HTTPS 时必须为 true；开发环境放宽以便局域网访问
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        httpOnly: true,
      },
    },
    adminUsername: process.env.ADMIN_USERNAME || 'admin',
    adminPassword: process.env.ADMIN_PASSWORD || '',
    public: {
      siteName: '博客',
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3000',
      siteDescription: '记录技术与生活的思考',
    },
  },

  app: {
    pageTransition: { name: 'page', mode: 'out-in' },
    head: {
      htmlAttrs: { lang: 'zh-CN' },
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      ],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/icon.svg' },
        { rel: 'apple-touch-icon', href: '/icon.svg' },
        { rel: 'alternate', type: 'application/rss+xml', title: 'RSS', href: '/rss.xml' },
      ],
      script: [
        {
          /*
           * 首屏前同步主题与自定义字体颜色，避免闪烁。
           *
           * 字体颜色按明暗模式分别存了两个变体（见 useTextColor 的 TextColorPair），
           * 所以这里只需按当前模式取字段即可，不必复制一份配色算法 ——
           * 两处逻辑不会走样。
           * 兼容旧格式：早期版本存的是裸 hex，直接当作当前色使用，
           * 运行时由 restoreTextColor 补齐变体并回写。
           */
          innerHTML:
            "(function(){try{var s=localStorage.getItem('theme');var d=s?s==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;if(d)document.documentElement.classList.add('dark');var raw=localStorage.getItem('text-color');if(!raw)return;var c=raw;if(raw.charAt(0)==='{'){var o=JSON.parse(raw);c=d?o.dark:o.light;}if(c&&/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(c)){document.documentElement.style.setProperty('--user-text-color',c);document.documentElement.setAttribute('data-text-color','on');}}catch(e){}})();",
        },
      ],
    },
  },

  nitro: {
    externals: {
      inline: [],
    },
  },
})
