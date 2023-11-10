chrome.runtime.onInstalled.addListener(() => {
  chrome.action.setBadgeText({ text: "OFF" });
});
const openUrl = chrome.runtime.getURL("intercept.html");

const interceptFunc = (openUrl) => {
  const requestTask = Symbol.for("requestTask");
  window[requestTask] = [];

  const dispatchTask = () => {
    if (!window[requestTask].length || dispatchTask.flag) return;
    dispatchTask.flag = true;
    Promise.resolve().then(() => {
      const task = window[requestTask].shift();
      HttpRequest.interceptors.request(task);
      let [method, url] = task.open_params;
      method = method.toLocaleUpperCase();

      if (["GET"].includes(method)) {
        handleGet(url, task);
      }
      if (["POST"].includes(method)) {
        handlePost(url, task);
      }
      // dispatchTask.flag = false;
    });
  };

  const handleGet = (url, task) => {
    openTab(`${openUrl}?${url}`);
  };

  const handlePost = (url, task) => {
    let str = "?";
    for (const [k, v] of Object.entries(JSON.parse(task.send_params))) {
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
        id: new Date().getTime(),
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
          HttpRequest.interceptors.response((responseText) => {
            this.responseText = responseText;
            readystatechangefn();
            this.onreadystatechange = null;
            dispatchTask.flag = false;
            dispatchTask();
          });
          openTab(`${openUrl}?${super.responseText}`);
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
          HttpRequest.interceptors.response((responseText) => {
            this.responseText = responseText;
            loadendfn();
            this.onloadend = null;
            dispatchTask.flag = false;
            dispatchTask();
          });
          openTab(`${openUrl}?${super.responseText}`);
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
      dispatchTask();
    }
  }
  HttpRequest.interceptors = {};

  HttpRequest.interceptors.request = (task) => {
    const fn = (e) => {
      window.removeEventListener("request_intercept", fn);
      const { isGet, content } = e.detail;
      const [method, url, async] = task.open_params;
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
  window[Symbol.for("requestTask")] = [];
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
                detail: { content, isGet: true },
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
});
