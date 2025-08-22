<script>
  import { onMount } from "svelte";
  import Button, { Label } from '@smui/button';
  import LayoutGrid, { Cell, InnerGrid } from '@smui/layout-grid';
  import * as api from "../lib/api.js";
  import SamcamLogo from "../assets/samcamLogo.webp"
  import * as config from "../lib/config.js";
  import Card, { Content } from '@smui/card';
  import CircularProgress from '@smui/circular-progress';

  let file = null;
  let settings = null;
  let storedFileName = null;

  let saveWorking = false;
  let saveStatus = "";
  let loadWorking = false;
  let loadStatus = ""

  const AUTO_MULTI_PAGE = false;
  const PATH_CHAR_LIMIT = 20;

  const PAGE_LIST = [
    "/network",
    "/controller",
    "/gimbal",
    "/lens",
    "/gimbal/motors",
    "/lens/motors",
    "/rain_spinner",
  ];

  async function getActiveTabUrl() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab?.url;
  }

  async function setActiveTabUrl(newUrl) {
    console.log(newUrl)
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      await chrome.tabs.update(tab.id, { url: newUrl });
    }
  }

  function isLocalUrl(urlString) {
    try {
      const url = new URL(urlString);
      const host = url.hostname;
      const protocol = url.protocol;


      //file:
      if (protocol === "file:") return true;

      // localhost
      if (host === "localhost") return true;

      // Loopback 127.0.0.0/8
      if (/^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)) return true;

      // 10.x.x.x
      if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)) return true;

      // 172.16.x.x - 172.31.x.x
      if (/^172\.(1[6-9]|2[0-9]|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(host))
        return true;

      // 192.168.x.x
      if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(host)) return true;

      return false;
    } catch (e) {
      return false;
    }
  }

  async function saveSinglePage(){
    saveWorking = true;
    saveStatus = "Checking Tap URL..."
    let setting = {};
    const url = await getActiveTabUrl()
    if (!url || !isLocalUrl(url)) {
      alert("URL is not local");
      saveWorking = false;
      return;
    }

    const baseUrl = new URL(url);
    saveStatus = "Saving Page: " + baseUrl.pathname
    setting[baseUrl.pathname] = JSON.parse(await api.exportShotoverSettings());

    //Log
    console.log(setting);
    
    //Provide Download
    saveStatus = "Waiting for Download..."
    if(!setting){
      saveWorking = false;
      return;
    } 
    const blob = new Blob([JSON.stringify(setting, null, 2)], {
      type: "application/json",
    });
    const urlD = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = urlD;
    a.download = "shotover_settings_" + (new URL(await getActiveTabUrl())).pathname + ".json";
    a.click();
    URL.revokeObjectURL(urlD);
    saveWorking = false;
  }

  async function savePages() {
    saveWorking = true;
    saveStatus = "Checking Tap URL..."
    let setting = {};
    const url = await getActiveTabUrl()
    if (!url || !isLocalUrl(url)) {
      alert("URL is not local");
      saveWorking = false;
      return;
    }

    for (const path of PAGE_LIST) {
      //set url
      saveStatus = "Saving Page: " + path
      const baseUrl = new URL(url);
      baseUrl.pathname = path;
      await setActiveTabUrl(baseUrl.toString());
      await new Promise((resolve) => setTimeout(resolve, 500));

      //action
      setting[path] = JSON.parse(await api.exportShotoverSettings());
    }

    //Log
    console.log(setting);

    //Provide Download
    saveStatus = "Waiting for Download..."
    if(!setting){
      saveWorking = false;
      return;
    } 
    const blob = new Blob([JSON.stringify(setting, null, 2)], {
      type: "application/json",
    });
    const urlD = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = urlD;
    a.download = "shotover_settings.json";
    a.click();
    URL.revokeObjectURL(urlD);
    saveWorking = false;
  }
  
  async function loadSinglePage(path){
    loadWorking = true;
    //Check if settings empty
    loadStatus = "Checking Settings..."
    if (!settings) {
      alert("No settings loaded");
      loadWorking = false;
      return;
    }

    //Check if page local
    loadStatus = "Checking if Page is local..."
    const url = await getActiveTabUrl()
    if (!url || !isLocalUrl(url)) {
      alert("URL is not local");
      loadWorking = false;
      return;
    }

    //Go to specifed path
    const baseUrl = new URL(url);
    loadStatus = "Going to Page: " + baseUrl.pathname;
    baseUrl.pathname = path;
    console.log(baseUrl)
    console.log(path)
    await setActiveTabUrl(baseUrl.toString());
    // wait until page loades
    await new Promise((resolve) => setTimeout(resolve, 1000));


    //set settings
    await api.importShotoverSettings(settings[path])
    // wait until page opens tabs
    await new Promise((resolve) => setTimeout(resolve, 500));
    //set settings again for the new tabs
    await api.importShotoverSettings(settings[path])
    loadStatus = "Wait to send: " + baseUrl.pathname;
    await new Promise((resolve) => setTimeout(resolve, 500));
    loadWorking = false;
  }

  async function loadPages() {
    //Check if settings empty
    if (!settings) {
      alert("No settings loaded");
      return;
    }

    //Set all settings
    for (const [path, pageSettings] of Object.entries(settings)) {
      await loadSinglePage(path);
    }
  }

  onMount(async () => {
    const storedConfig = await config.loadConfig();
    if(storedConfig != null){
      settings = storedConfig.fileContent;
      storedFileName = storedConfig.fileName;
    }
  });


  async function handleFileChange(e) {
    const input = e.target;
    file = input.files?.[0] ?? null;
    if (!file) return;

    if (file.type === "application/json" || file.name.toLowerCase().endsWith(".json")) {
      try {
        const text = await file.text();
        settings = JSON.parse(text);
        storedFileName = file.name;
        await config.setConfig(settings,file.name);
        
      } catch {
        alert("Invalid JSON file");
        file = null;
        settings = null;
      }
    } else {
      alert("Please select a JSON file");
      file = null;
      settings = null;
    }
  }


</script>

<div class="main">
    <LayoutGrid>
        <Cell span={12}>
            <div class="center">
                <h1>Shotover Setting Loader</h1>
            </div>
        </Cell>
        <Cell span={12}>
          <Card>
            {#if saveWorking === false}
              <div class="center-horizontal">
                <div class="def-padding">
                  <Button onclick={savePages} disabled={loadWorking || saveWorking}>
                    <Label>Save All Pages</Label>
                  </Button>
                </div>
                <div class="def-padding">
                  <Button onclick={saveSinglePage} disabled={loadWorking || saveWorking}>
                    <Label>Save This Page</Label>
                  </Button>
                </div>
              </div> 
            {:else}
              <div class="center">
                <div class="def-padding">
                  <CircularProgress style="height: 32px; width: 32px;" indeterminate />
                </div>
                <div class="def-padding">
                  <p class="status">
                    {saveStatus}
                  </p>
                </div>
              </div>
            {/if}
          </Card>
        </Cell>
        <Cell span={12}>
          <Card>
            {#if loadWorking === false}
              <div class="center">
                <div class="def-padding">
                  <div class="file-input-container">
                    <input type="file" id="fileInput" accept=".json" on:change={handleFileChange} />
                    <label for="fileInput" class="file-input-label {file || storedFileName ? 'has-file' : ''}">
                        Drag/Choose settings(.JSON)
                        {#if file || storedFileName}
                        <div class="file-name">{file?.name || storedFileName}</div>
                        {/if}
                    </label>
                  </div>
                </div>
                {#if settings}
                  <div class="def-padding">
                    <Button onclick={loadPages} disabled={loadWorking || saveWorking}>
                        <Label>Load All Pages</Label>
                    </Button>
                  </div>
                  {#each Object.keys(settings) as path}
                    <div class="def-padding">
                      <Button onclick={() => loadSinglePage(path)} disabled={loadWorking || saveWorking}>
                        <Label>
                          Load {path.length > PATH_CHAR_LIMIT ? "…" + path.slice(-PATH_CHAR_LIMIT) : path}
                        </Label>
                      </Button>
                    </div>
                  {/each}
                {/if}
              </div>
            {:else}
              <div class="center">
                <div class="def-padding">
                  <CircularProgress style="height: 32px; width: 32px;" indeterminate />
                </div>
                <div class="def-padding">
                  <p class="status">
                    {loadStatus}
                  </p>
                </div>
              </div>
            {/if}
          </Card>
        </Cell>
    </LayoutGrid>
    <div class="logo-div">
        <a href="https://www.samcam.ch/" target="_blank"  class="logo-div">
          <img class="logo" alt="SAMCAM Logo" src={SamcamLogo}>
        </a>
    </div>
</div>


<style>
    html, body {
        margin: 0;
        padding: 0;
        font-family: 'Roboto', sans-serif;
        width: auto;
        height: auto;
        box-sizing: border-box;
    }

    .status {
      color: #BDBDBD;
      text-align: center;  
      white-space: normal;
      word-break: break-all;
      overflow-wrap: anywhere;
    }

    .main {
        display: flex;
        flex-direction: column;
        gap: 16px;
        padding: 16px;
        min-width: 360px; /* ensures popup isn’t too narrow */
    }

    .center {
        display: flex;
        justify-content: center;
        align-items: center;
        flex-direction: column;
    }

    .center-horizontal {
        display: flex;
        justify-content: center;
        align-items: center;
    }

    .def-padding{
      padding: 10px;
    }

    h2 {
        font-size: 18px;
        font-weight: 500;
        margin-bottom: 16px;
        text-align: center;
        color: #ffffff;
    }

    .file-input-container {
        position: relative;
        width: 100%;
    }

    #fileInput {
        position: absolute;
        opacity: 0;
        width: 100%;
        height: 100%;
        cursor: pointer;
    }

    .file-input-label {
        display: block;
        background: #1E1E1E;
        border: 2px dashed #424242;
        border-radius: 6px;
        padding: 12px;
        text-align: center;
        cursor: pointer;
        transition: all 0.2s ease;
        color: #BDBDBD;
        height: auto;
    }

    .file-input-label:hover {
        border-color: #2196F3;
        background: #252525;
        color: #ffffff;
    }

    .file-input-label.has-file {
        border-color: #4CAF50;
        background: #1B5E20;
        color: #ffffff;
    }

    .file-name {
        font-size: 12px;
        color: #81C784;
        margin-top: 6px;
        white-space: normal;
        word-break: break-all;
        overflow-wrap: anywhere;
    }

    .logo-div{
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: flex-end;
        padding: 0;
        margin: 0;
        width: 100%;
    }

    .logo{
        width: 50%;
        padding: 0;
        margin: 0;
    }
</style>