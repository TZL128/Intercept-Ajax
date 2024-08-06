window.addEventListener("message", (event) => {
  //Only accept messages from the same frame
  const { key, message, messageType, sender } = event.data;
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
        });
      } catch (error) {
        console.warn(error);
      }
      break;
  }
});
