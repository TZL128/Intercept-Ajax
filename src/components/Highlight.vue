<script lang='ts' setup>
const props = defineProps({
  keyWord: {
    type: String
  },
  content: {
    type: String
  },
  color: {
    type: String,
    default: '#9373EE'
  }
})

const htmlStr = computed(() => {
  const { color, content, keyWord } = props
  return content.replaceAll(keyWord, `<span style="color: ${color};">${keyWord}</span>`)
})
</script>

<template>
  <div v-html="htmlStr" />
</template>
