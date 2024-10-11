window.addEventListener("message", (event) => {
  const { key, message, messageType, sender, tabId } = event.data;
  if (sender !== "intercept-ajax") {
    return;
  }
  switch (key) {
    case "render-request-task":
    case "remove-request-task":
    case "request-params":
    case "response-params":
      try {
        chrome.runtime.sendMessage({
          message,
          messageType,
          from: "content",
          key,
          tabId,
        });
      } catch (error) {
        console.warn(error);
      }
      break;
    case "reset-panel":
      chrome.runtime.sendMessage({ key, from: "content", tabId })
      break;
  }
});