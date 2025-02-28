
const interceptFunc = (tabId) => {
  const requestTask = Symbol.for("requestTask");
  window[requestTask] = [];

  window.interceptDispatchTask = (taskId, release) => {
    if (!window[requestTask].length) return;
    let targetTask = null;
    window[requestTask] = window[requestTask].filter((task) => {
      if (task.id === taskId) {
        task.release = release; //给当前任务挂上，是否释放标记
        targetTask = task;
      }
      return task.id !== taskId;
    });
    if (release && targetTask) {
      targetTask.open(...targetTask.openParams);
      targetTask.setRequestHeaderParams.forEach(([key, value]) => {
        targetTask.setRequestHeader(key, value);
      });
      targetTask.send(targetTask.sendParams);
      return;
    }
    /**
     * 将请求参数发送到面板改写
     */
    let params = {};
    if (!release && targetTask) {
      let messageType = "Json";
      HttpRequest.interceptorsRequest(targetTask);
      let [method, url] = targetTask.openParams;
      method = method.toUpperCase();
      if (["GET", "OPTION"].includes(method)) {
        const [, paramStr] = url.split("?");
        paramStr &&
          paramStr.split("&").forEach((item) => {
            const [key, value] = item.split("=");
            params[key] = value;
          });
      }

      if (["POST", "PUT", "DELETE", "PATCH"].includes(method)) {
        switch (Object.prototype.toString.call(targetTask.sendParams)) {
          case "[object FormData]":
            targetTask.sendParams.keys().forEach((key) => {
              const value = targetTask.sendParams.get(key);
              if (value instanceof File) {
                params[key] = {
                  name: value.name,
                  type: value.type,
                  size: value.size,
                  __file__: true,
                };
                /**
                 * 因为传过去的只有文件信息，本不是真正的文件，所以要将文件挂在任务身上，后续使用
                 */
                targetTask.files = [value];
              } else {
                params[key] = value;
              }
            });
            messageType = "FormData";
            break;
          default:
            params = JSON.parse(targetTask.sendParams ?? "{}");
            break;
        }
      }
      window.postMessage(
        {
          key: "request-params",
          message: params,
          messageType,
          sender: "intercept-ajax",
          tabId
        },
        "*"
      );
    }
  };

  const baseToBlob = (base64) => {
    let arr = base64.split(","),
      mime = arr[0].match(/:(.*?);/)[1],
      bstr = atob(arr[1]),
      n = bstr.length,
      u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  };

  const base64ToFile = (base64, fileName) => {
    //将blob转换为file
    const blobToFile = function (theBlob, fileName) {
      theBlob.lastModifiedDate = new Date();
      theBlob.name = fileName;
      return new window.File([theBlob], theBlob.name, { type: theBlob.type });
    };
    //调用
    const blob = baseToBlob(base64);
    const file = blobToFile(blob, fileName);

    return file;
  };

  // const toBase64 = (file) => {
  //   return new Promise((resolve, reject) => {
  //     const reader = new FileReader();
  //     reader.onload = () => {
  //       resolve(reader.result);
  //     };
  //     reader.onerror = reject;
  //     reader.readAsDataURL(file);
  //   });
  // };

  const getFileName = (xhr) => {
    const contentDisposition = xhr.getResponseHeader("Content-Disposition");
    let filename = "未知文件";
    if (contentDisposition && contentDisposition.includes("filename=")) {
      const filenameRegex = /filename\*=([^']+)/;
      const matches = filenameRegex.exec(contentDisposition);
      if (matches && matches[1]) {
        // 使用decodeURIComponent解码文件名
        filename = decodeURIComponent(matches[1].replace("UTF-8''", ""));
      } else {
        // 处理没有使用UTF-8编码的情况
        filename = contentDisposition
          .split("filename=")[1]
          .split(";")[0]
          .trim();
      }
    }
    return filename;
  };

  const jsonToFormData = (json, files) => {
    const formData = new FormData();
    for (let key in json) {
      if (json.hasOwnProperty(key)) {
        const value = json[key];
        if (value.__file__) {
          value.fake
            ? formData.append(key, files[0])
            : formData.append(key, base64ToFile(value.base64, value.name));
        } else {
          formData.append(key, value);
        }
      }
    }
    return formData;
  };

  class HttpRequest extends window.XMLHttpRequest {
    constructor() {
      super();
      this.pushTask();
      this.rewrite();
    }

    set responseType(v) {
      super.responseType = v;
    }

    rewrite() {
      this.rewriteResponseText();
      this.rewriteOnreadystatechange();
      this.rewriteOnloadend();
    }

    //Cannot set property responseText,response of #<XMLHttpRequest> which has only a getter
    rewriteResponseText() {
      let responseText = "";
      Object.defineProperty(this, "responseText", {
        set(v) {
          responseText = v;
        },
        get() {
          return responseText;
        },
      });

      let response = "";
      Object.defineProperty(this, "response", {
        set(v) {
          response = v;
        },
        get() {
          return response;
        },
      });
    }

    rewriteOnreadystatechange() {
      let onreadystatechange = null;
      Object.defineProperty(this, "onreadystatechange", {
        set(fn) {
          onreadystatechange = fn;
        },
      });
      super.onreadystatechange = () => {
        if (onreadystatechange && this.readyState === 4) {
          this.taskCompleted(() => {
            /**
             * 不能写this.onreadystatechange，应为this上没有，会调用super的，导致递归爆战.
             */
            onreadystatechange();
            this.onreadystatechange = null;
            this.noticeContentScript("remove-request-task", {
              taskId: this.instance.id,
            });
          });
        }
      };
    }

    rewriteOnloadend() {
      let onloadend = null;
      Object.defineProperty(this, "onloadend", {
        set(fn) {
          onloadend = fn;
        },
      });
      super.onloadend = () => {
        if (onloadend) {
          this.taskCompleted(() => {
            onloadend();
            this.onloadend = null;
            this.noticeContentScript("remove-request-task", {
              taskId: this.instance.id,
            });
          });
        }
      };
    }

    taskCompleted(cb) {
      if (this.instance.release) {
        // 为blob的时候 没有responseText
        if (["blob"].includes(super.responseType)) {
          this.response = super.response;
        } else {
          this.responseText = super.responseText;
        }
        cb();
        return;
      }
      /**
       * 发送前先调用拦截器，监听事件
       * 将值传到面板改写
       * 当响应值被改写完成后，在执行自己身上的onloadend 活 onreadystatechange 方法
       *
       */
      HttpRequest.interceptorsResponse((data) => {
        switch (data.paramsType) {
          case "File":
            if (!data.params) {
              this.response = new Blob([]);
            }
            if (data.params.fake) {
              this.response = this.instance.files.pop();
            }
            if (data.params.base64) {
              this.response = baseToBlob(data.params.base64);
            }
            break;
          default:
            this.responseText = data.params;
            break;
        }
        cb();
      });
      //先将响应参数发送到面板改写
      let messageType = "Json",
        message = "";
      if (["blob", "arraybuffer"].includes(super.responseType)) {
        messageType = "File";
        message = { name: getFileName(this) }; //await toBase64(super.response);
        this.instance.files = [super.response]; //挂在blob挂在身上
      } else {
        message = JSON.parse(super.responseText);
      }
      this.noticeContentScript("response-params", message, messageType);
    }

    pushTask() {
      this.instance = {};
      this.instance.id = Math.floor(Math.random() * 1000000000);
      window[requestTask].push(this.instance);
    }

    open(method, url, async) {
      this.instance.open = (method, url, async) =>
        super.open(method, url, async);
      this.instance.openParams = [method, url, async];
    }

    setRequestHeader(name, value) {
      !this.instance.setRequestHeader &&
        (this.instance.setRequestHeader = (name, value) =>
          super.setRequestHeader(name, value));

      this.instance.setRequestHeaderParams = Array.isArray(
        this.instance.setRequestHeaderParams
      )
        ? [...this.instance.setRequestHeaderParams, [name, value]]
        : [[name, value]];
    }

    send(body) {
      this.instance.send = (body) => super.send(body);
      this.instance.sendParams = body;
      const [method, u] = this.instance.openParams;
      const [url] = u.split("?");
      this.noticeContentScript("render-request-task", {
        method,
        url,
        id: this.instance.id,
      });
    }

    noticeContentScript(key, message, messageType = "Json") {
      window.postMessage(
        { key, message, messageType, sender: "intercept-ajax", tabId },
        "*"
      );
    }
  }

  HttpRequest.interceptorsRequest = (task) => {
    const cb = (event) => {
      const { params, paramsType } = event.detail;
      const [method, url, async] = task.openParams;
      const isGet = method.toUpperCase() === "GET";
      let getUrl = "";
      if (isGet) {
        [getUrl] = url.split("?");
        getUrl += `?${decodeURIComponent(
          new URLSearchParams(params).toString()
        )}`;
      }
      task.open(method, isGet ? getUrl : url, async);
      task.setRequestHeaderParams.forEach(([key, value]) =>
        task.setRequestHeader(key, value)
      );
      if (!isGet) {
        switch (paramsType) {
          case "Json":
            task.sendParams = JSON.stringify(params);
            break;
          case "FormData":
            task.sendParams = jsonToFormData(params, task.files);
            break;
        }
      }
      task.send(task.sendParams);
    };
    window.addEventListener("interceptors-request", cb, { once: true });
  };

  HttpRequest.interceptorsResponse = (callback = () => { }) => {
    const cb = (e) => {
      callback(e.detail);
    };
    window.addEventListener("interceptors-response", cb, { once: true });
  };

  window.originXMLHttpRequest = window.XMLHttpRequest;
  window.XMLHttpRequest = HttpRequest;
};

const originFunc = () => {
  if (!window.originXMLHttpRequest) {
    return
  }
  const list = window[Symbol.for("requestTask")] ?? []
  list.forEach((task) =>
    interceptDispatchTask(task.id, true)
  );
  list.length = 0;
  window.XMLHttpRequest = window.originXMLHttpRequest;
  delete window.originXMLHttpRequest;
};


const executeScript = (func, args, tabId) => {
  return new Promise((resolve, reject) => {
    try {
      chrome.scripting.executeScript({
        target: { tabId },
        world: "MAIN",
        func,
        args,
      }, resolve);
    } catch (error) {
      reject(error)
    }
  })
}



const releaseAll = () => {
  window[Symbol.for("requestTask")].forEach((task) =>
    interceptDispatchTask(task.id, true)
  );
  window[Symbol.for("requestTask")].length = 0;
};

const resetPanel = (tabId) => {
  window.postMessage({
    key: 'reset-panel',
    sender: 'intercept-ajax',
    tabId
  }, '*')
}


const TabActiveMap = new Map()
chrome.runtime.onMessage.addListener((message) => {
  if (message.from !== "panel") {
    return;
  }
  const tabId = message.tabId
  switch (message.type) {
    case "switch":
      TabActiveMap.set(tabId, message.data)
      executeScript(
        message.data ? interceptFunc : originFunc,
        [tabId],
        tabId
      );
      break;
    case "release-task":
      executeScript(
        (taskId, release) => interceptDispatchTask(taskId, release),
        [message.data.taskId, true],
        tabId
      );
      break;
    case "release-all":
      executeScript(releaseAll, [], tabId);
      break;
    case "intercept-task":
      executeScript(
        (taskId, release) => interceptDispatchTask(taskId, release),
        [message.data.taskId, false],
        tabId
      );
      break;
    case "request-params":
      executeScript(
        (data) =>
          window.dispatchEvent(
            new CustomEvent("interceptors-request", {
              detail: { params: data.params, paramsType: data.paramsType },
            })
          ),
        [message.data],
        tabId
      );
      break;
    case "response-params":
      executeScript(
        (data) =>
          window.dispatchEvent(
            new CustomEvent("interceptors-response", {
              detail: { params: data.params, paramsType: data.paramsType },
            })
          ),
        [message.data],
        tabId
      );
      break;
  }
});

//检测页面刷新完成
chrome.webNavigation.onCompleted.addListener(async (detail) => {
  const tabId = detail.tabId
  if (TabActiveMap.get(tabId)) {
    await executeScript(originFunc, [], tabId)
    executeScript(interceptFunc, [tabId], tabId)
    executeScript(resetPanel, [tabId], tabId)
  }
});
