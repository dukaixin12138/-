import { randomBytes } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { extname, join, resolve } from 'node:path'

/**
 * 图片存储。
 *
 * 当前实现写入本地 public/uploads，仅适用于本地开发与自托管（需要持久化磁盘）。
 * 部署到 Vercel 等 Serverless 平台时必须替换为对象存储（R2 / OSS / COS / S3），
 * 只需把 saveImage 的实现换成对应 SDK 的 putObject 并返回公开 URL 即可。
 */

/** 不包含 SVG：SVG 可内嵌脚本，作为用户上传内容存在 XSS 风险 */
const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'image/avif': '.avif',
}

const ALLOWED_EXT = new Set(Object.values(MIME_TO_EXT))

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024

export function resolveImageExtension(mime: string, originalName: string): string | null {
  const byMime = MIME_TO_EXT[mime.toLowerCase()]
  if (byMime) return byMime

  const ext = extname(originalName).toLowerCase()
  return ALLOWED_EXT.has(ext) ? ext : null
}

export async function saveImage(
  buffer: Buffer,
  mime: string,
  originalName: string,
): Promise<string> {
  const ext = resolveImageExtension(mime, originalName)
  if (!ext) {
    throw new Error('仅支持 jpg / png / gif / webp / avif 格式')
  }

  const now = new Date()
  const relativeDir = `uploads/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}`
  const absoluteDir = resolve(process.cwd(), 'public', relativeDir)

  await mkdir(absoluteDir, { recursive: true })

  const filename = `${Date.now()}-${randomBytes(6).toString('hex')}${ext}`
  await writeFile(join(absoluteDir, filename), buffer)

  return `/${relativeDir}/${filename}`
}
