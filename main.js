const { app, BrowserWindow, screen, ipcMain, Tray, Menu, nativeImage, dialog } = require('electron'); 
const path = require('path');
const fs = require('fs');

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit(); 
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
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

  function loadConfig() {
      try {
          if (fs.existsSync(configPath)) {
              let config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
              if (!config.customModes) config.customModes = []; 
              return config;
          }
      } catch (error) { console.error("Gagal membaca config", error); }
      return { water: 45, stretch: 120, standbyPath: '', waterPath: '', stretchPath: '', restPath: '', customModes: [] }; 
  }

  function saveConfig(settings) {
      try {
          fs.writeFileSync(configPath, JSON.stringify(settings));
      } catch (error) { console.error("Gagal menyimpan config", error); }
  }

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

    ipcMain.on('window-minimize', () => mainWindow.minimize());
    ipcMain.on('window-maximize', () => mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize());
    ipcMain.on('window-close', () => mainWindow.hide());
  }

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
      }).catch(err => console.log(err));
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

  function showNotificationPopup(message, type) {
      // TARIK DATA CONFIG
      const config = loadConfig();
      
      // MODE SENYAP (DND)
      if (config.dnd === true) {
          console.log(`Notifikasi "${message}" ditahan karena Mode Senyap aktif!`);
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

      setTimeout(() => {
        if (popupWindow && !popupWindow.isDestroyed()) {
            popupWindow.destroy();
            popupWindow = null;
        }
      }, 8000);
  }

  function startTimers(settings) {
      activeTimers.forEach(timer => clearInterval(timer));
      activeTimers = [];

      // Timer Interval
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

  app.whenReady().then(() => {
    createWindow();

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
}