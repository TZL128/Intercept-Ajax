window.addEventListener("message", function (event) {
  // Only accept messages from the same frame
  if (event.source !== window) {
    return;
  }
  const message = event.data;
  if (message.name === "task") {
    chrome.runtime.sendMessage({ ...message.task, toPanel: true });
  }
  if (message.name === "intercept") {
    chrome.runtime.sendMessage({
      ...message,
      toPanel: true,
    });
  }
});
