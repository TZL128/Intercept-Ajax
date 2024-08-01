window.addEventListener("message", (event) => {
  //Only accept messages from the same frame
  const { key, message, sender } = event.data;
  if (sender !== "intercept-ajax") {
    return;
  }
  switch (key) {
    case "render-request-task":
    case "remove-request-task":
    case "request-params":
    case "response-params":
      chrome.runtime.sendMessage({ message, from: "content", key });
      break;
  }
});
