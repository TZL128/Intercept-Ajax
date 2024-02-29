const debounce = (func, delay, immediate) => {
  let timeoutId;
  return function (...args) {
    const callNow = immediate && !timeoutId;
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      timeoutId = null;
      if (!immediate) {
        func.apply(this, args);
      }
    }, delay);
    if (callNow) {
      func.apply(this, args);
    }
  };
};

chrome.devtools.panels.create(
  "Intercept-Ajax",
  "",
  "panel.html",
  function (panel) {
    const tabId = chrome.devtools.inspectedWindow.tabId;
    const sendMessage = (message) =>
      chrome.runtime.sendMessage({ ...message, tabId, toBackground: true });

    const handleMessage = (message) => {
      //过滤掉发给backgorund的消息
      if (!message.toPanel) return;
      console.log("收到的", message);
      if (message.clear) {
        const taskList = document.querySelectorAll("#container .item");
        const target = Array.from(taskList).find((task) => {
          return task.dataset.id == message.id;
        });
        target && (target.style.display = "none");
        return;
      }

      const operate = (v) => {
        const interceptors = Array.from(
          document.querySelectorAll("#container .interceptors")
        );
        const releases = Array.from(
          document.querySelectorAll("#container .release")
        );
        interceptors.forEach((el, index) => {
          el.style.display = v;
          releases[index].style.display = v;
        });
      };
      if (message.name === "intercept") {
        const { params, type } = message.content;
        const container = document.querySelector("#container");
        const intercept = document.querySelector("#intercept");
        const textarea = document.querySelector("#textarea");
        const button = document.querySelector("#button");
        intercept.style.display = "block";
        textarea.value = JSON.stringify(params, null, 2);
        const shake = () => {
          textarea.classList.add("shake");
          setTimeout(() => {
            textarea.classList.remove("shake");
          }, 800);
        };

        button.onclick = () => {
          try {
            // Object.prototype.toString.call(msg) === "[object Object]"
            if (textarea.value) {
              sendMessage({
                type: "interceptor",
                value: type,
                params: JSON.parse(textarea.value),
              }).then(() => {
                textarea.value = "";
                intercept.style.display = "none";
                if (type === "response") {
                  operate("block");
                  container.style.height = "100vh";
                }
              });
              return;
            }
            shake();
          } catch (error) {
            console.log(error);
            shake();
          }
        };
        return;
      }

      const container = document.querySelector("#container");
      const task = document.createElement("div");
      const method = document.createElement("div");
      const url = document.createElement("div");
      const interceptors = document.createElement("div");
      const release = document.createElement("div");
      task.className = "item";
      task.dataset.id = message.id;
      container.appendChild(task);
      task.appendChild(method);
      task.appendChild(url);
      task.appendChild(interceptors);
      task.appendChild(release);
      method.textContent = message.method;
      url.textContent = message.url;
      interceptors.textContent = "拦截";
      release.textContent = "放行";
      method.className = "method";
      url.className = "url";
      interceptors.className = "interceptors";
      release.className = "release";

      interceptors.onclick = debounce(
        () => {
          task.className += " active";
          sendMessage({ type: "operate", value: true, params: message.id });
          operate("none");
          container.style.height = "25vh";
        },
        500,
        true
      );
      release.onclick = debounce(
        () =>
          sendMessage({ type: "operate", value: false, params: message.id }),
        500,
        true
      );
    };
    chrome.runtime.onMessage.addListener(handleMessage);

    panel.onShown.addListener((window) => {
      //配置 host_permissions
      sendMessage({ type: "switch", value: true });
    });
    panel.onHidden.addListener(() => {
      chrome.runtime.onMessage.removeListener(handleMessage);
      sendMessage({ type: "switch", value: false });
    });
  }
);
