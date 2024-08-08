<script lang='ts' setup>
import { HomeFilled } from '@element-plus/icons-vue'
import { ParamsTypeMap } from '@/constant/index'


const api = inject(CURRENT_API)
const paramsText = inject(PARAMS_TEXT)
const jsonPrams = inject(JSON_PARAMS)
const formDataParam = inject(FORMDATA_PARAMS)
const handleNext = inject(NEXT_STEP)
const isLegal = ref(true)

const wrap = ref()
const height = ref()

const { stop } = useResizeObserver(document.documentElement, () => calcH())

onBeforeUnmount(stop)

watch(wrap, () => calcH(), { deep: true })

const classStr = computed(() => ["GET"].includes((api?.value.method || '').toLocaleUpperCase()) ? 'bg-get' : 'bg-post')
const edit = computed(() => api?.value.edit)

const calcH = () => {
  const H = document.documentElement.clientHeight
  const { top }
    = useElementBounding(wrap)
  height.value = H - top.value - 15
}


</script>
<template>
  <div h-full scrollbar-y p-3.75>
    <template v-if="api?.id">
      <div flex mb-5>
        <div mr-2 text-white rounded font-semibold text-xs leading-none w-10 flex items-center justify-center
          :class="classStr">{{ api.method
          }}</div>
        <span w-full inline-block truncate text-sm> {{ api.url }}</span>
      </div>
      <div border border-solid rounded-md class="border-#f2f4f7">
        <div text-normal text-sm p-2.5 flex justify-between>
          <span>{{ paramsText }}</span>
          <el-button
            style="--el-color-primary: var(--primary);--el-button-hover-bg-color:var(--primary);--el-button-hover-border-color:var(--primary);"
            type="primary" :disabled="!isLegal" size="small" @click="handleNext?.()">完成</el-button>
        </div>
        <div ref="wrap">
          <template v-if="edit === ParamsTypeMap.Json">
            <JsonEdit v-model:json="jsonPrams" @lint-status="res => isLegal = res"
              :style="{ 'max-height': `${height}px` }" />
          </template>
          <template v-if="edit === ParamsTypeMap.FormData">
            <FormDataEdit v-model:formData="formDataParam" />
          </template>
        </div>
      </div>
    </template>
    <template v-else>
      <TipText>
        <div>
          <el-icon size="60" color="#9373EE">
            <HomeFilled />
          </el-icon>
        </div>
      </TipText>
    </template>
  </div>
</template>
