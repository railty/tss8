const { app, BrowserWindow, autoUpdater, dialog } = require('electron');
const path = require('path');
const logger = require('electron-log');
const ffs = require('final-fs');
const isDev = require('electron-is-dev');
const admin = require("firebase-admin");
const { showMsg, copyIfNotExists, mkdirIfNotExists, detectEnv, loadConfig } = require('./utils');
const { initServer } = require('./server/server.js');
const { syncDbFb } = require('./server/syncDbFb');
 
if (isDev){
  app.commandLine.appendSwitch('remote-debugging-port', '8315')
}

async function init(){
  detectEnv();

  let appPath = app.getAppPath();
  let configPath = app.getPath('userData');

  global.config = await loadConfig(appPath, configPath);

  for (let fd of ['data/', 'data/employees/', 'data/camera/']) {
    await mkdirIfNotExists(path.join(global.config.dataPath, fd));  
  }

  for (let f of [
    {src: 'data.template/tss.sqlite', dest: 'data/tss.sqlite'}, 
    {src: 'data.template/punch.sqlite', dest: 'data/punch.sqlite'},
    {src: 'data.template/employees/99998.jpg', dest: 'data/employees/99998.jpg'},
    {src: 'data.template/employees/99999.jpg', dest: 'data/employees/99999.jpg'}
  ]) {
    await copyIfNotExists(path.join(global.config.appPath, f.src), path.join(global.config.dataPath, f.dest));   
  }
}

require('update-electron-app')({
  //updateInterval: '1 hour',
  updateInterval: '10 minutes',
  notifyUser: false,
  logger: logger
});

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) { // eslint-disable-line global-require
  app.quit();
}

autoUpdater.on('update-downloaded', (event, releaseNotes, releaseName) => {
  showMsg({
    type: 'update',
    messages: ['Reboot', '重启']
  });
})


const createWindow = () => {
  // Create the browser window.

  let options = {
    alwaysOnTop: false,
    frame: isDev,
    fullscreen: global.config.fullscreen,
    fullscreenable: true,
    transparent: false,
    titleBarStyle: 'default',
    show: true,
    width: 1440,
    height: 900,
    webPreferences: {
      contextIsolation: true,
      preload: __dirname + '/preload.js'
    }
  };
  const mainWindow = new BrowserWindow(options);

  // and load the index.html of the app.
  let url = `http://${global.config.client.host}:${global.config.client.port}/`;
  logger.info("url = ", url);
  mainWindow.loadURL(url);
  // Open the DevTools.
  
  if (global.config.devTools) mainWindow.webContents.openDevTools();

  global.mainWindow = mainWindow;
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', async ()=>{
  await init()
  initServer();
  createWindow();

  admin.initializeApp({
    credential: admin.credential.cert(global.config.fbServiceAccount),
    storageBucket: global.config.fbStorageBucket,
    databaseURL: global.config.fbDatabaseURL,
  });
  
  await syncDbFb();
  setInterval(await syncDbFb, global.config.syncFbInterval);
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.


require('./ipcMain')();