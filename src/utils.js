const { app } = require('electron');
const logger = require('electron-log');
const ffs = require('final-fs');
const path = require('path');
const moment = require('moment');

exports.showMsg = (msg) => {
    global.mainWindow.webContents.send('message', msg);
}

exports.copyIfNotExists = async (src, dest) => {
    try{
        let bExist = await ffs.exists(dest);
        if (!bExist) {
        logger.info(`copy ${src} ${dest}`);
        await ffs.copy( src, dest );
        }
    }
    catch(ex){
        logger.info(ex.toString());
    }
}
  
exports.mkdirIfNotExists = async (fd) => {
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
  
exports.detectEnv = () => {
    logger.log("xxxxxxxxxxxxxxxxxxxxxxxxxxxxx");
    //exec and app
    logger.log("app.getAppPath()=", app.getAppPath());
    //config data
    logger.log("app.getPath('userData')=", app.getPath('userData'));
  
    logger.log("app.getPath('appData')=", app.getPath('appData'));
    logger.log("app.getPath('logs')=", app.getPath('logs'));
    logger.log("app.getPath('exe')=", app.getPath('exe'));
    logger.log("process.execPath=", process.execPath);
    logger.log("process.resourcesPath=", process.resourcesPath);
    logger.log("__dirname=", __dirname);
    logger.log("process.env.npm_package_version: " + process.env.npm_package_version);
    logger.log("app.getVersion()=" + app.getVersion());
    logger.log("xxxxxxxxxxxxxxxxxxxxxxxxxxxxx");
  }
  
  exports.loadConfig = () => {

    let configPath = path.join(process.env['APPDATA'], process.env['npm_package_name']);
    let config = require(path.join(configPath, "config.json"));

    if (!config.dataPath) config.dataPath = configPath;

    config.employeePhotoPath = path.join(config.dataPath, "data/employees/");
    config.cameraPath = path.join(config.dataPath, "data/camera/");
    
    config.sqlite = {
        tss: path.join(config.dataPath, "data/tss.sqlite"),
        punch: path.join(config.dataPath, "data/punch.sqlite")
    };
    
    return config;
}

exports.getPunchAction2 = async (dbPunch, startHour) => {
  let tm = new Date();
  let dayStart = new Date(tm.getTime()); //make a copy of tm
  dayStart.setHours(startHour);
  dayStart.setMinutes(0);
  dayStart.setSeconds(0);
  dayStart.setMilliseconds(0);
  dayStart = moment(dayStart).utc().format("YYYY-MM-DDTHH:mm:ss");
  tm = moment(tm).utc().format("YYYY-MM-DDTHH:mm:ss");

  let sql = `SELECT * from punches WHERE employee_id = 99999 and time >= '${dayStart}' and time < '${tm}' order by time desc limit 1`;
  console.log(sql);
  const last_punches = await dbPunch.all(sql);

  let punchAction;
  if (last_punches.length == 0) //first punch of the day
    punchAction = 'checkin'
  else
    punchAction = (last_punches[0].action == 'checkin') ? 'checkout' : 'checkin';
  return punchAction;
}
