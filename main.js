const { app, BrowserWindow, screen, ipcMain, Tray, Menu, nativeImage, dialog } = require('electron'); 
const path = require('path');
const fs = require('fs');

// Ensure single instance lock for the application
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit(); 
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // Focus the main window if a second instance is executed
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });

  let mainWindow;
  let popupWindow;
  let activeTimers = []; 
  let tray = null; 

  const configPath = path.join(app.getPath('userData'), 'notiybot-config.json');
 
  /**
   * Loads the application configuration from local storage.
   * Returns default settings if the file does not exist.
   */
  function loadConfig() {
      try {
          if (fs.existsSync(configPath)) {
              let config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
              if (!config.customModes) config.customModes = []; 
              return config;
          }
      } catch (error) { 
          console.error("[Config] Failed to read configuration file:", error); 
      }
      return { water: 45, stretch: 120, standbyPath: '', waterPath: '', stretchPath: '', restPath: '', customModes: [] }; 
  }

  /**
   * Saves the provided configuration object to local storage.
   * @param {Object} settings - The configuration object to persist.
   */
  function saveConfig(settings) {
      try {
          fs.writeFileSync(configPath, JSON.stringify(settings));
      } catch (error) { 
          console.error("[Config] Failed to save configuration file:", error); 
      }
  }

  /**
   * Initializes and displays the main application window.
   */
  function createWindow () {
    mainWindow = new BrowserWindow({
      width: 1050,
      height: 700,
      title: "NotiyBot",
      frame: false, 
      transparent: true, 
      thickFrame: false,
      hasShadow: false,
      resizable: true,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false
      }
    });

    mainWindow.setVisibleOnAllWorkspaces(false);
    mainWindow.setBackgroundColor('#00000000');
    mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));

    // IPC Listeners for window controls
    ipcMain.on('window-minimize', () => mainWindow.minimize());
    ipcMain.on('window-maximize', () => mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize());
    ipcMain.on('window-close', () => mainWindow.hide());
  }

  // --- File Dialog & Configuration IPC Handlers ---

  ipcMain.on('open-file-dialog', (event, type) => {
      dialog.showOpenDialog(mainWindow, {
          properties: ['openFile'],
          filters: [{ name: 'Images', extensions: ['jpg', 'png', 'gif', 'svg'] }]
      }).then(result => {
          if (!result.canceled) {
              const filePath = result.filePaths[0];
              const config = loadConfig();
              
              if (['water', 'stretch', 'rest', 'standby'].includes(type)) {
                  config[type + 'Path'] = filePath;
              } else {
                  let cMode = config.customModes.find(m => m.id === type);
                  if (cMode) cMode.path = filePath;
              }
              
              saveConfig(config);
              event.reply('file-selected', { type, filePath });
          }
      }).catch(err => console.error("[Dialog] File selection error:", err));
  });

  ipcMain.on('reset-file', (event, type) => {
      const config = loadConfig();
      if (['water', 'stretch', 'rest', 'standby'].includes(type)) {
          config[type + 'Path'] = ""; 
      } else {
          let cMode = config.customModes.find(m => m.id === type);
          if (cMode) cMode.path = "";
      }
      saveConfig(config);
      event.reply('file-reset', { type });
  });

  ipcMain.on('add-custom-mode', (event, newMode) => {
      const config = loadConfig();
      config.customModes.push(newMode);
      saveConfig(config);
      startTimers(config); 
      event.reply('config-updated', config);
  });

  ipcMain.on('delete-custom-mode', (event, id) => {
      const config = loadConfig();
      config.customModes = config.customModes.filter(m => m.id !== id);
      saveConfig(config);
      startTimers(config);
      event.reply('config-updated', config);
  });

  ipcMain.removeAllListeners('close-popup'); 
  ipcMain.on('close-popup', () => {
      if (popupWindow && !popupWindow.isDestroyed()) {
          popupWindow.destroy(); 
          popupWindow = null;    
      }
  });

  /**
   * Spawns a non-intrusive notification popup window.
   * @param {string} message - The notification text to display.
   * @param {string} type - The event type determining the background image.
   */
  function showNotificationPopup(message, type) {
      const config = loadConfig();
      
      // Prevent popup if Do Not Disturb (DND) mode is active
      if (config.dnd === true) {
          console.log(`[Notification] Suppressed "${message}" due to active DND mode.`);
          return;
      }

      const primaryDisplay = screen.getPrimaryDisplay();
      const { width, height } = primaryDisplay.workAreaSize;

      let customImg = "";
      
      if (['water', 'stretch', 'rest', 'standby'].includes(type)) {
          customImg = config[type + 'Path'];
      } else {
          const cMode = config.customModes.find(m => m.id === type);
          if (cMode) customImg = cMode.path;
      }

      let imageHTML = "";
      if (customImg && customImg !== "") {
          const fileUrl = "file:///" + customImg.replace(/\\/g, '/');
          imageHTML = `<img src="${fileUrl}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 20px;">`;
      }

      if (popupWindow && !popupWindow.isDestroyed()) {
          popupWindow.destroy();
          popupWindow = null;
      }

      popupWindow = new BrowserWindow({
        width: 380, height: 150,
        x: width - 380 - 20, y: height - 150 - 20, 
        frame: false, 
        transparent: true, 
        alwaysOnTop: true, 
        skipTaskbar: true, 
        resizable: false,
        maximizable: false,
        minimizable: false,
        focusable: false,
        hasShadow: false,
        thickFrame: false,
        webPreferences: { nodeIntegration: true, contextIsolation: false }
      });

      popupWindow.loadFile(path.join(__dirname, 'src', 'popup.html'));

      popupWindow.webContents.on('did-finish-load', () => {
        popupWindow.webContents.executeJavaScript(`
            document.getElementById('notif-text').innerText = "${message}";
            const imgTag = \`${imageHTML}\`;
            if(imgTag !== "") {
                document.getElementById('tabbie-container').innerHTML = imgTag;
            }

            document.body.style.cursor = 'pointer';
            document.body.addEventListener('click', (e) => {
                e.preventDefault();
                document.body.style.pointerEvents = 'none'; 
                const { ipcRenderer } = require('electron');
                ipcRenderer.send('close-popup');
            });
            document.body.addEventListener('dblclick', (e) => e.preventDefault());
        `);
      });

      // Auto-destroy popup after 8 seconds
      setTimeout(() => {
        if (popupWindow && !popupWindow.isDestroyed()) {
            popupWindow.destroy();
            popupWindow = null;
        }
      }, 8000);
  }

  /**
   * Initializes and manages all application background timers.
   * @param {Object} settings - The current configuration object.
   */
  function startTimers(settings) {
      activeTimers.forEach(timer => clearInterval(timer));
      activeTimers = [];

      if (settings.water > 0) {
          activeTimers.push(setInterval(() => showNotificationPopup("Waktunya minum bos!", "water"), settings.water * 60 * 1000));
      }
      if (settings.stretch > 0) {
          activeTimers.push(setInterval(() => showNotificationPopup("Luruskan punggungmu, ayo gerak!", "stretch"), settings.stretch * 60 * 1000));
      }

      if (settings.customModes && settings.customModes.length > 0) {
          settings.customModes.forEach(mode => {
              if (mode.scheduleType === 'interval' && mode.interval > 0) {
                  activeTimers.push(setInterval(() => showNotificationPopup(mode.name, mode.id), mode.interval * 60 * 1000));
              }
          });

          const clockInterval = setInterval(() => {
              const now = new Date();
              const currentHours = String(now.getHours()).padStart(2, '0');
              const currentMinutes = String(now.getMinutes()).padStart(2, '0');
              const currentSeconds = now.getSeconds();
              const currentTimeString = `${currentHours}:${currentMinutes}`;

              if (currentSeconds === 0) {
                  settings.customModes.forEach(mode => {
                      if (mode.scheduleType === 'time' && mode.timeValue === currentTimeString) {
                          showNotificationPopup(mode.name, mode.id);
                      }
                  });
              }
          }, 1000);
          
          activeTimers.push(clockInterval);
      }
  }

  ipcMain.on('get-config', (event) => {
      event.returnValue = loadConfig();
  });

  ipcMain.on('save-config', (event, newConfig) => {
      saveConfig(newConfig);
  });

  ipcMain.on('notify-system', (event, message) => {
      showNotificationPopup(message, "standby");
  });

  ipcMain.on('start-timer', (event, settings) => {
      const currentConfig = loadConfig();
      const newConfig = { ...currentConfig, water: settings.water, stretch: settings.stretch };
      saveConfig(newConfig); 
      startTimers(newConfig); 
  });

  // Workspace Automation Execution Engine (Spaces)
  ipcMain.on('launch-workspace', (event, spaceData) => {
      const { folderPath, terminalCmd, liveUrl, items } = spaceData;
      const { shell } = require('electron');
      const { exec } = require('child_process');

      console.log(`[Workspace Engine] Initiating launch protocol for: ${spaceData.name}`);

      // 1. Launch VS Code pointing directly to the project folder
      if (folderPath && folderPath.trim() !== "") {
          exec(`code "${folderPath}"`, (error) => {
              if (error) console.error("[Workspace Engine] Failed to open VS Code:", error);
          });
      }

      // 2. Spawn an independent command prompt executing the dev server script
      if (folderPath && terminalCmd && terminalCmd.trim() !== "") {
          const commandString = `start cmd.exe /k "cd /d "${folderPath}" && ${terminalCmd}"`;
          exec(commandString, (error) => {
              if (error) console.error("[Workspace Engine] Failed to execute terminal command:", error);
          });
      }

      // 3. Delay execution of the browser URL to allow the local server time to boot
      if (liveUrl && liveUrl.trim() !== "") {
          setTimeout(() => {
              shell.openExternal(liveUrl).catch(err => console.error("[Workspace Engine] URL Launch Failed:", err));
          }, 2500); // 2.5 seconds buffer time
      }

      // 4. Iterate and launch all individually configured sub-items (Figma, Notion, PDFs, etc.)
      if (items && Array.isArray(items) && items.length > 0) {
          items.forEach(item => {
              if (!item.url || item.url.trim() === "") return;
              
              if (item.type === 'URL') {
                  shell.openExternal(item.url);
              } else if (item.type === 'APP' || item.type === 'FOLDER') {
                  shell.openPath(item.url);
              }
          });
      }
  });

  // --- Application Lifecycle ---

  app.whenReady().then(() => {
    createWindow();

    // Initialize the OS active window tracking module
    startScreenTracking(mainWindow);

    const iconUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAAzSURBVDhPY3hIQP+MgRjAAGJjA4wGBqMBjAYwGgCDGAaA8F//MxiIDzAaGGA0MBgNMDQAAGh1D9+5qE6MAAAAAElFTkSuQmCC';
    const icon = nativeImage.createFromDataURL(iconUrl);
    
    if (!tray) {
      tray = new Tray(icon);
      const contextMenu = Menu.buildFromTemplate([
        { label: 'Buka Dashboard', click: () => mainWindow.show() },
        { type: 'separator' },
        { label: 'Keluar Sepenuhnya', click: () => {
            app.isQuiting = true;
            app.quit();
        }}
      ]);
      tray.setToolTip('NotiyBot - Pengingat Setia Bos!');
      tray.setContextMenu(contextMenu);
      tray.on('click', () => { mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show(); });
    }

    const savedConfig = loadConfig();
    startTimers(savedConfig);

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on('window-all-closed', () => {});

  // OS Active Window Tracker Module (Screen Time)
  let trackingInterval;

  /**
   * Starts a background interval to poll the currently active OS window.
   * Dispatches the window data payload to the main renderer process.
   * @param {BrowserWindow} mainWindow - The target renderer window.
   */
  function startScreenTracking(mainWindow) {
      if (trackingInterval) clearInterval(trackingInterval);

      const POLLING_RATE_MS = 3000;

      trackingInterval = setInterval(async () => {
          try {
              // Dynamically import active-win (ESM module)
              const activeWinModule = await import('active-win');
              const activeWin = activeWinModule.default || activeWinModule.activeWindow;
              
              const windowData = await activeWin();
              
              if (windowData && !mainWindow.isDestroyed()) {
                  // Dispatch payload to frontend listener (screentime.js)
                  mainWindow.webContents.send('os-window-update', windowData);
              }
          } catch (err) {
              console.error("[Tracker] Failed to retrieve active window data. This may occur during OS boot or permission restriction.");
          }
      }, POLLING_RATE_MS);
  }
}