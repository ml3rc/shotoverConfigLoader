//Load / Export

async function exportShotoverSettings() {
  await openAllCards();
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
  await openAllCards();
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


async function openAllCards() {
  const buttons = Array.from(document.querySelectorAll('button.btn[data-toggle="collapse"][id^="card_"]'));

  // Filter buttons that are visible and currently closed (have 'collapsed' class)
  const filteredButtons = buttons.filter(button => button.style.display !== 'none');

  for (const button of filteredButtons) {
    button.click();
    await new Promise(resolve => setTimeout(resolve, 100));
    if(button.classList.contains('collapsed')){
      button.click();
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  await new Promise(resolve => setTimeout(resolve, 2000));
}


// Inject a script into the page context to access window.content directly
function injectPageScript() {
    console.log("Trying to inject SCS modifier script...");
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('assets/inject.js'); // This script runs in page context
    script.onload = () => script.remove();
    (document.head || document.documentElement).appendChild(script);
}

// Call this once at load
injectPageScript();

function sendSettingToPage(setting) {
    window.postMessage({ type: 'SET_SCS_FIELD', setting }, '*');
}
async function importSingleEl(setting) {
    sendSettingToPage(setting);
}

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



console.log("Shotover Setting Loader Content.js loaded...");
