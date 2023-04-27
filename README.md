### 安装
并没有发布上线，初心是写来方便自己。如果你也想用可以clone，并在chorme扩展中加载已解压的扩展程序即可。
### 使用
安装后建议置顶插件;ctrl+z 控制开启或者关闭拦截;也可以点击图标。

拦截到请求后会新打开一个页面，请在页面中编辑好数据后点击提交（第一次弹出页面是请求数据，第二次是响应的数据）

### 思路

**方式一 webRequest**

permissions ['webRequest','<all_urls>']

chrome.webRequest.onCompleted.addListener()

只能拿到请求地址，状态，方法，头部，拿不到响应体

**方式二 content_script 注入脚本改写 XML 对象**

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

**方式三 chrome.scripting.executeScript 改写 XML 对象(采用)**

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
