<script setup lang="ts">
definePageMeta({ layout: 'admin' })

useSeoMeta({ title: '编辑文章' })

const route = useRoute()
const postId = Number(route.params.id)
</script>

<template>
  <AdminPostForm :post-id="postId" />
</template>
