export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const parts = await readMultipartFormData(event)
  const file = parts?.find((part) => part.name === 'file' && part.data?.length)

  if (!file) {
    throw createError({ statusCode: 400, statusMessage: '未接收到文件' })
  }

  if (file.data.length > MAX_UPLOAD_BYTES) {
    throw createError({ statusCode: 413, statusMessage: '图片大小不能超过 5MB' })
  }

  try {
    const url = await saveImage(file.data, file.type ?? '', file.filename ?? '')
    return { url }
  } catch (error) {
    throw createError({
      statusCode: 400,
      statusMessage: error instanceof Error ? error.message : '图片保存失败',
    })
  }
})
