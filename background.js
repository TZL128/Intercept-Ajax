chrome.runtime.onInstalled.addListener(() => {
  chrome.action.setBadgeText({ text: "OFF" });
});
const openUrl = chrome.runtime.getURL("intercept.html");
let Tab = null;

const interceptFunc = (openUrl) => {
  const openTab = (url) => {
    const tab = window.open();
    tab.location.href = url;
  };

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
        if (this.readyState === 4) {
          openTab(`${openUrl}?${super.responseText}`);
          const t = setInterval(() => {
            if (window.InterceptAjaxResponseText) {
              this.responseText = window.InterceptAjaxResponseText;
              fn && fn();
              window.InterceptAjaxResponseText = "";
              clearInterval(t);
            }
          }, 250);
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
        openTab(`${openUrl}?${this._url}${str}`);
        const t = setInterval(() => {
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
            window.InterceptAjaxResponseText = "";
            clearInterval(t);
          }
        }, 250);
      } else {
        const fn = () => {
          super.send(params);
          window.removeEventListener("request-intercept", fn);
        };
        window.addEventListener("request-intercept", fn);
      }
      this._flag = false;
      this._url = "";
    }

    open(method, url, async) {
      if (["GET", "HEAD"].includes(method.toLocaleUpperCase())) {
        openTab(`${openUrl}?${url}`);
        const t = setInterval(() => {
          if (window.InterceptAjaxResponseText) {
            super.open(method, `${window.InterceptAjaxResponseText}`, async);
            window.dispatchEvent(new CustomEvent("setHeader-intercept"));
            window.dispatchEvent(new CustomEvent("request-intercept"));
            window.InterceptAjaxResponseText = "";
            clearInterval(t);
          }
        }, 250);
      }
      if (["POST", "PUT"].includes(method.toLocaleUpperCase())) {
        this._flag = true;
        this._url = url;
        super.open(method, url, async);
      }
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
