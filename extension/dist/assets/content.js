async function exportShotoverSettings() {
  const inputs = document.querySelectorAll("input, select, textarea, [contenteditable='true']");
  const data = {};
  inputs.forEach((el, index) => {
    const type = el.type || (el.isContentEditable ? "contenteditable" : "text");
    let value;
    if (type === "checkbox" || type === "radio") {
      value = el.checked;
    } else if (type.toLowerCase() === "select") {
      value = el.value;
    } else if (type === "contenteditable") {
      value = el.innerHTML;
    } else {
      value = el.value;
    }
    const key = el.id || el.name || el.getAttribute("data-setting-key") || `${el.tagName.toLowerCase()}_${index}`;
    data[key] = {
      selector: getUniqueSelector(el),
      type,
      value
    };
  });
  return JSON.stringify(data, null, 2);
}
function getUniqueSelector(el) {
  if (el.id) return `#${el.id}`;
  if (el.name) return `[name="${el.name}"]`;
  let path = [];
  while (el && el.nodeType === Node.ELEMENT_NODE && el.tagName.toLowerCase() !== "html") {
    let selector = el.tagName.toLowerCase();
    if (el.className) {
      const classes = el.className.trim().split(/\s+/).join(".");
      if (classes) selector += "." + classes;
    }
    const siblingIndex = [...el.parentNode.children].indexOf(el) + 1;
    selector += `:nth-child(${siblingIndex})`;
    path.unshift(selector);
    el = el.parentNode;
  }
  return path.length ? path.join(" > ") : null;
}
async function importShotoverSettings(settings) {
  if (typeof settings === "string") {
    try {
      settings = JSON.parse(settings);
    } catch (e) {
      console.error("Invalid settings JSON", e);
      return false;
    }
  }
  try {
    for (const key of Object.keys(settings)) {
      await importSingleEl(settings[key]);
    }
    return true;
  } catch (err) {
    console.error("Error importing settings:", err);
    return false;
  }
}
function injectPageScript() {
  const script = document.createElement("script");
  script.src = chrome.runtime.getURL("assets/inject.js");
  script.onload = () => script.remove();
  (document.head || document.documentElement).appendChild(script);
}
injectPageScript();
function sendSettingToPage(setting) {
  window.postMessage({ type: "SET_SCS_FIELD", setting }, "*");
}
async function importSingleEl(setting) {
  sendSettingToPage(setting);
}
const handlers = {
  exportShotoverSettings,
  importShotoverSettings
};
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Content script received message:", message);
  const handler = handlers[message.type];
  if (handler) {
    handler(message.payload).then((result) => {
      console.log("Handler result:", result);
      sendResponse(result);
    }).catch((error) => {
      console.error("Handler error:", error);
      sendResponse({ error: error.message });
    });
    return true;
  }
});
console.log("Shotover Setting Loader Content.js loaded...");
