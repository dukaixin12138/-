<script setup lang="ts">
import { AlertCircle, Loader2, Pencil, ShieldCheck, Trash2, UserPlus, X } from 'lucide-vue-next'

definePageMeta({ layout: 'admin' })

useSeoMeta({ title: '用户管理' })

// 仅管理员可访问，作者直接进入会看到 403 页面
const { data: session } = await useFetch<{ user: { role: string } | null }>('/api/auth/me')

if (session.value?.user?.role !== 'admin') {
  throw createError({ statusCode: 403, statusMessage: '仅管理员可访问用户管理', fatal: true })
}

interface AdminUser {
  id: number
  username: string
  nickname: string | null
  email: string | null
  role: string
  bio: string | null
  createdAt: string
  postCount: number
}

const { confirm } = useConfirm()
const toast = useToast()

const { data, refresh } = await useFetch<{ items: AdminUser[] }>('/api/admin/users', {
  key: 'admin-users',
})

const users = computed(() => data.value?.items ?? [])

const formOpen = ref(false)
const editingId = ref<number | null>(null)
const saving = ref(false)
const errorMessage = ref('')

const form = reactive({
  username: '',
  password: '',
  nickname: '',
  email: '',
  role: 'author',
  bio: '',
})

function resetForm() {
  Object.assign(form, {
    username: '',
    password: '',
    nickname: '',
    email: '',
    role: 'author',
    bio: '',
  })
  errorMessage.value = ''
}

function openCreate() {
  editingId.value = null
  resetForm()
  formOpen.value = true
}

function openEdit(user: AdminUser) {
  editingId.value = user.id
  Object.assign(form, {
    username: user.username,
    password: '',
    nickname: user.nickname ?? '',
    email: user.email ?? '',
    role: user.role,
    bio: user.bio ?? '',
  })
  errorMessage.value = ''
  formOpen.value = true
}

function closeForm() {
  formOpen.value = false
  editingId.value = null
  resetForm()
}

async function save() {
  errorMessage.value = ''

  if (!editingId.value) {
    if (!form.username.trim()) {
      errorMessage.value = '请填写用户名'
      return
    }
    if (form.password.length < 6) {
      errorMessage.value = '密码至少 6 位'
      return
    }
  } else if (form.password && form.password.length < 6) {
    errorMessage.value = '密码至少 6 位'
    return
  }

  saving.value = true
  try {
    if (editingId.value) {
      await $fetch(`/api/admin/users/${editingId.value}`, {
        method: 'PATCH',
        body: {
          nickname: form.nickname,
          email: form.email,
          role: form.role,
          bio: form.bio,
          ...(form.password ? { password: form.password } : {}),
        },
      })
      toast.success('用户已更新')
    } else {
      await $fetch('/api/admin/users', { method: 'POST', body: { ...form } })
      toast.success('用户已创建')
    }

    closeForm()
    await refresh()
  } catch (error: unknown) {
    const err = error as { data?: { statusMessage?: string }; statusMessage?: string }
    errorMessage.value = err?.data?.statusMessage || err?.statusMessage || '保存失败，请重试'
  } finally {
    saving.value = false
  }
}

async function remove(user: AdminUser) {
  if (!(await confirm(`确定删除用户「${user.nickname || user.username}」吗？该操作不可恢复。`))) return

  try {
    await $fetch(`/api/admin/users/${user.id}`, { method: 'DELETE' })
    toast.success('用户已删除')
    await refresh()
  } catch (error: unknown) {
    const err = error as { data?: { statusMessage?: string } }
    toast.error(err?.data?.statusMessage || '删除失败，请重试')
  }
}
</script>

<template>
  <div class="space-y-5">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="text-xl font-semibold text-slate-900 dark:text-slate-100">用户管理</h1>
        <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
          共 {{ users.length }} 个账号 · 管理员可管理全部内容，作者仅能管理自己的文章
        </p>
      </div>

      <button type="button" class="btn btn-primary" @click="openCreate">
        <UserPlus class="h-4 w-4" />
        新建用户
      </button>
    </div>

    <!-- 编辑 / 新建表单 -->
    <form v-if="formOpen" class="card-surface space-y-4 p-5" @submit.prevent="save">
      <div class="flex items-center justify-between">
        <p class="text-sm font-semibold text-slate-900 dark:text-slate-100">
          {{ editingId ? '编辑用户' : '新建用户' }}
        </p>
        <button
          type="button"
          class="cursor-pointer rounded p-1 text-slate-400 transition-colors duration-200 hover:text-slate-600 dark:hover:text-slate-200"
          aria-label="关闭表单"
          @click="closeForm"
        >
          <X class="h-4 w-4" />
        </button>
      </div>

      <div class="grid gap-4 sm:grid-cols-2">
        <div>
          <label for="user-username" class="mb-1.5 block text-xs text-slate-500 dark:text-slate-400">
            用户名
          </label>
          <input
            id="user-username"
            v-model="form.username"
            type="text"
            class="field disabled:opacity-60"
            :disabled="Boolean(editingId)"
            placeholder="登录名，创建后不可修改"
          >
        </div>

        <div>
          <label for="user-password" class="mb-1.5 block text-xs text-slate-500 dark:text-slate-400">
            {{ editingId ? '重置密码（留空则不修改）' : '密码' }}
          </label>
          <input
            id="user-password"
            v-model="form.password"
            type="password"
            class="field"
            autocomplete="new-password"
            placeholder="至少 6 位"
          >
        </div>

        <div>
          <label for="user-nickname" class="mb-1.5 block text-xs text-slate-500 dark:text-slate-400">
            昵称
          </label>
          <input id="user-nickname" v-model="form.nickname" type="text" class="field" placeholder="显示名称">
        </div>

        <div>
          <label for="user-email" class="mb-1.5 block text-xs text-slate-500 dark:text-slate-400">
            邮箱（可选）
          </label>
          <input id="user-email" v-model="form.email" type="email" class="field" placeholder="用于在评论区识别博主身份">
        </div>

        <div>
          <label for="user-role" class="mb-1.5 block text-xs text-slate-500 dark:text-slate-400">
            角色
          </label>
          <select id="user-role" v-model="form.role" class="field">
            <option value="author">作者（仅管理自己的文章）</option>
            <option value="admin">管理员（全部权限）</option>
          </select>
        </div>

        <div>
          <label for="user-bio" class="mb-1.5 block text-xs text-slate-500 dark:text-slate-400">
            简介
          </label>
          <input id="user-bio" v-model="form.bio" type="text" class="field" placeholder="一句话介绍">
        </div>
      </div>

      <p
        v-if="errorMessage"
        class="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400"
      >
        <AlertCircle class="h-4 w-4 shrink-0" />
        {{ errorMessage }}
      </p>

      <div class="flex justify-end gap-2">
        <button type="button" class="btn btn-ghost" @click="closeForm">取消</button>
        <button type="submit" class="btn btn-primary" :disabled="saving">
          <Loader2 v-if="saving" class="h-4 w-4 animate-spin" />
          {{ saving ? '保存中…' : '保存' }}
        </button>
      </div>
    </form>

    <!-- 用户列表 -->
    <ul class="space-y-3">
      <li v-for="user in users" :key="user.id" class="card-surface flex flex-wrap items-start justify-between gap-4 p-5">
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-2">
            <span class="text-sm font-medium text-slate-900 dark:text-slate-100">
              {{ user.nickname || user.username }}
            </span>
            <span
              class="badge"
              :class="user.role === 'admin' ? 'badge-brand' : ''"
            >
              <ShieldCheck v-if="user.role === 'admin'" class="h-3 w-3" />
              {{ user.role === 'admin' ? '管理员' : '作者' }}
            </span>
          </div>

          <div class="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
            <span class="font-mono">{{ user.username }}</span>
            <span v-if="user.email">{{ user.email }}</span>
            <span>{{ user.postCount }} 篇文章</span>
            <span>{{ formatDate(user.createdAt) }} 加入</span>
          </div>

          <p v-if="user.bio" class="mt-2 text-sm text-slate-500 dark:text-slate-400">{{ user.bio }}</p>
        </div>

        <div class="flex shrink-0 items-center gap-1">
          <button
            type="button"
            class="cursor-pointer rounded-lg p-2 text-slate-400 transition-colors duration-200 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            aria-label="编辑用户"
            @click="openEdit(user)"
          >
            <Pencil class="h-4 w-4" />
          </button>
          <button
            type="button"
            class="cursor-pointer rounded-lg p-2 text-slate-400 transition-colors duration-200 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
            aria-label="删除用户"
            @click="remove(user)"
          >
            <Trash2 class="h-4 w-4" />
          </button>
        </div>
      </li>
    </ul>
  </div>
</template>
