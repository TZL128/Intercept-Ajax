<script lang='ts' setup>

const props = defineProps({
  id: {
    type: Number
  },
  method: {
    type: String,
  },
  url: {
    type: String,
  },
  edit: {
    type: String
  }
})
const show = ref(false)
const isClick = ref(false)
const classStr = computed(() => ["GET"].includes((props.method || '').toLocaleUpperCase()) ? 'text-get' : 'text-post')

const isIntercepting = inject(INTERCEPT_ACTIVE)
const handleIntercept = inject(INTERCEPT_API)
const handleRelease = inject(RELEASE_API)


const handleClick = () => {
  if (isIntercepting?.value) {
    return
  }
  show.value = false
  isClick.value = true
  handleIntercept?.(props)
}

</script>
<template>
  <div mx-2.5 py-1 flex items-center rounded cursor-pointer mb-0.5 :class="{
    'hover:bg-#f3f3f4': !isClick,
    'bg-#f2f4f7': isClick
  }" @click="handleClick" @mouseenter="!isIntercepting && (show = true)" @mouseleave="show = false">
    <span text-xs font-semibold mr-2.5 shrink-0 :class="classStr">{{ method }}</span>
    <span text-sm text-normal flex-1 truncate>{{ url }}</span>
    <span text-sm bg-get text-white rounded px-1 shadow v-show="show" @click.stop="handleRelease?.(props.id)">执行</span>
  </div>
</template>
