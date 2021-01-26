const { ipcMain } = require('electron');
const logger = require('electron-log');
const db = new (require('./dbSqlite'))();
const ffs = require('final-fs');
const path = require('path');

module.exports = function () {

    ipcMain.handle('punch', async (event, data) => {
        let employee = await db.savePunch(data);
        console.log("punch saved");
        return employee;
    })

    ipcMain.handle('readConfig', async (event) => {
        let config = await ffs.readFile('./src/config.json', 'utf8');
        config = JSON.parse(config);
        return config;
    })

    ipcMain.handle('writeConfig', async (event, config) => {
        config = JSON.stringify(config, null, 4);
        await ffs.writeFile('./src/config.json', config, 'utf8');

        config = await ffs.readFile('./src/config.json', 'utf8');
        config = JSON.parse(config);
        return config;
    })

    ipcMain.handle('getLocalPunches', async (event) => {
        const punch = await sqlite3.open(config.sqlite.punch);
        let punches = await punch.all(`SELECT * from punches order by updated_at`);
        await punch.close();

        for (let p of punches) {
            if (p.photo_name) {
                var binary = await ffs.readFile(p.photo_name);
                p.photo = 'data:image/jpeg;base64,' + Buffer.from(binary).toString('base64');
            }
        }
        return punches;
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

    ipcMain.handle('getConfig', async (event) => {
        return global.config;
    })
};
