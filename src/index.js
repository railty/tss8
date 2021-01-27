const { app, BrowserWindow, autoUpdater } = require('electron');
const path = require('path');
const logger = require('electron-log');
const ffs = require('final-fs');

function detectEnv(){
  logger.log("xxxxxxxxxxxxxxxxxxxxxxxxxxxxx");
  logger.log("app.getAppPath()=", app.getAppPath());
  logger.log("app.getPath('appData')=", app.getPath('appData'));
  logger.log("app.getPath('userData')=", app.getPath('userData'));
  logger.log("app.getPath('logs')=", app.getPath('logs'));
  logger.log("app.getPath('exe')=", app.getPath('exe'));
  logger.log("process.execPath=", process.execPath);
  logger.log("process.resourcesPath=", process.resourcesPath);
  logger.log("__dirname=", __dirname);
  logger.log("process.env.npm_package_version: " + process.env.npm_package_version);
  logger.log("app.getVersion()=" + app.getVersion());
  logger.log("xxxxxxxxxxxxxxxxxxxxxxxxxxxxx");
}

detectEnv();

async function initFile(f){
  f.src = path.join(app.getPath('appData'), f.src);
  f.dest = path.join(app.getPath('userData'), f.dest);

  try{
    let bExist = await ffs.exists(f.dest);
    if (!bExist) {
      await ffs.copy( f.src, f.dest );
    }
  }
  catch(ex){
    logger.info(ex.toString());
  }
}

async function initFolder(fd){
  logger.info("checking " + fd);
  fd = path.join(app.getPath('userData'), fd);
  try{
    let bExist = await ffs.exists(fd);
    if (bExist) {
      logger.info("skip creating " + fd);
    }
    else{
      logger.info("creating " + fd);
      await ffs.mkdir(fd);
    }
  }
  catch(ex){
    logger.info(ex.toString());
  }
}

async function init(){
  for (let fd of ['db/', 'db/employees/', 'db/camera/']) await initFolder(fd);  
  for (let f of [
    {src: 'src/config.json.template', dest: 'config.json'}, 
    {src: 'src/tss.sqlite.template', dest: 'db/tss.sqlite'}, 
    {src: 'src/punch.sqlite.template', dest: 'db/punch.sqlite'}
  ]) await initFile(f);  

  global.config = require(path.join(global.config.userDataPath, "config.json"));
  global.config = {...global.config, ...{
    appData: app.getPath('appData'),
    appPath: app.getAppPath(),
    userDataPath: app.getPath('userData'),
    version: app.getVersion()
  }};

  global.config.sqlite.tss = path.join(global.config.userDataPath, "db/tss.sqlite");
  global.config.sqlite.punch = path.join(global.config.userDataPath, "db/punch.sqlite");

  global.config.employeePhotoPath = path.join(global.config.userDataPath, "db/employees/");
  global.config.cameraPath = path.join(global.config.userDataPath, "db/camera/");
}

init();

require('update-electron-app')({
  updateInterval: '1 hour',
  notifyUser: false,
  logger: logger
});

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) { // eslint-disable-line global-require
  app.quit();
}

autoUpdater.on('update-downloaded', (event, releaseNotes, releaseName) => {
  const dialogOpts = {
    type: 'info',
    buttons: ['Restart', 'Later'],
    title: 'Application Update',
    message: process.platform === 'win32' ? releaseNotes : releaseName,
    detail: 'A new version has been downloaded. Restart the application to apply the updates.'
  }

  dialog.showMessageBox(dialogOpts).then((returnValue) => {
    if (returnValue.response === 0) autoUpdater.quitAndInstall()
  })
})


const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    alwaysOnTop: false,
    frame: true,
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
  });

  // and load the index.html of the app.
  mainWindow.loadFile(path.join(__dirname, '../public/index.html'));
  // Open the DevTools.
  mainWindow.webContents.openDevTools();

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