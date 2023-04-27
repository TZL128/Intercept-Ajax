### 方式一 webRequest

permissions ['webRequest','<all_urls>']

chrome.webRequest.onCompleted.addListener()

只能拿到请求地址，状态，方法，头部，拿不到响应体

### 方式二 content_script 注入脚本改写 XML 对象

content_scripts:[
{
js:"content.js",
matches:["<all_urls>"]
}
]
"web_accessible_resources": [{
"resources": ["script.js"],
"matches": ["<all_urls>"]
}]

var s = document.createElement('script');
s.src = chrome.runtime.getURL('script.js');
s.onload = function() {
this.remove();
};
(document.head || document.documentElement).appendChild(s);

### 方式三 chrome.scripting.executeScript 改写 XML 对象(采用)

"background": {
"service_worker": "background.js"
},
"permissions": ["scripting", "activeTab"]

chrome.scripting
.executeScript({
target: { tabId: tab.id },
func: funMap[nextState],
world: "MAIN", //环境值 要开启不然默认值是 ISOLATED
})
.then((res) => {
console.log(res);
});
