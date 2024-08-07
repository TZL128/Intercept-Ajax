<script lang='ts' setup>
import { Search, Brush } from '@element-plus/icons-vue'
const value = defineModel()
const handleReleaseAll = inject(RELEASE_ALL_API)
</script>
<template>
  <div flex items-center>
    <el-input v-model="value" :prefix-icon="Search" w-full style="--el-color-primary: var(--primary);" clearable />
    <el-tooltip effect="light" content="列表的接口将全部放行" placement="bottom-end">
      <el-icon ml-1.25 size="20" color="#9373EE" @click="handleReleaseAll?.()" cursor-pointer>
        <Brush />
      </el-icon>
    </el-tooltip>

  </div>
</template>
