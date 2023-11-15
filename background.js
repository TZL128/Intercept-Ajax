chrome.runtime.onInstalled.addListener(() => {
  chrome.action.setBadgeText({ text: "OFF" });
});
const openUrl = chrome.runtime.getURL("intercept.html");

const interceptFunc = (openUrl) => {
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

    if (["GET"].includes(method)) {
      handleGet(url, task);
    }
    if (["POST"].includes(method)) {
      handlePost(url, task);
    }
  };

  const handleGet = (url, task) => {
    openTab(`${openUrl}?${url}`);
  };

  const handlePost = (url, task) => {
    let str = "?";
    for (const [k, v] of Object.entries(JSON.parse(task.send_params || "{}"))) {
      str += `${k}=${v}&`;
    }
    openTab(`${openUrl}?${url}${str}`);
  };

  const openTab = (url) => {
    const tab = window.open();
    tab.location.href = url;
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
      openTab(`${openUrl}?${super.responseText}`);
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
      task.open(method, isGet ? content : url, async);
      task.setRequestHeader_params.forEach(([key, value]) => {
        task.setRequestHeader(key, value);
      });
      if (!isGet) {
        const [, jsonStr] = content.split("?");
        let obj = jsonStr
          .slice(0, -1)
          .split("&")
          .reduce((pre, cur) => {
            const [k, v] = cur.split("=");
            pre[k] = v;
            return pre;
          }, {});
        task.send_params = JSON.stringify(obj);
      }
      task.send(task.send_params);
    };
    window.addEventListener("request_intercept", fn);
  };
  HttpRequest.interceptors.response = (cb = () => {}) => {
    const fn = (e) => {
      window.removeEventListener("response_intercept", fn);
      cb(e.detail);
    };
    window.addEventListener("response_intercept", fn);
  };

  window.OriginXMLHttpRequest = window.XMLHttpRequest;
  window.XMLHttpRequest = HttpRequest;
  console.log(
    "%c插件开启拦截",
    `background-color:#1296db;
    border-radius:3px;
    border:1px solid #ccc;
    padding:2px 4px;
    color:#fff;`
  );
};
const originFunc = () => {
  window[Symbol.for("requestTask")].forEach((task) =>
    dispatchTask(true, task.id)
  );
  window[Symbol.for("requestTask")].length = 0;
  window.XMLHttpRequest = window.OriginXMLHttpRequest;
  delete window.OriginXMLHttpRequest;
  console.log(
    "%c插件关闭拦截",
    `background-color:red;
    border-radius:3px;
    border:1px solid #ccc;
    padding:2px 4px;
    color:#fff;`
  );
};
const funMap = {
  ON: interceptFunc,
  OFF: originFunc,
};

chrome.action.onClicked.addListener(async (tab) => {
  const prevState = await chrome.action.getBadgeText({ tabId: tab.id });
  const nextState = prevState === "ON" ? "OFF" : "ON";
  chrome.scripting
    .executeScript({
      target: { tabId: tab.id },
      func: funMap[nextState],
      args: [openUrl],
      world: "MAIN",
    })
    .then(() => {
      chrome.action.setBadgeText({
        tabId: tab.id,
        text: nextState,
      });
    })
    .catch((e) => {
      console.log(e);
    });
});

chrome.runtime.onMessage.addListener((message) => {
  try {
    const task = JSON.parse(message);
    PORT && PORT.postMessage(task);
  } catch (error) {
    chrome.tabs.query(
      {
        currentWindow: true,
      },
      (tabs) => {
        const [target] = tabs.filter((t) => t.active);
        chrome.scripting.executeScript({
          target: { tabId: tabs[target.index - 1].id }, //找到之前发请求的tab
          func: (message) => {
            const [isReq, content] = message.split("@_@");
            if (isReq === "true") {
              window.dispatchEvent(
                new CustomEvent("request_intercept", {
                  detail: { content },
                })
              );
            }
            if (isReq === "false") {
              window.dispatchEvent(
                new CustomEvent("response_intercept", { detail: content })
              );
            }
          },
          args: [message],
          world: "MAIN",
        });
      }
    );
  }
});

let PORT = null; //连接dev pannel
chrome.runtime.onConnect.addListener(function (port) {
  PORT = port;
  const extensionListener = function (message) {
    chrome.scripting.executeScript({
      target: { tabId: message.tabId },
      func: (isRelease, taskId) => {
        dispatchTask(isRelease, taskId);
      },
      world: "MAIN",
      args: [message.name === "release", message.taskId],
    });
  };
  port.onMessage.addListener(extensionListener);
  port.onDisconnect.addListener(function (port) {
    port.onMessage.removeListener(extensionListener);
    PORT = null;
  });
});
