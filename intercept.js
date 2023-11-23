window.onload = () => {
  const textarea = document.querySelector("#textarea");
  const button = document.querySelector("#button");
  const tip = document.querySelector(".tip");

  const [type, url, parmas] = decodeURIComponent(
    window.location.search.slice(1)
  )
    .trim()
    .split("?");
  const request = type === "req";
  if (request) {
    const obj = parmas.split("&").reduce((pre, cur) => {
      const [k, v] = cur.split("=");
      pre[k] = v;
      return pre;
    }, {});
    tip.textContent = `url：${url}`;
    textarea.value = JSON.stringify(obj, null, 2);
  } else {
    try {
      textarea.value = JSON.stringify(JSON.parse(url), null, 2);
    } catch (error) {
      textarea.value = url;
    }
  }

  button.onclick = () => {
    try {
      if (textarea.value) {
        let Message = textarea.value;
        const MessageObj = JSON.parse(Message);
        if (request) {
          let str = "";
          for (const [k, v] of Object.entries(MessageObj)) {
            str += `${k}=${v}&`;
          }
          Message = `${url}?${str}`;
        }
        chrome.runtime
          .sendMessage(`${request}@_@${Message}`)
          .then(() => window.close())
          .catch((e) => {
            console.log("关闭失败", e);
          });
      }
    } catch (error) {
      if (/position\s\d+$/.test(error.message) && textarea.setSelectionRange) {
        const position = error.message.replace(/[^0-9]/g, "");
        textarea.focus();
        textarea.setSelectionRange(-1, position);
      }
      textarea.classList.add("shake");
      const originTip = tip.textContent;
      tip.textContent = error.message;
      setTimeout(() => {
        textarea.classList.remove("shake");
        tip.textContent = originTip;
      }, 800);
    }
  };
};
