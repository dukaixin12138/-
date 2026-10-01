interface UserPayload {
  username?: string
  password?: string
  nickname?: string
  email?: string
  role?: string
  bio?: string
}

const USERNAME_PATTERN = /^[a-zA-Z0-9_-]{3,50}$/
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default defineEventHandler(async (event) => {
  await requireRole(event, ['admin'])

  const body = await readBody<UserPayload>(event)

  const username = String(body?.username ?? '').trim()
  const password = String(body?.password ?? '')
  const nickname = String(body?.nickname ?? '').trim()
  const email = String(body?.email ?? '').trim()
  const bio = String(body?.bio ?? '').trim()
  const role = body?.role === 'admin' ? 'admin' : 'author'

  if (!USERNAME_PATTERN.test(username)) {
    throw createError({
      statusCode: 400,
      statusMessage: '用户名需为 3-50 位的字母、数字、下划线或连字符',
    })
  }
  if (password.length < 6) {
    throw createError({ statusCode: 400, statusMessage: '密码至少 6 位' })
  }
  if (email && !EMAIL_PATTERN.test(email)) {
    throw createError({ statusCode: 400, statusMessage: '邮箱格式不正确' })
  }

  if (await prisma.user.findUnique({ where: { username }, select: { id: true } })) {
    throw createError({ statusCode: 409, statusMessage: '用户名已存在' })
  }
  if (email && (await prisma.user.findUnique({ where: { email }, select: { id: true } }))) {
    throw createError({ statusCode: 409, statusMessage: '邮箱已被使用' })
  }

  const user = await prisma.user.create({
    data: {
      username,
      passwordHash: hashPasswordScrypt(password),
      nickname: nickname || username,
      email: email || null,
      role,
      bio: bio.slice(0, 300) || null,
    },
    select: { id: true, username: true, nickname: true, email: true, role: true },
  })

  return { user }
})
