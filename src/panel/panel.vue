<script setup>
import { Splitpanes, Pane } from 'splitpanes'
import 'splitpanes/dist/splitpanes.css'
import { ParamsTypeMap, ActionStatusMap } from '@/constant/index'



const actionStatus = ref(0)
const requestTaskList = ref([

])
const interceptTask = ref({
  // id: 1,
  // method: 'post',
  // url: 'https://www.baidu.com',
})
const jsonParam = ref('{}')
const formDataParam = ref([])
const fileParams = ref([])
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
      let W
      panel.onShown.addListener((window) => {
        sendMessage({ type: 'switch', data: true })
        window.addEventListener('beforeunload', close)
        W = window
      })

      panel.onHidden.addListener(() => {
        close()
        W?.removeEventListener('beforeunload', close)
        chrome.runtime.onMessage.removeListener(receiveMessage);
      })
    }
  );
})



const removeRequestTaskById = (message) => {
  requestTaskList.value = requestTaskList.value.filter(task => task.id !== message.taskId)
}

const sendMessage = (message) => chrome.runtime.sendMessage({ ...message, tabId, from: 'panel' });


const close = () => sendMessage({ type: 'switch', data: false })


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
  interceptTask.value.edit = type
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
  interceptTask.value.edit = type
  actionStatus.value = ActionStatusMap.res
  switch (type) {
    // case ParamsTypeMap.FormData:
    //   formDataParam.value = [{
    //     key: 'response',
    //     type: 'file',
    //     value: [{ name: `拦截的文件${params}`, fake: true }],
    //   }]
    //   break;
    case ParamsTypeMap.File:
      fileParams.value = [{
        ...params,
        fake: true,
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
  const data = { taskId: interceptTask.value.id, paramsType: interceptTask.value.edit }
  switch (interceptTask.value.edit) {
    case ParamsTypeMap.FormData:
      data.params = await formDataToJson()
      break;
    case ParamsTypeMap.File:
      data.params = await createFileObj(fileParams.value[0] ?? {})
      break
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
    fileParams.value = []
  }
}, 250)


const createFileObj = async (data) => {
  let result = ''
  const { raw, name, fake } = data
  if (fake) {
    result = {
      __file__: true,
      fake
    }
  }
  if (raw) {
    result = {
      __file__: true,
      base64: await fileToBase64(raw),
      name,
    }
  }
  return result
}


const formDataToJson = async () => {
  const json = {}
  for (const item of formDataParam.value) {
    if (item.type === 'file') {
      const [data = {}] = item.value
      json[item.key] = await createFileObj(data)
    } else {
      json[item.key] = item.value
    }
  }
  return json
}



provide(API_LIST, requestTaskList)
provide(CURRENT_API, interceptTask)
provide(JSON_PARAMS, jsonParam)
provide(FORMDATA_PARAMS, formDataParam)
provide(FILE_PARAMS, fileParams)
provide(PARAMS_TEXT, paramsText)
provide(INTERCEPT_ACTIVE, isIntercepting)
provide(INTERCEPT_API, handleIntercept)
provide(RELEASE_API, handleRelease)
provide(RELEASE_ALL_API, handleReleaseAll)
provide(NEXT_STEP, handleNext)





</script>

<template>
  <div h-screen box-border>
    <splitpanes class="default-theme">
      <pane :max-size="50" :size="25">
        <PaneLeft />
      </pane>
      <pane>
        <PaneContent />
      </pane>
    </splitpanes>
  </div>
</template>

<style scoped>
::v-deep(.splitpanes.default-theme .splitpanes__pane) {
  background-color: #fff;
}
</style>
