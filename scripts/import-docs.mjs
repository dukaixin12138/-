/**
 * 把本地技术文档库导入成博客文章（支持多个文档集）。
 *
 * 拆分策略：按**技术主题**成篇，而不是按文件成篇。
 * 一个主题目录内的「01-xxx.md … + 速查.md」合并后正好是一篇结构完整的文章；
 * 按文件拆会碎成几百篇短文，全部合成一篇则是巨型单页，两者都不合适。
 * 目录内还有子分类时（如 VueUse 的 @Electron / Browser / Sensors），按子目录各成一篇。
 *
 * 幂等：靠 slug upsert，可反复执行；源文档更新后重跑即可同步。
 *
 * 用法：node scripts/import-docs.mjs
 */
import { PrismaClient } from '@prisma/client'
import { copyFile, mkdir, readFile, readdir, rm, stat } from 'node:fs/promises'
import { join, relative, sep } from 'node:path'

const prisma = new PrismaClient()
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin'

/** 附件落地目录（相对项目根），需同步写进 .gitignore */
const DOWNLOAD_DIR = 'public/downloads'

/** 可作为附件提供的文件类型；文档配图（svg/png）不算附件 */
const ATTACHMENT_EXTS = new Set(['.js', '.mjs', '.cjs', '.ts', '.json', '.html', '.css', '.sh', '.sql'])

/* ============================================================
   文档集定义
   ============================================================ */

const LIBRARIES = [
  {
    root: 'f:\\全栈开发通用工具集',
    category: {
      slug: 'tooling',
      name: '工具与运维',
      desc: '全栈开发常用工具、工程化与运维实践',
      sort: 4,
    },
    articles: [
      {
        dir: 'JS全栈工具集.md',
        slug: 'js-fullstack-toolkit-overview',
        title: 'JS 全栈工具集：全景地图与生产注意事项',
        extra: ['生产注意事项与进阶方向.md'],
        summary:
          '把全栈开发要用到的工具分成「通用工具」与「JS 生态专属」两类，并附上生产环境的注意事项与进阶方向。',
        tags: ['工具', '工程化', '全栈'],
      },
      {
        dir: '共享约定.md',
        slug: 'shared-conventions-across-docs',
        title: '跨文档共享约定：容器网络、启动顺序与配置注入',
        summary:
          '多套技术文档中反复出现、且最容易写错的一组共识：容器内寻址、depends_on 的真实语义、env 注入、SIGTERM 转发与 proxy_pass 尾斜杠。',
        tags: ['Docker', '运维', '约定'],
      },
      {
        dir: 'Apifox技术文档',
        slug: 'apifox-guide',
        title: 'Apifox 使用指南：接口设计、Mock 与自动化测试',
        tags: ['API', '测试', '工具'],
      },
      { dir: 'axios技术文档', slug: 'axios-guide', title: 'axios 使用指南', tags: ['HTTP', '前端'] },
      {
        dir: 'CICD技术文档',
        slug: 'cicd-guide',
        title: 'CI/CD 入门：从流水线概念到落地实践',
        tags: ['CI/CD', '自动化', '运维'],
      },
      {
        dir: 'curl技术文档',
        slug: 'curl-guide',
        title: 'curl 使用指南：参数速查与实战场景',
        tags: ['命令行', 'HTTP'],
      },
      {
        dir: 'Docker容器化技术文档',
        slug: 'docker-guide',
        title: 'Docker 容器化指南：从镜像到 Compose 编排',
        tags: ['Docker', '容器化', '运维'],
      },
      {
        dir: 'ELK技术文档',
        slug: 'elk-guide',
        title: 'ELK 日志系统：采集、存储与检索',
        tags: ['日志', 'ELK', '运维'],
      },
      {
        dir: 'ESLint技术文档',
        slug: 'eslint-guide',
        title: 'ESLint 配置指南：规则、插件与团队规范',
        tags: ['代码规范', '前端工程化'],
      },
      {
        files: ['git大全/git基础.md', 'git大全/git实际应用.md'],
        slug: 'git-essentials',
        title: 'Git 基础与实战：从提交到团队协作',
        summary:
          '从工作区 / 暂存区 / 版本库三层模型讲起，覆盖日常命令、撤销与回退、分支协作，以及实践中真正会踩到的坑。',
        tags: ['Git', '版本控制'],
      },
      {
        files: [
          'git大全/Gitee连接配置流程.md',
          'git大全/从GitHub和Gitee下载开源项目步骤笔记.md',
          'git大全/Gitee分支管理与分支结构解读笔记.md',
        ],
        slug: 'git-remote-and-branch',
        title: 'Git 远程仓库与分支管理：Gitee / GitHub 实操',
        summary: 'SSH 连接配置、从远程克隆开源项目、分支结构设计与协作流程的完整实操记录。',
        tags: ['Git', '版本控制'],
      },
      {
        files: ['git大全/CICD流水线.md'],
        slug: 'git-cicd-pipeline-notes',
        title: 'CI/CD 流水线实战笔记',
        summary: '把构建、测试、部署串成自动流水线的具体配置与踩坑记录。',
        tags: ['CI/CD', '自动化'],
      },
      {
        dir: 'Grafana技术文档',
        slug: 'grafana-guide',
        title: 'Grafana 可视化指南：面板与告警',
        tags: ['监控', 'Grafana'],
      },
      {
        dir: 'Husky技术文档',
        slug: 'husky-guide',
        title: 'Husky 与 Git 钩子：提交前自动检查',
        tags: ['Git', '前端工程化'],
      },
      {
        dir: 'JMeter技术文档',
        slug: 'jmeter-guide',
        title: 'JMeter 性能测试指南',
        tags: ['性能测试', '测试'],
      },
      {
        dir: 'Nginx技术文档',
        slug: 'nginx-guide',
        title: 'Nginx 配置指南：反向代理、静态资源与 HTTPS',
        tags: ['Nginx', '运维'],
      },
      {
        dir: 'Prettier技术文档',
        slug: 'prettier-guide',
        title: 'Prettier 格式化指南：与 ESLint 的配合',
        tags: ['代码规范', '前端工程化'],
      },
      {
        dir: 'Prometheus技术文档',
        slug: 'prometheus-guide',
        title: 'Prometheus 监控指南：指标、查询与告警规则',
        tags: ['监控', 'Prometheus'],
      },
      { dir: 'Sentry技术文档', slug: 'sentry-guide', title: 'Sentry 错误监控指南', tags: ['监控', '错误追踪'] },
      {
        dir: 'SkyWalking技术文档',
        slug: 'skywalking-guide',
        title: 'SkyWalking 链路追踪指南',
        tags: ['监控', '链路追踪'],
      },
      {
        dir: 'Swagger技术文档',
        slug: 'swagger-guide',
        title: 'Swagger / OpenAPI 接口文档指南',
        tags: ['API', '接口文档'],
      },
      { dir: 'vite官方文档', slug: 'vite-guide', title: 'Vite 构建工具指南', tags: ['Vite', '构建工具'] },
      {
        dir: '前端监控技术文档',
        slug: 'frontend-monitoring-guide',
        title: '前端监控体系：错误捕获、性能度量与排错',
        tags: ['监控', '前端'],
      },
      {
        dir: '安全扫描技术文档',
        slug: 'security-scan-guide',
        title: '安全扫描实践：依赖审计与代码扫描',
        tags: ['安全', '工程化'],
      },
      {
        dir: '密钥与配置技术文档',
        slug: 'secrets-and-config-guide',
        title: '密钥与配置管理：不要把它们写进代码',
        tags: ['安全', '配置管理'],
      },
    ],
  },

  {
    root: 'f:\\前端框架与工具集',
    category: {
      slug: 'frontend-basics',
      name: '前端基础',
      desc: 'HTML / CSS / JavaScript 与浏览器 API 的体系化笔记',
      sort: 5,
    },
    articles: [
      {
        // 用 sub 而不是 dir：dir 会把 02-HTML5 一并递归进来，与下一篇重复
        sub: 'HTML官方文档/01-HTML',
        extra: ['HTML官方文档/HTML常用指南.md'],
        slug: 'html-doc-notes',
        title: 'HTML 笔记：结构、元素、表单与 head',
        summary: '文档结构、元素分类、全局属性、表单、表格、head/meta 与脚本加载策略。',
        tags: ['HTML', '前端基础'],
      },
      {
        sub: 'HTML官方文档/02-HTML5',
        slug: 'html5-features',
        title: 'HTML5 新特性：语义化、表单增强与多媒体',
        summary: '语义化标签、表单增强、多媒体、Canvas/SVG、Web Storage 与 Web Components。',
        tags: ['HTML', '前端基础'],
      },
      {
        sub: 'CSS官方文档/01-基础CSS',
        extra: ['CSS官方文档/CSS常用指南.md'],
        slug: 'css-basics',
        title: 'CSS 基础：层叠优先级、盒模型与定位',
        summary: '层叠与优先级、盒模型、选择器、文档流与定位、文本与背景、值与单位。',
        tags: ['CSS', '前端基础'],
      },
      {
        sub: 'CSS官方文档/02-CSS3',
        slug: 'css3-modern-layout',
        title: 'CSS3 现代布局：Flexbox、Grid 与响应式',
        summary: 'Flexbox、Grid、媒体查询、过渡动画、变换、自定义属性与现代选择器。',
        tags: ['CSS', '前端基础'],
      },
      {
        sub: 'JavaScript官方文档/01JavaScript初级',
        slug: 'javascript-basics',
        title: 'JavaScript 基础：语法、函数与集合',
        summary: '语法与类型、函数、数组与对象、Promise、模块等入门核心。',
        tags: ['JavaScript', '前端基础'],
      },
      {
        sub: 'JavaScript官方文档/02JavaScript中级',
        slug: 'javascript-intermediate',
        title: 'JavaScript 进阶：相等比较、属性枚举与闭包',
        summary: '语言概览、相等比较规则、属性枚举顺序与闭包。',
        tags: ['JavaScript', '前端基础'],
      },
      {
        sub: 'JavaScript官方文档/03JavaScript高级',
        slug: 'javascript-advanced',
        title: 'JavaScript 高级：原型链、元编程与内存管理',
        summary: '原型链、Proxy / Reflect 元编程与内存管理，偏原理与面试向。',
        tags: ['JavaScript', '前端基础'],
      },
      {
        sub: 'JavaScript官方文档/04JavaScript参考',
        slug: 'javascript-reference',
        title: 'JavaScript 参考：执行模型、this 与手写实现',
        summary: '执行模型与事件循环、this 绑定规则，以及手写 call / apply / bind。',
        tags: ['JavaScript', '前端基础'],
      },
      {
        sub: 'javascript-practice',
        slug: 'javascript-practice-notes',
        title: 'JavaScript 练习题集：按章节对应的动手训练',
        summary: '与 JS 笔记章节一一对应的练习项目，含检索名录与运行方式。',
        tags: ['JavaScript', '练习'],
        // 练习代码是「要下载下来跑」的，不能只放正文文本
        attachments: {
          from: 'javascript-practice',
          note: '> 练习文件与笔记章节一一对应，下载后可直接 `node 文件名.js` 运行；`npm start` 启动统一入口，支持关键词过滤与汇总。',
        },
      },
      {
        sub: 'DOM与BOM与JSON',
        slug: 'dom-bom-json',
        title: 'DOM、BOM 与 JSON：浏览器环境 API 笔记',
        summary: '节点树与增删改查、事件与事件委托、window / location / history、JSON 规范与解析。',
        tags: ['DOM', '浏览器', '前端基础'],
      },
    ],
  },

  {
    root: 'f:\\vue3官方文档',
    category: {
      slug: 'vue3',
      name: 'Vue 3 与生态',
      desc: 'Vue 3 官方教程、Router、Pinia 与常用生态库',
      sort: 6,
    },
    articles: [
      { sub: '1-Vue官方教程-基础', slug: 'vue3-basics', title: 'Vue 3 基础：模板语法、响应式与组件入门', tags: ['Vue', '前端框架'] },
      { sub: '2-Vue官方教程-深入组件', slug: 'vue3-components', title: 'Vue 3 组件深入：Props、事件、插槽与依赖注入', tags: ['Vue', '前端框架'] },
      { sub: '3-Vue官方教程-逻辑复用', slug: 'vue3-composables', title: 'Vue 3 逻辑复用：组合式函数、自定义指令与插件', tags: ['Vue', '前端框架'] },
      { sub: '4-Vue官方教程-内置组件', slug: 'vue3-builtin-components', title: 'Vue 3 内置组件：Transition、KeepAlive、Teleport 与 Suspense', tags: ['Vue', '前端框架'] },
      { sub: '5-Vue官方教程-应用规模化', slug: 'vue3-scaling-up', title: 'Vue 3 应用规模化：单文件组件、工具链、测试与 SSR', tags: ['Vue', '前端框架'] },
      { sub: '6-Vue官方教程-进阶主题', slug: 'vue3-advanced-topics', title: 'Vue 3 进阶主题：深入响应式系统', tags: ['Vue', '原理'] },
      { sub: '7-Vue官方教程-最佳实践', slug: 'vue3-best-practices', title: 'Vue 3 生产实践：性能、安全、无障碍与测试', tags: ['Vue', '最佳实践'] },
      { sub: '8-Vue官方教程-TypeScript', slug: 'vue3-typescript', title: 'Vue 3 与 TypeScript：类型标注与组合式 API', tags: ['Vue', 'TypeScript'] },

      { sub: '9-Vue官方生态-路由Router/1设置', slug: 'vue-router-setup', title: 'Vue Router：安装与基础配置', tags: ['Vue Router', 'Vue'] },
      { sub: '9-Vue官方生态-路由Router/2基础', slug: 'vue-router-basics', title: 'Vue Router 基础：动态路由、嵌套路由与编程式导航', tags: ['Vue Router', 'Vue'] },
      { sub: '9-Vue官方生态-路由Router/3进阶', slug: 'vue-router-advanced', title: 'Vue Router 进阶：导航守卫、路由元信息与过渡', tags: ['Vue Router', 'Vue'] },
      { sub: '9-Vue官方生态-路由Router/4基于文件的路由', slug: 'vue-router-file-based', title: 'Vue Router 基于文件的路由', tags: ['Vue Router', 'Vue'] },

      { sub: '10-Vue官方生态-状态管理Pinia', slug: 'pinia-guide', title: 'Pinia 状态管理：State、Getter、Action 与 SSR', tags: ['Pinia', 'Vue', '状态管理'] },
      { sub: '11-第三方库-ElementPlus', slug: 'element-plus-guide', title: 'Element Plus 组件库使用指南', tags: ['Element Plus', 'Vue', 'UI 组件库'] },
      { sub: '13-我的速查与技巧', slug: 'vue3-cheatsheet', title: 'Vue 3 速查与实战技巧', tags: ['Vue', '速查'] },

      /* VueUse：346 篇「一个函数一篇」，按官方 API 分类各成一篇 */
      { sub: '12-第三方库-VueUse/介绍', slug: 'vueuse-intro', title: 'VueUse 入门：定位、安装与使用约定', tags: ['VueUse', 'Vue'] },
      { sub: '12-第三方库-VueUse/Browser（浏览器）', slug: 'vueuse-browser', title: 'VueUse 浏览器 API 合集', tags: ['VueUse', 'Vue'] },
      { sub: '12-第三方库-VueUse/Sensors（传感器）', slug: 'vueuse-sensors', title: 'VueUse 传感器 API 合集', tags: ['VueUse', 'Vue'] },
      { sub: '12-第三方库-VueUse/Reactivity（响应式）', slug: 'vueuse-reactivity', title: 'VueUse 响应式工具合集', tags: ['VueUse', 'Vue'] },
      { sub: '12-第三方库-VueUse/Utilities（实用工具）', slug: 'vueuse-utilities', title: 'VueUse 实用工具函数合集', tags: ['VueUse', 'Vue'] },
      { sub: '12-第三方库-VueUse/Array（数组）', slug: 'vueuse-array', title: 'VueUse 数组工具合集', tags: ['VueUse', 'Vue'] },
      { sub: '12-第三方库-VueUse/State（状态）', slug: 'vueuse-state', title: 'VueUse 状态管理合集', tags: ['VueUse', 'Vue'] },
      { sub: '12-第三方库-VueUse/Watch（监听）', slug: 'vueuse-watch', title: 'VueUse 监听类函数合集', tags: ['VueUse', 'Vue'] },
      { sub: '12-第三方库-VueUse/Elements（元素）', slug: 'vueuse-elements', title: 'VueUse 元素操作合集', tags: ['VueUse', 'Vue'] },
      { sub: '12-第三方库-VueUse/Component（组件）', slug: 'vueuse-component', title: 'VueUse 组件相关合集', tags: ['VueUse', 'Vue'] },
      { sub: '12-第三方库-VueUse/Animation（动画）', slug: 'vueuse-animation', title: 'VueUse 动画相关合集', tags: ['VueUse', 'Vue'] },
      { sub: '12-第三方库-VueUse/Motion（动画）', slug: 'vueuse-motion', title: 'VueUse Motion 动画合集', tags: ['VueUse', 'Vue'] },
      { sub: '12-第三方库-VueUse/@Math（数学）', slug: 'vueuse-math', title: 'VueUse 数学工具合集', tags: ['VueUse', 'Vue'] },
      { sub: '12-第三方库-VueUse/Time（时间）', slug: 'vueuse-time', title: 'VueUse 时间处理合集', tags: ['VueUse', 'Vue'] },
      { sub: '12-第三方库-VueUse/Network（网络）', slug: 'vueuse-network', title: 'VueUse 网络请求合集', tags: ['VueUse', 'Vue'] },
      { sub: '12-第三方库-VueUse/@Integrations（集成）', slug: 'vueuse-integrations', title: 'VueUse 生态集成：i18n、Axios、Cookies 等', tags: ['VueUse', 'Vue'] },
      { sub: '12-第三方库-VueUse/@Router（路由）', slug: 'vueuse-router', title: 'VueUse 路由相关函数', tags: ['VueUse', 'Vue Router'] },
      { sub: '12-第三方库-VueUse/@RxJS（响应式扩展）', slug: 'vueuse-rxjs', title: 'VueUse 与 RxJS 集成', tags: ['VueUse', 'RxJS'] },
      { sub: '12-第三方库-VueUse/@Electron（桌面应用库）', slug: 'vueuse-electron', title: 'VueUse 与 Electron 集成', tags: ['VueUse', 'Electron'] },
      { sub: '12-第三方库-VueUse/@Firebase（后端数据库）', slug: 'vueuse-firebase', title: 'VueUse 与 Firebase 集成', tags: ['VueUse', 'Firebase'] },
      { sub: '12-第三方库-VueUse/@Head（头部）', slug: 'vueuse-head', title: 'VueUse Head 文档头管理', tags: ['VueUse', 'SEO'] },
      { sub: '12-第三方库-VueUse/@SchemaOrg（结构化数据）', slug: 'vueuse-schema-org', title: 'VueUse Schema.org 结构化数据', tags: ['VueUse', 'SEO'] },
      { sub: '12-第三方库-VueUse/@Sound（声音）', slug: 'vueuse-sound', title: 'VueUse 声音相关函数', tags: ['VueUse', '多媒体'] },
    ],
  },
]

/* ============================================================
   Markdown 处理
   ============================================================ */

/**
 * 把 Markdown 标题整体降一级（h1→h2、h2→h3…）。
 * 文章标题由博客渲染成 h1，正文里再出现 h1 会破坏文档结构。
 * 代码块内部的 `#` 是注释，必须原样保留。
 */
function demoteHeadings(markdown) {
  const out = []
  let inFence = false
  let fenceChar = ''

  for (const line of markdown.split('\n')) {
    const fence = /^\s{0,3}(`{3,}|~{3,})/.exec(line)

    if (fence) {
      const char = fence[1][0]
      if (!inFence) {
        inFence = true
        fenceChar = char
      } else if (char === fenceChar) {
        inFence = false
      }
      out.push(line)
      continue
    }

    if (!inFence && /^#{1,5}\s/.test(line)) {
      out.push(`#${line}`)
      continue
    }

    out.push(line)
  }

  return out.join('\n')
}

/** 指向本地文件的相对链接在合并后必然失效，转成纯文本 */
function stripLocalLinks(markdown) {
  return markdown.replace(/\[([^\]]+)\]\((?:\.{1,2}\/)?[^)]+\.md(?:#[^)]*)?\)/g, '$1')
}

/** 从 README 的引用块里提取一段可直接用作摘要的话 */
function buildSummaryFromReadme(readme) {
  if (!readme) return null

  const text = readme
    .split('\n')
    .filter((line) => line.trim().startsWith('>'))
    .map((line) => line.replace(/^\s*>\s?/, '').trim())
    .filter((line) => line && !line.startsWith('[') && !line.startsWith('http'))
    .join(' ')
    .replace(/[*`\[\]]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

  if (!text) return null
  return text.length > 160 ? `${text.slice(0, 160)}…` : text
}

/** 中文按 350 字/分钟、英文按 200 词/分钟估算阅读时长 */
function calcReadingTime(source) {
  const cn = (source.match(/[\u4e00-\u9fa5]/g) || []).length
  const en = (source.match(/[a-zA-Z0-9]+/g) || []).length
  return Math.max(1, Math.round(cn / 350 + en / 200))
}

/* ============================================================
   源文件收集
   ============================================================ */

/**
 * 递归收集目录下所有 .md（跳过任何层级的 README.md）。
 * 只取 md 是必要的：ElementPlus 目录里混着 293 张组件截图 svg，
 * javascript-practice 里是练习用的 .js，都不该进正文。
 */
async function walkMarkdown(dir, base = dir) {
  const found = []
  let entries

  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch {
    // 目录不存在时返回空，交由调用方跳过 —— 避免一个笔误就让整个导入中断
    return found
  }

  for (const entry of entries) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      found.push(...(await walkMarkdown(full, base)))
    } else if (entry.name.endsWith('.md') && entry.name.toLowerCase() !== 'readme.md') {
      found.push(relative(base, full).split(sep).join('/'))
    }
  }

  return found
}

/** 按路径排序：先比首段，数字段按数值比较，保证 2 排在 10 前面 */
function sortByPath(paths) {
  const key = (p) => p.split('/').map((seg) => seg.replace(/^\d+(\.\d+)?/, (m) => m.padStart(8, '0')))
  return [...paths].sort((a, b) => {
    const ka = key(a).join('/')
    const kb = key(b).join('/')
    return ka < kb ? -1 : ka > kb ? 1 : 0
  })
}

async function collectSources(root, spec) {
  const paths = []
  let readme = null

  if (spec.files?.length) {
    paths.push(...spec.files)
  } else if (spec.sub) {
    // 指定子目录（含嵌套）：递归收该子目录下的全部正文
    readme = await readFile(join(root, spec.sub, 'README.md'), 'utf8').catch(() => null)
    const found = await walkMarkdown(join(root, spec.sub))
    paths.push(...found.map((f) => `${spec.sub}/${f}`))
  } else if (spec.dir) {
    if (spec.dir.endsWith('.md')) {
      paths.push(spec.dir)
    } else {
      readme = await readFile(join(root, spec.dir, 'README.md'), 'utf8').catch(() => null)
      const subdirs = []

      for (const entry of await readdir(join(root, spec.dir), { withFileTypes: true })) {
        if (entry.isDirectory()) subdirs.push(entry.name)
        else if (entry.name.endsWith('.md') && entry.name.toLowerCase() !== 'readme.md') {
          paths.push(`${spec.dir}/${entry.name}`)
        }
      }

      // 目录里还有子分类时（如 HTML官方文档/01-HTML），一并递归收进来
      for (const sub of subdirs) {
        const found = await walkMarkdown(join(root, spec.dir, sub))
        paths.push(...found.map((f) => `${spec.dir}/${sub}/${f}`))
      }

      // 目录内只有 README 时（axios / vite 就是这种），README 本身就是全部正文，
      // 不能当作导航文件排除掉，否则会导出一篇空文章
      if (!paths.length && readme) {
        paths.push(`${spec.dir}/README.md`)
      }
    }
  }

  paths.push(...(spec.extra ?? []))
  return { paths: sortByPath(paths), readme }
}

async function buildContent(root, paths) {
  const parts = []
  for (const rel of paths) {
    const raw = await readFile(join(root, rel), 'utf8')
    parts.push(demoteHeadings(stripLocalLinks(raw)).trim())
  }
  return parts.join('\n\n---\n\n')
}

/* ============================================================
   附件（练习代码等）
   ============================================================ */

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  return `${(bytes / 1024).toFixed(1)} KB`
}

/** 递归收集可作为附件的文件（相对 sourceDir） */
async function collectAttachments(dir, base = dir, out = []) {
  let entries
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch {
    return out
  }

  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue
    const full = join(dir, entry.name)

    if (entry.isDirectory()) {
      await collectAttachments(full, base, out)
      continue
    }

    const ext = entry.name.slice(entry.name.lastIndexOf('.')).toLowerCase()
    if (ATTACHMENT_EXTS.has(ext)) {
      const info = await stat(full)
      out.push({ rel: relative(base, full).split(sep).join('/'), size: info.size })
    }
  }

  return out
}

/**
 * 把附件复制到 public/downloads/<slug>/ 并生成下载清单 Markdown。
 *
 * 为什么必须复制而不能直接引用源目录：源目录在项目之外，部署后根本不存在。
 * 也不能把练习代码塞进正文 —— 这些文件是要下载下来运行的，不是用来读的。
 */
async function prepareAttachments(root, spec) {
  if (!spec.attachments) return { section: '', count: 0 }

  const { from } = spec.attachments
  const sourceDir = join(root, from)
  const targetDir = join(DOWNLOAD_DIR, spec.slug)

  const collected = await collectAttachments(sourceDir)
  if (!collected.length) return { section: '', count: 0 }

  const sizeMap = new Map(collected.map((f) => [f.rel, f.size]))
  const files = sortByPath(collected.map((f) => f.rel)).map((rel) => ({
    rel,
    size: sizeMap.get(rel) ?? 0,
  }))

  await rm(targetDir, { recursive: true, force: true })
  await mkdir(targetDir, { recursive: true })

  for (const file of files) {
    const dest = join(targetDir, file.rel)
    await mkdir(join(dest, '..'), { recursive: true })
    await copyFile(join(sourceDir, file.rel), dest)
  }

  const totalSize = files.reduce((sum, f) => sum + f.size, 0)
  const rows = files
    .map(
      (f) =>
        `| \`${f.rel}\` | ${formatSize(f.size)} | [下载](/downloads/${spec.slug}/${encodeURI(f.rel)}) |`,
    )
    .join('\n')

  const section = [
    '',
    '---',
    '',
    '## 附件下载',
    '',
    `共 ${files.length} 个文件、合计 ${formatSize(totalSize)}。可以打包获取，也可以按需单独下载。`,
    '',
    `**[打包下载全部文件](/downloads/${spec.slug}.zip)**`,
    '',
    '| 文件 | 大小 | |',
    '| :--- | ---: | :--- |',
    rows,
    '',
    spec.attachments.note ?? '',
  ].join('\n')

  return { section, count: files.length }
}

/* ============================================================
   入库
   ============================================================ */

async function resolveTagIds(names) {
  const ids = []

  for (const raw of names) {
    const name = String(raw).trim()
    if (!name) continue

    let tag = await prisma.tag.findUnique({ where: { name } })
    if (!tag) {
      const base =
        name
          .toLowerCase()
          .replace(/[^\w\u4e00-\u9fa5]+/g, '-')
          .replace(/^-|-$/g, '') || `tag-${Date.now()}`
      let slug = base
      let index = 1
      while (await prisma.tag.findUnique({ where: { slug }, select: { id: true } })) {
        slug = `${base}-${index++}`
      }
      tag = await prisma.tag.create({ data: { name, slug } })
    }
    if (!ids.includes(tag.id)) ids.push(tag.id)
  }

  return ids
}

async function main() {
  const author = await prisma.user.findUnique({ where: { username: ADMIN_USERNAME } })
  if (!author) throw new Error(`找不到管理员账号：${ADMIN_USERNAME}`)

  const now = Date.now()
  let created = 0
  let updated = 0
  let offset = 0

  for (const library of LIBRARIES) {
    const category = await prisma.category.upsert({
      where: { slug: library.category.slug },
      update: { name: library.category.name, desc: library.category.desc },
      create: library.category,
    })

    console.log(`\n=== ${library.category.name}（${library.root}）===`)

    for (const article of library.articles) {
      const { paths, readme } = await collectSources(library.root, article)

      if (!paths.length) {
        console.log(`  跳过 ${article.slug}：没有收集到任何正文`)
        continue
      }

      const content = await buildContent(library.root, paths)
      const summary = article.summary ?? buildSummaryFromReadme(readme)

      // 附件：把练习代码等复制到 public/downloads，并把下载清单追加到文末
      const { section: attachmentSection, count: attachmentCount } = await prepareAttachments(
        library.root,
        article,
      )
      const fullContent = attachmentSection ? `${content}\n${attachmentSection}` : content

      // 每篇错开 4 小时，让归档与列表有合理的时间层次
      const publishedAt = new Date(now - offset++ * 4 * 3_600_000)

      const existing = await prisma.post.findUnique({ where: { slug: article.slug } })

      const post = await prisma.post.upsert({
        where: { slug: article.slug },
        update: {
          title: article.title,
          summary,
          content: fullContent,
          status: 'published',
          readingTime: calcReadingTime(fullContent),
          categoryId: category.id,
          publishedAt,
        },
        create: {
          title: article.title,
          slug: article.slug,
          summary,
          content: fullContent,
          status: 'published',
          featured: false,
          views: 0,
          readingTime: calcReadingTime(fullContent),
          publishedAt,
          authorId: author.id,
          categoryId: category.id,
        },
      })

      await prisma.postTag.deleteMany({ where: { postId: post.id } })
      const tagIds = await resolveTagIds(article.tags ?? [])
      if (tagIds.length) {
        await prisma.postTag.createMany({
          data: tagIds.map((tagId) => ({ postId: post.id, tagId })),
        })
      }

      if (existing) updated += 1
      else created += 1

      console.log(
        `  ${existing ? '更新' : '新增'}  ${article.slug.padEnd(32)} ${String(Math.round(fullContent.length / 1024)).padStart(4)} KB  (${paths.length} 个源文件${attachmentCount ? ` + ${attachmentCount} 个附件` : ''})`,
      )
    }
  }

  console.log(`\n完成：新增 ${created} 篇，更新 ${updated} 篇，共 ${created + updated} 篇`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
