<script lang='ts' setup>
const list = inject(API_LIST) ?? []
</script>
<template>
  <div h-full flex flex-col>
    <div p-2.5 shrink-0>
      <div mb-2.5 class="text-primary text-lg">请求列表</div>
      <ApiSearch />
    </div>
    <div scrollbar flex-1>
      <template v-if="list.length">
        <ApiList :list="list" />
      </template>
      <template v-else>
        <TipText>
          列表空空如也,请先在页面发起请求
        </TipText>
      </template>
    </div>
  </div>
</template>
