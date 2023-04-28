chrome.runtime.onInstalled.addListener(() => {
  chrome.action.setBadgeText({ text: "OFF" });
});
const openUrl = chrome.runtime.getURL("intercept.html");
let Tab = null;

const interceptFunc = (openUrl) => {
  class HttpRequest extends window.XMLHttpRequest {
    constructor() {
      super(...arguments);
      this.onreadystatechange = null;
      let responseText = "";
      this._flag = false;
      this._url = "";
      Object.defineProperty(this, "responseText", {
        get() {
          return responseText;
        },
        set(v) {
          responseText = v;
        },
      });
      let fn = this.onreadystatechange;
      Object.defineProperty(this, "onreadystatechange", {
        set(v) {
          fn = v;
        },
      });
      super.onreadystatechange = () => {
        if (this.readyState === 4 && this.status === 200) {
          window.open(`${openUrl}?${super.responseText}`);
          window.alert("编辑响应值完毕，请点击确定");
          setTimeout(() => {
            this.responseText =
              window.InterceptAjaxResponseText || super.responseText;
            fn && fn();
          }, 10);
        }
      };
    }
    setRequestHeader(...header) {
      if (this._flag) {
        return super.setRequestHeader(...header);
      }
      const fn = () => {
        super.setRequestHeader(...header);
        window.removeEventListener("setHeader-intercept", fn);
      };
      window.addEventListener("setHeader-intercept", fn);
    }
    send(params) {
      if (this._flag) {
        let str = "?";
        for (const [k, v] of Object.entries(JSON.parse(params))) {
          str += `${k}=${v}&`;
        }
        window.open(`${openUrl}?${this._url}${str}`);
        window.alert("编辑请求参数完毕，请点击确定");
        setTimeout(() => {
          if (window.InterceptAjaxResponseText) {
            const [, paramstr] = window.InterceptAjaxResponseText.split("?");
            let obj = paramstr
              .slice(0, -1)
              .split("&")
              .reduce((pre, cur) => {
                const [k, v] = cur.split("=");
                pre[k] = v;
                return pre;
              }, {});
            super.send(JSON.stringify(obj));
          } else {
            super.send(params);
          }
        }, 10);
      } else {
        const fn = () => {
          super.send(params);
          window.removeEventListener("request-intercept", fn);
        };
        window.addEventListener("request-intercept", fn);
      }
      this._flag = false;
      this._url = "";

      // return super.send(params);
    }

    open(method, url, async) {
      if (["GET", "HEAD"].includes(method.toLocaleUpperCase())) {
        window.open(`${openUrl}?${url}`);
        window.alert("编辑请求参数完毕，请点击确定");
        setTimeout(() => {
          super.open(
            method,
            `${window.InterceptAjaxResponseText || url}`,
            async
          );
          window.dispatchEvent(new CustomEvent("setHeader-intercept"));
          window.dispatchEvent(new CustomEvent("request-intercept"));
        }, 10);
      }
      if (["POST", "PUT"].includes(method.toLocaleUpperCase())) {
        this._flag = true;
        this._url = url;
        super.open(method, url, async);
      }
      // return super.open(method, url, async);
    }
  }
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
  window.XMLHttpRequest = window.OriginXMLHttpRequest;
  delete window.OriginXMLHttpRequest;
  delete window.InterceptAjaxResponseText;
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
  !Tab && (Tab = tab);
  const prevState = await chrome.action.getBadgeText({ tabId: tab.id });
  const nextState = prevState === "ON" ? "OFF" : "ON";
  await chrome.action.setBadgeText({
    tabId: tab.id,
    text: nextState,
  });
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: funMap[nextState],
    args: [openUrl],
    world: "MAIN",
  });
});

chrome.runtime.onMessage.addListener((message) => {
  chrome.scripting.executeScript({
    target: { tabId: Tab.id },
    func: (message) => {
      if (message.startsWith("{") && message.endsWith("}")) {
        window.InterceptAjaxResponseText = JSON.stringify(
          JSON.parse(message),
          null,
          2
        );
        return;
      }
      window.InterceptAjaxResponseText = message;
    },
    args: [message],
    world: "MAIN",
  });
});
