interface SessionUser {
  id: number
  username: string
  nickname: string
  role: string
}

export default defineNuxtRouteMiddleware(async (to) => {
  if (!to.path.startsWith('/admin')) return
  if (to.path === '/admin/login') return

  // 必须使用 useRequestFetch：SSR 阶段它会转发浏览器请求头（含 Cookie），
  // 普通 $fetch 不会携带 Cookie，会导致刷新后台页面被误判为未登录
  const requestFetch = useRequestFetch()

  try {
    const { user } = await requestFetch<{ user: SessionUser | null }>('/api/auth/me')
    if (!user) {
      return navigateTo({ path: '/admin/login', query: { redirect: to.fullPath } })
    }
  } catch {
    return navigateTo('/admin/login')
  }
})
