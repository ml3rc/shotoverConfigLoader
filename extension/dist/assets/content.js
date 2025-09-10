function exportShotoverSettings() {
  const inputs = document.querySelectorAll("input, select, textarea, [contenteditable='true']");
  const data = {};
  inputs.forEach((el, index) => {
    const type = el.type || (el.isContentEditable ? "contenteditable" : "text");
    let value;
    if (type === "checkbox" || type === "radio") {
      value = el.checked;
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
function importShotoverSettings(settings) {
  if (typeof settings === "string") {
    try {
      settings = JSON.parse(settings);
    } catch (e) {
      console.error("Invalid settings JSON", e);
      return;
    }
  }
  for (const key in settings) {
    importSingleEl(settings[key]);
  }
}
function importSingleEl(setting) {
  const { selector, type, value } = setting;
  const el = document.querySelector(selector);
  if (!el) {
    console.warn(`Element not found for selector: ${selector}`);
    return;
  }
  el.focus();
  if (type === "checkbox" || type === "radio") {
    el.checked = value;
  } else if (type === "contenteditable") {
    el.innerHTML = value;
  } else if (el.tagName.toLowerCase() === "select") {
    el.value = value;
  } else {
    el.value = value;
  }
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
  el.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
  el.dispatchEvent(new KeyboardEvent("keyup", { key: "Enter", bubbles: true }));
  setTimeout(() => el.blur(), 10);
}
const handlers = {
  exportShotoverSettings,
  importShotoverSettings
};
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Content script received message:", message);
  if (handlers[message.type]) {
    try {
      const result = handlers[message.type](message.payload);
      console.log("Handler result:", result);
      sendResponse(result);
    } catch (error) {
      console.error("Handler error:", error);
      sendResponse({ error: error.message });
    }
  }
  return true;
});
console.log("Shotover Setting Loader Content.js loaded...");
