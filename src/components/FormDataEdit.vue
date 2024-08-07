<script lang='ts' setup>

const data = defineModel('formData')

const TypeOptions = ['string', 'number', 'boolean', 'file', 'array']
const BooleanOptions = [true, false]

const changeType = (v, row) => {
  if (v === 'file') {
    row.value = []
  } else {
    row.value = ''
  }
}
</script>
<template>
  <el-table :data="data" style="width: 100%" border>
    <el-table-column prop="key" label="参数名" width="200">
      <template #default="{ row }">
        <el-input v-model="row.key" placeholder="参数名"></el-input>
      </template>
    </el-table-column>
    <el-table-column prop="value" label="参数值">
      <template #default="{ row }">
        <template v-if="['string', 'number'].includes(row.type)">
          <el-input v-model="row.value" placeholder="参数值"></el-input>
        </template>
        <template v-if="['boolean'].includes(row.type)">
          <el-select v-model="row.value" placeholder="参数值" style="width: 100%">
            <el-option v-for=" item in BooleanOptions" :key="item" :label="`${item}`" :value="item" />
          </el-select>
        </template>
        <template v-if="['file'].includes(row.type)">
          <el-upload ref="uploadRef" class="upload-demo" action="#" :auto-upload="false" v-model:file-list="row.value">
            <template #trigger>
              <span class="border border-solid border-#dcdfe6 px-1 rounded text-pink">上传</span>
            </template>
          </el-upload>
        </template>
      </template>
    </el-table-column>
    <el-table-column prop="type" label="类型" width="200">
      <template #default="{ row }">
        <el-select v-model="row.type" style="width: 100%" @change="v => changeType(v, row)">
          <el-option v-for=" item in TypeOptions" :key="item" :label="item" :value="item" />
        </el-select>
      </template>
    </el-table-column>
  </el-table>
</template>
