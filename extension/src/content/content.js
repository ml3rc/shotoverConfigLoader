//Load / Export

async function exportShotoverSettings() {
  const inputs = document.querySelectorAll("input, select, textarea, [contenteditable='true']");
  const data = {};

  inputs.forEach((el, index) => {
    const type = el.type || (el.isContentEditable ? "contenteditable" : "text");
    let value;

    if (type === "checkbox" || type === "radio") {
      value = el.checked;
    }else if(type.toLowerCase() === 'select'){
      value = el.value
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
export async function importShotoverSettings(settings) {
  // Accept both JSON string and parsed object
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
      await importSingleEl(settings[key]); // sequentially wait
    }
    return true;
  } catch (err) {
    console.error("Error importing settings:", err);
    return false;
  }
}




function findSCSInstance(el) {
    if (!window.SCS_fields) return null;

    for (let [id, field] of window.SCS_fields.entries()) {
        if (field.elm_query && field.elm_query[0] === el) {
            return field;
        }
    }
    return null;
}

function inject(fn, ...args) {
    const script = document.createElement('script');
    script.textContent = `(${fn})(${args.map(a => JSON.stringify(a)).join(',')});`;
    document.documentElement.appendChild(script);
    script.remove();
}


// Inject a script into the page context to access window.content directly
function injectPageScript() {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('assets/inject.js'); // This script runs in page context
    script.onload = () => script.remove();
    (document.head || document.documentElement).appendChild(script);
}

// Call this once at load
injectPageScript();

// Send setting data to the injected script via a custom event
function sendSettingToPage(setting) {
    window.postMessage({ type: 'SET_SCS_FIELD', setting }, '*');
}

// Original import function modified to send message to page script
async function importSingleEl(setting) {
    sendSettingToPage(setting);
}


// async function importSingleEl(setting) {
//   const { selector, type, value } = setting;
//   const el = document.querySelector(selector);
//   if (!el) {
//     console.warn(`Element not found for selector: ${selector}`);
//     return;
//   }

//   //exit if same
//   if (type === 'checkbox' || type === 'radio') {
//     if(el.checked == value){
//       return;
//     }
//   } else if (type === 'contenteditable') {
//     if(el.innerHTML == value){
//       return;
//     }
//   } else if (el.tagName.toLowerCase() === 'select') {
//     if(el.value == value){
//       return;
//     }
//   } else {
//     if(el.value == value){
//       return;
//     }
//   }

//   // // Find the [data-type] container to get the field ID
//   // const container = el.closest('[data-type]');
//   // if (!container) {
//   //   console.warn(`No [data-type] container found for element: ${selector}`);
//   //   return;
//   // }
//   // const fieldId = container.id;

//   // Set the DOM value
//   //make state go to FOCUSED
//   el.focus();
//   el.click();
//   await sleep(1000);


//   //Focused
//   el.dispatchEvent(new KeyboardEvent("keydown", {
//     key: "Tab",
//     bubbles: true
//   }));
//   await sleep(50);
//   el.dispatchEvent(new KeyboardEvent("keyup", {
//     key: "Tab",
//     bubbles: true
//   }));
//   await sleep(1000);
//   console.log("Focus")
//   //Editing
//   el.dispatchEvent(new KeyboardEvent("keydown", {
//     key: "Enter",
//     bubbles: true
//   }));
//   await sleep(50);
//   el.dispatchEvent(new KeyboardEvent("keyup", {
//     key: "Enter",
//     bubbles: true
//   }));
//   await sleep(1000);
//   console.log("Editing")




//   //Set Value
//   if (type === 'checkbox' || type === 'radio') {
//     el.checked = value;
//   } else if (type === 'contenteditable') {
//     el.innerHTML = value;
//   } else if (el.tagName.toLowerCase() === 'select') {
//     el.value = value;
//     console.log(value);
//     console.log(selector)
//   } else {
//     el.value = value;
//   }
//   await sleep(1000);
//   console.log("Set val")
  
//   //Commit
//   el.dispatchEvent(new KeyboardEvent("keydown", {
//     key: "Enter",
//     bubbles: true
//   }));
//   await sleep(50);
//   el.dispatchEvent(new KeyboardEvent("keyup", {
//     key: "Enter",
//     bubbles: true
//   }));
//   await sleep(1000);
//   console.log("Commimt")

//   //Blur
//   el.dispatchEvent(new KeyboardEvent("keydown", {
//     key: "Escape",
//     bubbles: true
//   }));
//   await sleep(50);
//   el.dispatchEvent(new KeyboardEvent("keyup", {
//     key: "Escape",
//     bubbles: true
//   }));
//   await sleep(1000);
//   console.log("Blur")
  


//   // Trigger DOM events
//   // el.dispatchEvent(new Event('input', { bubbles: true }));
//   // el.dispatchEvent(new Event('change', { bubbles: true }));
  
  
 
  

//   // Send message to page script to commit the field
//   // window.postMessage({
//   //   source: 'chrome-extension',
//   //   action: 'commitField',
//   //   fieldId,
//   //   value
//   // }, '*');

//   // Listen for the result
//   // const listener = (event) => {
//   //   if (event.source === window && event.data.source === 'page-script' && event.data.action === 'commitResult' && event.data.fieldId === fieldId) {
//   //     window.removeEventListener('message', listener);
//   //     if (event.data.success) {
//   //       console.log(`Committed field: ${fieldId} with value: ${value}`);
//   //       callback({ success: true });
//   //     } else {
//   //       console.warn(`Failed to commit field: ${fieldId} - ${event.data.error}`);
//   //       // Fallback to keypress
//   //       el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
//   //       el.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', bubbles: true }));
//   //       callback({ success: false, error: event.data.error });
//   //     }
//   //   }
//   // };
//   // window.addEventListener('message', listener);

//   // Blur after a delay
//   el.blur();
//   await sleep(100);
// }



//handler list
// Handler list
const handlers = {
    exportShotoverSettings,
    importShotoverSettings,
};

// Listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Content script received message:', message);

    const handler = handlers[message.type];
    if (handler) {
        // Call async handler and respond when done
        handler(message.payload)
            .then(result => {
                console.log('Handler result:', result);
                sendResponse(result);
            })
            .catch(error => {
                console.error('Handler error:', error);
                sendResponse({ error: error.message });
            });

        // Must return true to indicate async sendResponse
        return true;
    }
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
