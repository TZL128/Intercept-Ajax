const interceptFunc = () => {
  const requestTask = Symbol.for("requestTask");
  window[requestTask] = [];

  window.dispatchTask = (isRelease, taskId) => {
    if (!window[requestTask].length) return;
    dispatchTask.isRelease = isRelease;
    let task = {};
    window[requestTask] = window[requestTask].filter((item) => {
      if (item.id === taskId) {
        task = item;
      }
      return item.id !== taskId;
    });
    if (isRelease) {
      task.open(...task.open_params);
      task.setRequestHeader_params.forEach(([key, value]) => {
        task.setRequestHeader(key, value);
      });
      task.send(task.send_params);
      return;
    }
    HttpRequest.interceptors.request(task);
    let [method, url] = task.open_params;
    method = method.toLocaleUpperCase();

    const sendReqParams = (params) =>
      window.postMessage(
        {
          name: "intercept",
          content: {
            type: "request",
            params,
          },
        },
        "*"
      );
    //todo 参数类型判断
    if (["GET", "OPTION"].includes(method)) {
      const params = {};
      const [, str] = url.split("?");
      str &&
        str.split("&").forEach((item) => {
          const [k, v] = item.split("=");
          params[k] = v;
        });
      sendReqParams(params);
    }
    if (["POST", "PUT", "DELETE", "PATCH"].includes(method)) {
      sendReqParams(JSON.parse(task.send_params || "{}"));
    }
  };

  class HttpRequest extends window.XMLHttpRequest {
    constructor() {
      super(...arguments);
      this.init();
    }
    init() {
      this.requestInfo = {
        id: Math.floor(Math.random() * 999999999), //Date.now() 会有重复不知道为啥
      };
      window[requestTask].push(this.requestInfo);
      /**
       * 为了拿到实际上onreadystatechange回调
       * 不写get 是让它调用父类的onreadystatechange
       * 在再父类中调用
       */
      let readystatechangefn = null;
      Object.defineProperty(this, "onreadystatechange", {
        set(v) {
          readystatechangefn = v;
        },
      });
      super.onreadystatechange = () => {
        if (readystatechangefn && this.readyState === 4) {
          this.handleTaskEnd(() => {
            readystatechangefn();
            this.onreadystatechange = null;
            this.taskNotice(true);
          });
        }
      };

      let loadendfn = null;
      Object.defineProperty(this, "onloadend", {
        set(v) {
          loadendfn = v;
        },
      });
      super.onloadend = () => {
        if (loadendfn) {
          this.handleTaskEnd(() => {
            loadendfn();
            this.onloadend = null;
            this.taskNotice(true);
          });
        }
      };

      //Cannot set property responseText of #<XMLHttpRequest> which has only a getter
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
    handleTaskEnd(realFn) {
      if (dispatchTask.isRelease) {
        this.responseText = super.responseText;
        realFn();
        return;
      }
      HttpRequest.interceptors.response((responseText) => {
        this.responseText = responseText;
        realFn();
      });
      //todo 响应值类型判断
      window.postMessage(
        {
          name: "intercept",
          content: {
            type: "response",
            params: JSON.parse(super.responseText),
          },
        },
        "*"
      );
    }
    taskNotice(clear) {
      const [method, url] = this.requestInfo.open_params;
      window.postMessage(
        {
          name: "task",
          task: {
            id: this.requestInfo.id,
            method,
            url: url.split("?")[0],
            clear,
          },
        },
        "*"
      );
    }
    open(method, url, async) {
      this.requestInfo.open = (method, url, async) =>
        super.open(method, url, async);
      this.requestInfo.open_params = [method, url, async];
    }
    setRequestHeader(key, value) {
      !this.requestInfo.setRequestHeader &&
        (this.requestInfo.setRequestHeader = (key, value) =>
          super.setRequestHeader(key, value));
      this.requestInfo.setRequestHeader_params = Array.isArray(
        this.requestInfo.setRequestHeader_params
      )
        ? [...this.requestInfo.setRequestHeader_params, [key, value]]
        : [[key, value]];
    }
    send(jsonStr) {
      this.requestInfo.send = (jsonStr) => super.send(jsonStr);
      this.requestInfo.send_params = jsonStr;
      this.taskNotice();
    }
  }
  HttpRequest.interceptors = {};

  HttpRequest.interceptors.request = (task) => {
    const fn = (e) => {
      window.removeEventListener("request_intercept", fn);
      const { content } = e.detail;
      const [method, url, async] = task.open_params;
      const isGet = method.toLocaleUpperCase() === "GET";
      let getUrl = "";
      if (isGet) {
        [getUrl] = url.split("?");
        getUrl += "?";
      }
      for (const [k, v] of Object.entries(content)) {
        getUrl += `${k}=${v}&`;
      }
      task.open(method, isGet ? getUrl : url, async);
      task.setRequestHeader_params.forEach(([key, value]) => {
        task.setRequestHeader(key, value);
      });
      if (!isGet) {
        task.send_params = JSON.stringify(content);
      }
      task.send(task.send_params);
    };
    window.addEventListener("request_intercept", fn);
  };
  HttpRequest.interceptors.response = (cb = () => {}) => {
    const fn = (e) => {
      window.removeEventListener("response_intercept", fn);
      cb(e.detail.content);
    };
    window.addEventListener("response_intercept", fn);
  };

  window.OriginXMLHttpRequest = window.XMLHttpRequest;
  window.XMLHttpRequest = HttpRequest;
};
const originFunc = () => {
  window[Symbol.for("requestTask")].forEach((task) =>
    dispatchTask(true, task.id)
  );
  window[Symbol.for("requestTask")].length = 0;
  window.XMLHttpRequest = window.OriginXMLHttpRequest;
  delete window.OriginXMLHttpRequest;
  // delete window.dispatchTask;
};
chrome.runtime.onMessage.addListener((message) => {
  if (!message.toBackground) return;

  const messageHandle = (message) => {
    const { type, value, params } = message;
    const Map = {
      switch: {
        func: value ? interceptFunc : originFunc,
        args: [],
      },
      operate: {
        func: (value, taskId) => dispatchTask(value, taskId),
        args: [!value, params],
      },
      interceptor: {
        func: (value, content) =>
          window.dispatchEvent(
            new CustomEvent(`${value}_intercept`, { detail: { content } })
          ),
        args: [value, params],
      },
    };
    return Map[type];
  };

  chrome.scripting.executeScript({
    target: { tabId: message.tabId },
    world: "MAIN",
    ...messageHandle(message),
  });
});
