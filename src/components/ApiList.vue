<script lang='ts' setup>
defineProps({
  list: {
    type: Array,
  }
})
</script>
<template>
  <div>
    <ApiListItem v-for="api in list" :key="api.id" v-bind="api" />
  </div>
</template>
