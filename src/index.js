const { app, BrowserWindow, autoUpdater, dialog } = require('electron');
const path = require('path');
const logger = require('electron-log');
const ffs = require('final-fs');
const isDev = require('electron-is-dev');
const { showMsg, copyIfNotExists, mkdirIfNotExists, detectEnv } = require('./utils');
 
if (isDev){
  app.commandLine.appendSwitch('remote-debugging-port', '8315')
}

detectEnv();

async function init(){
  //this is the deliveried app path
  let appPath = app.getAppPath();
  
  //config.json is always in userData folder
  let configPath = app.getPath('userData');
  let fConfig = path.join(configPath, "config.json");

  //if not exist, copy from app folder template
  await copyIfNotExists(path.join(appPath, "data.template/config.json"), fConfig);  

  //load config
  global.config = require(fConfig);

  //the default data path is same as config path, in roaming user profile, but can be override
  if (!global.config.dataPath){
    global.config.dataPath = configPath;
  }

  global.config = {...global.config, ...{
    appPath: appPath,
    version: app.getVersion()
  }};

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

  global.config.sqlite = {
    tss: path.join(global.config.dataPath, "data/tss.sqlite"),
    punch: path.join(global.config.dataPath, "data/punch.sqlite")
  };

  global.config.employeePhotoPath = path.join(global.config.dataPath, "data/employees/");
  global.config.cameraPath = path.join(global.config.dataPath, "data/camera/");
}

init();

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
    fullscreen: !isDev,
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
  mainWindow.loadFile(path.join(__dirname, '../public/index.html'));
  // Open the DevTools.
  
  if (isDev) mainWindow.webContents.openDevTools();

  global.mainWindow = mainWindow;
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

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