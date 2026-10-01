export default defineEventHandler(async (event) => {
  const body = await readBody<{ username?: string; password?: string }>(event)
  const username = String(body?.username ?? '').trim()
  const password = String(body?.password ?? '')

  if (!username || !password) {
    throw createError({ statusCode: 400, statusMessage: '请输入用户名和密码' })
  }

  const ip = getClientIp(event)

  // 防暴力破解：同一 IP 连续失败达上限后临时锁定
  await assertLoginAllowed(ip)

  const config = useRuntimeConfig()
  let account = await prisma.user.findUnique({ where: { username } })

  async function reject(): Promise<never> {
    await recordLoginAttempt(ip, username, false)
    throw createError({ statusCode: 401, statusMessage: '用户名或密码错误' })
  }

  if (account) {
    if (!verifyPasswordScrypt(password, account.passwordHash)) {
      return await reject()
    }
  } else if (
    username === config.adminUsername &&
    config.adminPassword &&
    password === config.adminPassword
  ) {
    // 首次登录时用环境变量中的管理员自动建号
    account = await prisma.user.create({
      data: {
        username,
        nickname: '管理员',
        passwordHash: hashPasswordScrypt(password),
        role: 'admin',
      },
    })
  } else {
    return await reject()
  }

  await recordLoginAttempt(ip, username, true)
  void pruneLoginAttempts()

  const user: SessionUser = {
    id: account.id,
    username: account.username,
    nickname: account.nickname || account.username,
    role: account.role,
  }

  await setUserSession(event, { user })

  return { user }
})
