const STORAGE_CONFIG_PATH = "shotoverLoadedConfigFile";

///settings -> .fileName .fileContent
export async function loadConfig() {
    let settings = null;
  const result = await chrome.storage.local.get([STORAGE_CONFIG_PATH]);
  if (result[STORAGE_CONFIG_PATH]) {
    settings = result[STORAGE_CONFIG_PATH];
  }
  return settings;
}


export async function setConfig(config, name) {
    await chrome.storage.local.set({
        [STORAGE_CONFIG_PATH]: { fileName: name, fileContent: config },
    });
}