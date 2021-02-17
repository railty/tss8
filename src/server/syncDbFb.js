const logger = require('electron-log');
const MD5 = require("crypto-js/md5");
const path = require("path");
const admin = require("firebase-admin");
const { mainModule } = require('process');
const db = new (require('../dbSqlite'))();
const { loadConfig, getMD5, dlPhoto, ulPhoto } = require('../utils');

async function syncPunches(){
    logger.log(`syncPunches`);
    let fb = admin.firestore();
    let count = 0;

    let punchesSnapshot = await fb.collection("stores").doc(config.storeId.toString()).collection("punches").where("photo_url", "==", null).limit(10).get();
    for (let doc of punchesSnapshot.docs){
        let punch = doc.data();
        let photoFile = path.join(config.cameraPath, `${punch.id}.jpeg`);
        let photoMD5 = await getMD5(photoFile);

        logger.info(`upload ${photoFile}`);
        let photoUrl = await ulPhoto(`camera/${punch.id}.jpeg`, photoFile);
        //console.log(photoUrl);
        await doc.ref.update({
            photo_url: photoUrl,
            photo_md5: photoMD5
        })
    }
    logger.log(`total ${count} punches downloaded`);
}

async function syncEmployees(){
    logger.log(`syncEmployees`);

    let fb = admin.firestore();
    let bucket = admin.storage().bucket();

    let employeesFb = {};
    let files;
    let count = 0;

    let ts = await db.getEmployeeTS();
    ts = new Date(ts);
    let employeesSnapshot = await fb.collection("employees").where('updated_at', '>', ts).get();

    for (let doc of employeesSnapshot.docs){
        emp = doc.data();
        emp.created_at = emp.created_at.toDate();
        emp.updated_at = emp.updated_at.toDate();
        await db.upsertLocalEmployee(emp);

        let photoFile = path.join(config.employeePhotoPath, `${emp.id}.jpg`);
        let photoMD5 = await getMD5(photoFile);

        if (emp.photo_md5 != photoMD5){
            logger.info(`download ${photoFile}`);
            await dlPhoto(`employees/${emp.id}.jpg`, photoFile);
        }
    }

    logger.log(`total ${count} employees uploaded`);
}

syncDbFb = async () => {
    await syncEmployees();
    await syncPunches();
}
exports.syncDbFb = syncDbFb;

manualSyncDbFb = async () => {
    let appPath = process.cwd();
    let configPath = path.join(process.env['APPDATA'], process.env['npm_package_name']);
    config = await loadConfig(appPath, configPath);
    syncDbFb();
}

//manualSyncDbFb();