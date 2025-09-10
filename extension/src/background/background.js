const pendingRequests = new Map();
const ports = new Map(); // Map tabId -> port

function safeSendTabIdle(tabId) {
  if (typeof tabId !== "number" || tabId < 0) return;

  // Query to check if content script is injected
  chrome.scripting.executeScript(
    { target: { tabId }, func: () => true },
    (results) => {
      if (chrome.runtime.lastError || !results || !results.length) {
        console.warn(`No content script found in tab ${tabId}, skipping tabIdle message`);
        return;
      }

      // Content script is there, send message
      chrome.tabs.sendMessage(tabId, { type: "tabIdle" }, (response) => {
        if (chrome.runtime.lastError) {
          console.warn(`Error sending tabIdle to tab ${tabId}:`, chrome.runtime.lastError.message);
        }
      });
    }
  );
}

function updatePending(tabId, delta) {
  if (typeof tabId !== "number" || tabId < 0) return;

  const currentCount = pendingRequests.get(tabId) || 0;

  // Prevent decrement when count is already zero
  if (delta < 0 && currentCount === 0) return;

  const newCount = currentCount + delta;
  pendingRequests.set(tabId, newCount);

  console.log(`Tab ${tabId}: pending HTML requests count updated from ${currentCount} to ${newCount}`);

  if (newCount === 0) {
    safeSendTabIdle(tabId);
  }
}


chrome.webRequest.onHeadersReceived.addListener(
  (details) => {
    const contentType = details.responseHeaders?.find(h => h.name.toLowerCase() === "content-type")?.value || "";
    if (contentType.startsWith("text/html")) updatePending(details.tabId, +1);
  },
  { urls: ["<all_urls>"] },
  ["responseHeaders"]
);

chrome.webRequest.onCompleted.addListener(
  (details) => {
    const contentType = details.responseHeaders?.find(h => h.name.toLowerCase() === "content-type")?.value || "";
    if (contentType.startsWith("text/html")) updatePending(details.tabId, -1);
  },
  { urls: ["<all_urls>"] },
  ["responseHeaders"]
);

chrome.webRequest.onErrorOccurred.addListener(
  (details) => updatePending(details.tabId, -1),
  { urls: ["<all_urls>"] }
);

// Handle long-lived connections from content scripts
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === "tab-connection" && port.sender.tab && port.sender.tab.id) {
    const tabId = port.sender.tab.id;
    ports.set(tabId, port);
    console.log(`Port connected for tab ${tabId}`);

    port.onDisconnect.addListener(() => {
      ports.delete(tabId);
      console.log(`Port disconnected for tab ${tabId}`);
    });

    port.onMessage.addListener((msg) => {
      if (msg.type === "trackTab") {
        if (!pendingRequests.has(tabId)) {
          pendingRequests.set(tabId, 0);
          console.log(`Started tracking tab ${tabId}`);
        }
        // Optionally confirm back to content script
        port.postMessage({ type: "tracked", tabId });
      }
    });
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  if (pendingRequests.has(tabId)) {
    pendingRequests.delete(tabId);
    console.log(`Cleared pending count for removed tab ${tabId}`);
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Optionally reset count on reload or URL change
  if (changeInfo.status === "loading" && pendingRequests.has(tabId)) {
    pendingRequests.delete(tabId);
    console.log(`Reset pending count for reloading tab ${tabId}`);
  }
});


// In background.js

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "getTabStatus" && sender.tab) {
    const tabId = sender.tab.id;
    const pending = pendingRequests.get(tabId) || 0;
    sendResponse({ pending });
    return true; // indicate async response
  }
});

