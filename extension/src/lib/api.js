async function callContentScript(type, payload) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    throw new Error("No active tab found");
  }

  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tab.id, { type, payload }, (response) => {
      if (chrome.runtime.lastError) {
        // Graceful handling instead of raw reject
        console.warn("Content script not available:", chrome.runtime.lastError.message);
        resolve(null); // or return a safe default
      } else {
        resolve(response);
      }
    });
  });
}

export async function exportShotoverSettings() {
  return callContentScript("exportShotoverSettings");
}

export async function importShotoverSettings(settingsJson) {
  return callContentScript("importShotoverSettings", settingsJson);
}