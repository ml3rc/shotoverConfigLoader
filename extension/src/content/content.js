//Load / Export

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

    // Stable key: id > name > custom attr > fallback
    const key =
      el.id ||
      el.name ||
      el.getAttribute("data-setting-key") ||
      `${el.tagName.toLowerCase()}_${index}`;

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

  // Build hierarchical path
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

// --- Apply settings back into the page ---
function importShotoverSettings(settings) {
  // Accept both JSON string and parsed object
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


// Import a single setting
function importSingleEl(setting) {
  const { selector, type, value } = setting;
  const el = document.querySelector(selector);
  if (!el) {
    console.warn(`Element not found for selector: ${selector}`);
    return;
  }

  // // Find the [data-type] container to get the field ID
  // const container = el.closest('[data-type]');
  // if (!container) {
  //   console.warn(`No [data-type] container found for element: ${selector}`);
  //   return;
  // }
  // const fieldId = container.id;

  // Set the DOM value
  el.focus();
  if (type === 'checkbox' || type === 'radio') {
    el.checked = value;
  } else if (type === 'contenteditable') {
    el.innerHTML = value;
  } else if (el.tagName.toLowerCase() === 'select') {
    el.value = value;
  } else {
    el.value = value;
  }

  // Trigger DOM events
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  el.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', bubbles: true }));

  // Send message to page script to commit the field
  // window.postMessage({
  //   source: 'chrome-extension',
  //   action: 'commitField',
  //   fieldId,
  //   value
  // }, '*');

  // Listen for the result
  // const listener = (event) => {
  //   if (event.source === window && event.data.source === 'page-script' && event.data.action === 'commitResult' && event.data.fieldId === fieldId) {
  //     window.removeEventListener('message', listener);
  //     if (event.data.success) {
  //       console.log(`Committed field: ${fieldId} with value: ${value}`);
  //       callback({ success: true });
  //     } else {
  //       console.warn(`Failed to commit field: ${fieldId} - ${event.data.error}`);
  //       // Fallback to keypress
  //       el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  //       el.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', bubbles: true }));
  //       callback({ success: false, error: event.data.error });
  //     }
  //   }
  // };
  // window.addEventListener('message', listener);

  // Blur after a delay
  setTimeout(() => el.blur(), 10);
}



//handler list
const handlers = {
    exportShotoverSettings,
    importShotoverSettings,
}

//listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Content script received message:', message);
  
  if (handlers[message.type]) {
    try {
      const result = handlers[message.type](message.payload);
      console.log('Handler result:', result);
      sendResponse(result);
    } catch (error) {
      console.error('Handler error:', error);
      sendResponse({ error: error.message });
    }
  }
  return true;
});

// function injectPageScript() {
//   const script = document.createElement('script');
//   script.textContent = `
//     // Store the SCS_Content instance globally
//     let SCSContentInstance = null;
//     const OriginalSCSContent = window.SCS_Content || function() {};
//     window.SCS_Content = function() {
//       const instance = new OriginalSCSContent();
//       SCSContentInstance = instance;
//       return instance;
//     };

//     // Listen for messages from the content script
//     window.addEventListener('message', function(event) {
//       if (event.source !== window || !event.data || event.data.source !== 'chrome-extension') {
//         return;
//       }
//       const { action, fieldId, value } = event.data;
//       if (action === 'commitField' && SCSContentInstance && SCSContentInstance.fields instanceof Map) {
//         const field = SCSContentInstance.fields.get(fieldId);
//         if (field && typeof field.commit === 'function') {
//           // Set the field value and commit
//           field.value = value; // Set the value on the SCS_Field
//           field.commit(); // Trigger server send
//           window.postMessage({
//             source: 'page-script',
//             action: 'commitResult',
//             fieldId,
//             success: true
//           }, '*');
//         } else {
//           window.postMessage({
//             source: 'page-script',
//             action: 'commitResult',
//             fieldId,
//             success: false,
//             error: 'Field not found or no commit method'
//           }, '*');
//         }
//       }
//     });
//   `;
//   document.head.appendChild(script);
//   document.head.removeChild(script);
// }

// document.addEventListener('DOMContentLoaded', () => {
//   injectPageScript();
//   window.postMessage({
//     source: 'chrome-extension',
//     action: 'commitField',
//     fieldId,
//     value
//   }, '*');
//   console.log("Added SCS page script...");
// });


console.log("Shotover Setting Loader Content.js loaded...");
