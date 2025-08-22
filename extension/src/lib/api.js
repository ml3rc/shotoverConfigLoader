async function callContentScript(type, payload) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tab.id, { type, payload }, (response) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
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