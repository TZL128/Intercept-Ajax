const textarea = document.querySelector("#textarea");
const button = document.querySelector("#button");
const tip = document.querySelector(".tip");

const objstr = decodeURIComponent(window.location.search.slice(1)).trim();
let url, parmas, request;
// console.log(objstr);
if (objstr) {
  if (objstr.startsWith("{") && objstr.endsWith("}")) {
    request = false;
    textarea.value = JSON.stringify(JSON.parse(objstr), null, 2);
  } else {
    request = true;
    [url, parmas = ""] = objstr.split("?");
    const obj = parmas.split("&").reduce((pre, cur) => {
      const [k, v] = cur.split("=");
      pre[k] = v;
      return pre;
    }, {});
    textarea.value = JSON.stringify(obj, null, 2);
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
        .sendMessage(Message)
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
