chrome.devtools.panels.create(
  "Intercept-Ajax",
  "",
  "panel.html",
  function (panel) {
    const render = (message) => {
      console.log("收到的", message);
      if (message.clear) {
        const taskList = document.querySelectorAll("#container .item");
        const target = Array.from(taskList).find((task) => {
          return task.dataset.id == message.id;
        });
        target && (target.style.display = "none");
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
      interceptors.onclick = () => {
        //拦截
        port.postMessage({
          name: "interceptors",
          tabId: chrome.devtools.inspectedWindow.tabId,
          taskId: message.id,
        });
      };
      release.onclick = () => {
        //放行
        port.postMessage({
          name: "release",
          tabId: chrome.devtools.inspectedWindow.tabId,
          taskId: message.id,
        });
      };
    };
    const port = chrome.runtime.connect({ name: "devtools" });
    // 监听后台页面消息
    port.onMessage.addListener(render);
    panel.onShown.addListener((window) => {});
    panel.onHidden.addListener(() => {});
  }
);
