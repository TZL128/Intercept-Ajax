const interceptFunc = () => {
  const requestTask = Symbol.for("requestTask");
  window[requestTask] = [];

  window.intercepterDispatchTask = (taskId, release) => {
    if (!window[requestTask].length) return;
    let targetTask = null;
    window[requestTask].filter((task) => {
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
        params = JSON.parse(targetTask.sendParams ?? "{}");
      }
      window.postMessage(
        { key: "request-params", message: params, sender: "intercept-ajax" },
        "*"
      );
    }
  };

  class HttpRequest extends window.XMLHttpRequest {
    constructor() {
      super();
      this.pushTask();
      this.rewrite();
    }

    rewrite() {
      this.rewriteResponseText();
      this.rewriteOnreadystatechange();
      this.rewriteOnloadend();
    }

    //Cannot set property responseText of #<XMLHttpRequest> which has only a getter
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
        this.responseText = super.responseText;
        cb();
        return;
      }
      /**
       * 发送前先调用拦截器，监听事件
       * 将值传到面板改写
       * 当响应值被改写完成后，在执行自己身上的onloadend 活 onreadystatechange 方法
       *
       */
      HttpRequest.interceptorsResponse((responseText) => {
        this.responseText = responseText;
        cb();
      });
      //先将响应参数发送到面板改写
      this.noticeContentScript(
        "response-params",
        JSON.parse(super.responseText)
      );
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

    noticeContentScript(key, message) {
      window.postMessage({ key, message, sender: "intercept-ajax" }, "*");
    }
  }
  HttpRequest.interceptorsRequest = (task) => {
    const cb = (event) => {
      window.removeEventListener("interceptors-request", cb);
      const parmas = event.detail;
      const [method, url, async] = task.openParams;
      const isGet = method.toUpperCase() === "GET";
      let getUrl = "";
      if (isGet) {
        [getUrl] = url.split("?");
        getUrl += `?${new URLSearchParams(parmas).toString()}`;
      }
      task.open(method, isGet ? getUrl : url, async);
      task.setRequestHeaderParams.forEach(([key, value]) =>
        task.setRequestHeader(key, value)
      );
      if (!isGet) {
        task.sendParams = JSON.stringify(parmas);
      }
      task.send(task.sendParams);
    };
    window.addEventListener("interceptors-request", cb);
  };

  HttpRequest.interceptorsResponse = (callback = () => {}) => {
    const cb = (e) => {
      window.removeEventListener("interceptors-response", cb);
      callback(e.detail);
    };
    window.addEventListener("interceptors-response", cb);
  };

  window.OriginXMLHttpRequest = window.XMLHttpRequest;
  window.XMLHttpRequest = HttpRequest;
};

const originFunc = () => {
  window[Symbol.for("requestTask")].forEach((task) =>
    intercepterDispatchTask(task.id, true)
  );
  window[Symbol.for("requestTask")].length = 0;
  window.XMLHttpRequest = window.OriginXMLHttpRequest;
  delete window.OriginXMLHttpRequest;
};

const executeScript = (func, args, tabId) => {
  chrome.scripting.executeScript({
    target: { tabId },
    world: "MAIN",
    func,
    args,
  });
};

const releaseAll = () => {
  window[Symbol.for("requestTask")].forEach((task) =>
    intercepterDispatchTask(task.id, true)
  );
  window[Symbol.for("requestTask")].length = 0;
};

chrome.runtime.onMessage.addListener((message) => {
  if (message.from !== "panel") {
    return;
  }

  switch (message.type) {
    case "switch":
      executeScript(
        message.data ? interceptFunc : originFunc,
        [],
        message.tabId
      );
      break;
    case "release-task":
      executeScript(
        (taskId, release) => intercepterDispatchTask(taskId, release),
        [message.data.taskId, true],
        message.tabId
      );
      break;
    case "release-all":
      executeScript(releaseAll, [], message.tabId);
      break;
    case "intercept-task":
      executeScript(
        (taskId, release) => intercepterDispatchTask(taskId, release),
        [message.data.taskId, false],
        message.tabId
      );
      break;
    case "request-params":
      executeScript(
        (data) =>
          window.dispatchEvent(
            new CustomEvent("interceptors-request", {
              detail: data.params,
            })
          ),
        [message.data],
        message.tabId
      );
      break;
    case "response-params":
      executeScript(
        (data) =>
          window.dispatchEvent(
            new CustomEvent("interceptors-response", {
              detail: data.params,
            })
          ),
        [message.data],
        message.tabId
      );
      break;
  }
});