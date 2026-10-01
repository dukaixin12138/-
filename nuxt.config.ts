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
      /**
       * 滚动行为需要显式声明，理由：
       * - 路由切换必须**瞬时**回顶部，长文页面上平滑滚动会拖很久、位置还不一定归位
       * - 点击目录锚点则需要平滑滚动，并留出被固定元素遮挡的余量
       * - 浏览器前进/后退要恢复原位置
       */
      scrollBehavior(to, _from, savedPosition) {
        if (savedPosition) return savedPosition
        if (to.hash) return { el: to.hash, top: 96, behavior: 'smooth' }
        return { top: 0 }
      },
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
        { rel: 'alternate', type: 'application/rss+xml', title: 'RSS', href: '/rss.xml' },
      ],
      script: [
        {
          // 首屏前同步主题与自定义字体颜色，避免闪烁
          innerHTML:
            "(function(){try{var s=localStorage.getItem('theme');var d=s?s==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;if(d)document.documentElement.classList.add('dark');var c=localStorage.getItem('text-color');if(c&&/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(c)){document.documentElement.style.setProperty('--user-text-color',c);document.documentElement.setAttribute('data-text-color','on');}}catch(e){}})();",
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
