<script lang='ts' setup>
import { Search, Brush } from '@element-plus/icons-vue'
const value = ref('')
const handleReleaseAll = inject(RELEASE_ALL_API)

const emits = defineEmits(['onSearch'])

const handleSearch = useDebounceFn(() => {
  emits('onSearch', value.value)
}, 300)
</script>
<template>
  <div flex items-center>
    <el-input v-model="value" :prefix-icon="Search" w-full style="--el-color-primary: var(--primary);" clearable
      @input="handleSearch" />
    <el-tooltip effect="light" content="将放行未拦截的请求" placement="bottom-end">
      <el-icon ml-1.25 size="20" color="#9373EE" @click="handleReleaseAll?.()" cursor-pointer>
        <Brush />
      </el-icon>
    </el-tooltip>

  </div>
</template>
