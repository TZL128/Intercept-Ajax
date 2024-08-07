<script setup>
import { Open } from '@element-plus/icons-vue'


/**
 * 0未操作
 * 1请求拦截
 * 2响应拦截
 */
const ActionStatusMap = {
  normal: 0,
  req: 1,
  res: 2
}
const ParamsTypeMap = {
  Json: 'Json',
  FormData: 'FormData'
}
const actionStatus = ref(0)
const requestTaskList = ref([
  // {
  //   id: 1,
  //   method: 'GET',
  //   url: 'https://www.baidu.com',
  // }
])
const interceptTask = ref({})
const jsonParam = ref('{}')
const formDataParam = ref([])
const paramsType = ref()
const isLegal = ref(true)
const tabId = chrome.devtools.inspectedWindow.tabId

const paramsText = computed(() => {
  if (actionStatus.value === ActionStatusMap.req) {
    return '请求参数'
  }
  if (actionStatus.value === ActionStatusMap.res) {
    return '响应参数'
  }
  return ''
})

const isIntercepting = computed(() => !!interceptTask.value.id)

onMounted(() => {
  const receiveMessage = (data) => {
    const { from, message, key, messageType } = data
    if (from !== 'content') {
      return
    }
    paramsType.value = messageType
    switch (key) {
      case 'render-request-task':
        requestTaskList.value.push(message)
        break;
      case 'remove-request-task':
        removeRequestTaskById(message)
        break;
      case "request-params":
        handleRequestParams(message, messageType)
        break;
      case "response-params":
        handleResponseParams(message, messageType)
        break
    }

  }

  chrome.runtime.onMessage.addListener(receiveMessage);

  chrome.devtools.panels.create(
    "Intercept-Ajax",
    "",
    "panel.html",
    function (panel) {
      panel.onShown.addListener(() => {
        sendMessage({ type: 'switch', data: true })
      })

      panel.onHidden.addListener(() => {
        sendMessage({ type: 'switch', data: false })
        chrome.runtime.onMessage.removeListener(receiveMessage);
      })
    }
  );
})

const removeRequestTaskById = (message) => {
  requestTaskList.value = requestTaskList.value.filter(task => task.id !== message.taskId)
}

const sendMessage = (message) => chrome.runtime.sendMessage({ ...message, tabId, from: 'panel' });


const handleRelease = (taskId) => {
  requestTaskList.value = requestTaskList.value.filter(task => task.id !== taskId)
  sendMessage({
    type: 'release-task',
    data: { taskId }
  })
}

const handleReleaseAll = () => sendMessage({
  type: 'release-all',
})

const handleIntercept = (task) => {
  interceptTask.value = task
  sendMessage({
    type: 'intercept-task',
    data: { taskId: task.id }
  })
}

const handleRequestParams = (params, type) => {
  actionStatus.value = ActionStatusMap.req
  switch (type) {
    case ParamsTypeMap.FormData:
      formDataParam.value = Object.keys(params).map(key => {
        let value = params[key]
        let type = Object.prototype.toString.call(value).slice(8, -1).toLowerCase()
        if (value.__file__) {
          value = [{ name: value.name, fake: true }] //打上fake标记，表示这个文件是传过来的，后续根据这个标记处理数据
          type = 'file'
        }
        return {
          key,
          type,
          value
        }
      })
      break;
    default:
      jsonParam.value = JSON.stringify(params, null, 2)
      break;
  }

}

const handleResponseParams = (params, type) => {
  actionStatus.value = ActionStatusMap.res
  switch (type) {
    case ParamsTypeMap.FormData:
      formDataParam.value = [{
        key: 'response',
        type: 'file',
        value: [{ name: `拦截的文件${params}`, fake: true }],
      }]
      break;
    default:
      jsonParam.value = JSON.stringify(params, null, 2)
      break;
  }
}

const handleNext = useDebounceFn(async () => {
  const typeMap = {
    [ActionStatusMap.req]: 'request-params',
    [ActionStatusMap.res]: 'response-params'
  }
  const data = { taskId: interceptTask.value.id, paramsType: paramsType.value }
  switch (paramsType.value) {
    case ParamsTypeMap.FormData:
      data.params = await formDataToJson()
      break;
    case ParamsTypeMap.Json:
      data.params = JSON.parse(jsonParam.value)
      break
  }
  sendMessage({
    type: typeMap[actionStatus.value],
    data
  })
  //将当前拦截的任务清掉，还原状态
  if (actionStatus.value === ActionStatusMap.res) {
    requestTaskList.value = requestTaskList.value.filter(task => task.id !== interceptTask.value.id)
    interceptTask.value = {}
    actionStatus.value = ActionStatusMap.normal
    jsonParam.value = '{}'
    formDataParam.value = []
  }
}, 250)


const formDataToJson = async () => {
  const json = {}
  for (const item of formDataParam.value) {
    if (item.type === 'file') {
      const [{ raw, name, fake } = {}] = item.value
      json[item.key] = '' //当类型是file并且没有选择文件，value为空字符串.
      if (fake) {
        json[item.key] = {
          __file__: true,
          fake
        }
      }
      if (raw) {
        json[item.key] = {
          __file__: true,
          base64: await fileToBase64(raw),
          name,
        }
      }
    } else {
      json[item.key] = item.value
    }
  }
  return json
}

const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  })
}

const base64ToFile = (base64, fileName) => {
  //将base64转换为blob
  const dataURLtoBlob = function (dataurl) {
    let arr = dataurl.split(","),
      mime = arr[0].match(/:(.*?);/)[1],
      bstr = atob(arr[1]),
      n = bstr.length,
      u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  };
  //将blob转换为file
  const blobToFile = function (theBlob, fileName) {
    theBlob.lastModifiedDate = new Date();
    theBlob.name = fileName;
    return new window.File([theBlob], theBlob.name, { type: theBlob.type });
  };
  //调用
  const blob = dataURLtoBlob(base64);
  const file = blobToFile(blob, fileName);

  return file;
};

const tableRowClassName = ({ row }) => {
  if (row.id === interceptTask.value.id) {
    return 'text-primary'
  }
  return ''
}



</script>

<template>
  <div h-screen box-border p-2.5>
    <div v-if="requestTaskList.length">
      <Title>
        <div flex items-center justify-between>
          <span>请求列表</span>
          <el-tooltip class="box-item" effect="light" content="全部放行" placement="left">
            <el-icon cursor-pointer :size="20" color="#e51400" @click="handleReleaseAll" v-show="!isIntercepting">
              <Open />
            </el-icon>
          </el-tooltip>

        </div>
      </Title>
      <div>
        <el-table :data="requestTaskList" w-full height="300" :row-class-name="tableRowClassName">
          <el-table-column type="index" width="60" label="序号" />
          <el-table-column prop="method" label="请求方式" width="100">
            <template #default="{ row }">
              <span :class="[row.method === 'GET' ? 'text-suc' : 'text-err']">{{ row.method }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="url" label="请求URL" />
          <el-table-column label="操作" width="100">
            <template #default="{ row }">
              <div v-if="!isIntercepting">
                <span mr-2.5 cursor-pointer @click="handleRelease(row.id)">放行</span>
                <span text-primary cursor-pointer @click="handleIntercept(row)">拦截</span>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </div>
      <div v-show="actionStatus !== ActionStatusMap.normal">
        <Title>
          <div flex items-center justify-between>
            <span>{{ paramsText }}</span>
            <el-button :disabled="!isLegal" type="primary" text-white color="#9373EE" size="small"
              @click="handleNext">Next</el-button>
          </div>
        </Title>
        <JsonEdit v-if="paramsType === ParamsTypeMap.Json" v-model:json="jsonParam"
          @lint-status="res => isLegal = res" />
        <FormDataEdit v-if="paramsType === ParamsTypeMap.FormData" v-model:formData="formDataParam" />
      </div>
    </div>
    <el-empty v-else description="请在页面发起请求" />
  </div>
</template>

<style scoped>
::v-deep(.el-table--fit .el-table__inner-wrapper):before {
  display: none;
}
</style>
