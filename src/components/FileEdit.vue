<script lang='ts' setup>
import { UploadFilled } from '@element-plus/icons-vue'
const file = defineModel('file')

</script>
<template>
  <el-upload drag action="#" :auto-upload="false" v-model:file-list="file" :limit="1">
    <el-icon class="el-icon--upload"><upload-filled /></el-icon>
    <div class="el-upload__text">
      Drop file here or <em class="!text-primary">click to upload</em>
    </div>
  </el-upload>
</template>
<style scoped>
::v-deep(.el-upload-dragger) {
  border: none;
  border-top: 1px solid #f2f4f7 !important;
  border-radius: unset;
}

::v-deep(.el-upload):focus {
  border-color: transparent;
  color: transparent;
}

:v-deep(.el-upload:focus .el-upload-dragger) {
  border-color: #9373EE;
}
</style>