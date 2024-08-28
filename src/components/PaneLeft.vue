<script lang='ts' setup>
import { watchEffect } from 'vue';

const list = inject(API_LIST) ?? []

const showList = ref([])
const keyWord = ref('')


const dealWithShowList = () => {
  if (!keyWord.value) {
    showList.value = list.value
  } else {
    showList.value = list.value.filter(item => item.url.includes(keyWord.value))

  }
}

const onSearch = (url: string) => {
  keyWord.value = url
}

watchEffect(dealWithShowList)


provide(KEY_WORD, keyWord)

</script>
<template>
  <div h-full flex flex-col>
    <div p-2.5 shrink-0>
      <div mb-2.5 class="text-primary text-lg">请求列表</div>
      <ApiSearch @on-search="onSearch" />
    </div>
    <div scrollbar flex-1>
      <template v-if="list.length">
        <ApiList :list="showList" />
      </template>
      <template v-else>
        <TipText>
          列表空空如也,请先在页面发起请求
        </TipText>
      </template>
    </div>
  </div>
</template>
