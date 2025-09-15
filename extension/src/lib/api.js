async function callContentScript(type, payload) {
  // Get the active tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    throw new Error("No active tab found");
  }

  // Wrap sendMessage in a Promise that resolves only when the response arrives
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tab.id, { type, payload }, (response) => {
      if (chrome.runtime.lastError) {
        console.warn("Content script not available:", chrome.runtime.lastError.message);
        resolve(null); // safe default instead of rejecting
      } else {
        resolve(response); // resolve with actual response
      }
    });
  });
}

export async function exportShotoverSettings() {
  return await callContentScript("exportShotoverSettings");
}

export async function importShotoverSettings(settingsJson) {
  return await callContentScript("importShotoverSettings", settingsJson);
}

export async function waitForTabIdle() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) throw new Error("No active tab");

  // 1️⃣ Query current pending requests from background
  const status = await new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: "getTabStatus" }, (response) => {
      if (chrome.runtime.lastError) {
        console.warn("Message failed:", chrome.runtime.lastError.message);
        resolve({ pending: 0 }); // assume idle if message fails
      } else {
        resolve(response || { pending: 0 });
      }
    });
  });

  if (status.pending === 0) {
    console.log("Tab is already idle");
    return true;
  }

  console.log(`Tab has ${status.pending} pending requests. Waiting for idle...`);

  // 2️⃣ Listen for 'tabIdle' message from content script
  return new Promise((resolve) => {
    function onMessageListener(msg, sender) {
      if (msg?.type === "tabIdle" && sender.tab?.id === tab.id) {
        chrome.runtime.onMessage.removeListener(onMessageListener);
        resolve(true);
      }
    }
    chrome.runtime.onMessage.addListener(onMessageListener);
  });
}
