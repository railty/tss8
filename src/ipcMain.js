const { ipcMain, dialog } = require('electron');
const logger = require('electron-log');
const db = new (require('./dbSqlite'))();
const ffs = require('final-fs');
const path = require('path');

const { showMsg } = require('./utils');

module.exports = function () {
    ipcMain.handle('punch', async (event, data) => {
        let employee = await db.savePunch(data);
        return employee;
    })

    ipcMain.handle('readConfig', async (event) => {
        return global.config;
    })

    ipcMain.handle('writeConfig', async (event, config) => {
        config = JSON.stringify(config, null, 4);
        await ffs.writeFile('./src/config.json', config, 'utf8');

        config = await ffs.readFile('./src/config.json', 'utf8');
        config = JSON.parse(config);
        return config;
    })

    ipcMain.handle('getLocalPunches', async (event) => {
        return await db.getLocalPunches();
    })

    ipcMain.handle('getLocalEmployees', async (event) => {
        return await db.getLocalEmployees();
    })

    ipcMain.handle('upsertLocalEmployee', async (event, emp) => {
        return await db.upsertLocalEmployee(emp);
    })

    ipcMain.handle('savePhoto', async (event, id, dataUrl) => {
        let regex = /^data:.+\/(.+);base64,(.*)$/;
        let matches = dataUrl.match(regex);
        let ext = matches[1];
        let data = matches[2];
        let buffer = Buffer.from(data, 'base64');

        let photoName = path.join(global.config.employeePhotoPath, id + ".jpg");
        logger.info("saving "+photoName);
        await ffs.writeFile(photoName, buffer);
        logger.info("saved "+photoName);
    })

    ipcMain.handle('loadPhotos', async (event) => {
        let result = await dialog.showOpenDialog(global.mainWindow, {
            properties: ['openDirectory']
        })
        if (!result.canceled){
            let src = result.filePaths[0];
            logger.log(src);
            let srcFs = await ffs.readdir(src);
            let i = 0;
            for (let f of srcFs){
                i = i + 1;
                if (f.match(/\.jpg$/)){
                    try{
                        let srcF = path.join(src, f);
                        let destF = path.join(global.config.employeePhotoPath, f);

                        let bExist = await ffs.exists(destF);
                        if (!bExist){
                            showMsg(`[${i}/${srcFs.length}] copying ${srcF} to ${destF}`);
                            await ffs.copy(srcF, destF);
                        }
                    }
                    catch(ex){
                        console.log(ex.toString());
                    }
                }
            }
            return true;
        }
        return false;
    })

    ipcMain.handle('getConfig', async (event) => {
        return global.config;
    })
};
