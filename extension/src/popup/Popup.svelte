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

  const PATH_CHAR_LIMIT = 20;

  const PAGE_LIST = [
    "/network",
    "/controller",
    "/gimbal",
    "/lens",
    "/gimbal/motors",
    "/lens/motors",
    "/lens/rain_spinner",
  ];

  async function getActiveTabUrl() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id || !tab?.url) return null;

    const url = new URL(tab.url);
    const origin = url.origin; // e.g. http://localhost or http://truenas

    const [{ result: resource }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const activeBtn = document.querySelector('button.nav-item.active');
        return activeBtn ? activeBtn.getAttribute("data-resource") : null;
      }
    });

    return resource ? `${origin}${resource}` : origin;
  }


  async function setActiveTabUrl(resource) {
    console.log("Navigating to resource:", resource);

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (res) => {
          const btn = document.querySelector(`button[data-resource="${res}"]`);
          if (btn) {
            btn.click();
          } else {
            console.warn("No button found for resource:", res);
          }
        },
        args: [resource] // pass resource string into the injected function
      });
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
      await setActiveTabUrl(path);
      await new Promise((resolve) => setTimeout(resolve, 1200));

      //action
      setting[path] = await api.exportShotoverSettings();
      if (!setting[path]) {
        console.warn("Skipping page", path, "because no response from content script");
        continue;
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
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
    loadStatus = `Checking Settings: ${path}`
    if (!settings) {
      alert("No settings loaded");
      loadWorking = false;
      return;
    }

    //Check if page local
    loadStatus = "Checking if Host is local..."
    const url = await getActiveTabUrl()
    if (!url || !isLocalUrl(url)) {
      alert("URL is not local");
      loadWorking = false;
      return;
    }

    //Go to specifed path
    loadStatus = `Going to Page: ${path}`;
    await setActiveTabUrl(path);
    // wait until page loades
    await new Promise((resolve) => setTimeout(resolve, 1200));


    //set settings
    await api.importShotoverSettings(settings[path])
    // wait until page opens tabs
    await new Promise((resolve) => setTimeout(resolve, 500));
    //set settings again for the new tabs
    await api.importShotoverSettings(settings[path])
    loadStatus = `Wait to send: ${path}`;
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

<div class="main fit-content">
    <LayoutGrid>
        <Cell span={12}>
          <div class="center">
            {#if !(saveWorking || loadWorking)}
              <h1>Shotover Setting Loader</h1>
            {:else}
              <h1 class="waring">⚠ Do not click anywhere ⚠</h1>
            {/if}
          </div>
        </Cell>
        <Cell span={12}>
          <Card>
              {#if saveWorking === false}
                <div class="center section-padding">
                  <div class="input-padding">
                    <Button onclick={savePages} disabled={loadWorking || saveWorking}>
                      <Label>Save All Pages</Label>
                    </Button>
                  </div>
                </div> 
              {:else}
                <div class="center section-padding">
                  <div class="input-padding">
                    <CircularProgress style="height: 32px; width: 32px;" indeterminate />
                  </div>
                  <div class="input-padding">
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
            <div class="center section-padding fit-content">
              {#if !loadWorking }
                {#if !saveWorking}
                  <div class="file-input-container input-padding">
                    <input type="file" id="fileInput" accept=".json" on:change={handleFileChange} />
                    <label for="fileInput" class="file-input-label {file || storedFileName ? 'has-file' : ''}">
                        Drag/Choose settings(.JSON)
                        {#if file || storedFileName}
                        <div class="file-name">{file?.name || storedFileName}</div>
                        {/if}
                    </label>
                  </div>
                {/if}
                {#if settings}
                  <div class="input-padding">
                    <Button onclick={loadPages} disabled={loadWorking || saveWorking}>
                        <Label>Load All Pages</Label>
                    </Button>
                  </div>
                  <div class="input-padding load-container">
                      {#each Object.keys(settings) as path}
                          <div class="input-padding center fit-content">
                            <Button onclick={() => loadSinglePage(path)} disabled={loadWorking || saveWorking}>
                              <Label>
                                Load {path.length > PATH_CHAR_LIMIT ? "…" + path.slice(-PATH_CHAR_LIMIT) : path}
                              </Label>
                            </Button>
                          </div>
                      {/each}
                  </div>
                {/if}
              {:else}
                  <div class="input-padding">
                    <CircularProgress style="height: 32px; width: 32px;" indeterminate />
                  </div>
                  <div class="input-padding">
                    <p class="status">
                      {loadStatus}
                    </p>
                  </div>
              {/if}
            </div>
          </Card>
        </Cell>
        <Cell span={12}>
           <div class="center">
            <a href="https://www.samcam.ch/" target="_blank" class="center">
              <img class="logo" alt="SAMCAM Logo" href="https://www.samcam.ch/" src={SamcamLogo}>
            </a>
          </div>
        </Cell>
    </LayoutGrid>
   
</div>


<style>
    .status {
      color: #BDBDBD;
      text-align: center;  
      white-space: normal;
      word-break: break-all;
      overflow-wrap: anywhere;
    }

    .waring {
      color: #ff3c00;
      text-shadow: 0px 0px 30px #ff3c00;
      animation: flashShadow 0.5s infinite alternate;
    }

    @keyframes flashShadow {
      from {
        text-shadow: 0 0 5px #ff3c00;
      }
      to {
        text-shadow: 0 0 30px #ff3c00;
      }
    }


    .main {
      display: inline-flex; 
      min-width: 450px;
    }

    .center {
        display: flex;
        justify-content: center;
        align-items: center;
        flex-direction: column;
    }


    .load-container {
      display: grid;
      grid-template-columns: repeat(2, minmax(150px, 1fr));
      justify-content: center;
      width: 100%;
    }

    .input-padding{
      padding: 5px;
    }

    .section-padding{
      padding: 10px;
    }

    .file-input-container {
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

    .logo{
        width: 70%;
        max-width: 200px;
        min-width: 150px;
        padding: 0;
        margin: 0;

    }
</style>