const textarea = document.querySelector("#textarea");
const button = document.querySelector("#button");

const objstr = decodeURI(window.location.search.slice(1));
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
  if (textarea.value) {
    let Message = textarea.value;
    if (request) {
      let str = "";
      for (const [k, v] of Object.entries(JSON.parse(Message))) {
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
};
