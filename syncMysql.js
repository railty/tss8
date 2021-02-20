const logger = require('electron-log');
const ffs = require('final-fs');
const MD5 = require("crypto-js/md5");
const mysql = require('mysql2/promise');
const path = require("path");
const admin = require("firebase-admin");
const uuid = require("uuid-v4");
const serviceAccount = require("./tss7-firebase-adminsdk.json");

let storageBucket = "tss7-c74db.appspot.com";

let app = admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: storageBucket,
  databaseURL: 'https://tss7-c74db.firebaseio.com'
});

const { loadConfig, getMD5, dlPhoto, ulPhoto } = require('./src/utils');

const configSync = require("./sync.json");
const { updateLocale } = require('moment');

async function syncPunches(storeId){
    logger.log(`syncPunches for ${storeId}`);
    const conn = await mysql.createConnection(configSync.mysql);
    let db = admin.firestore();
    let bucket = admin.storage().bucket();

    let res = await conn.execute('select updated_at from punches order by updated_at limit 1');
    let lastUpdatedAt = res[0][0].updated_at;
    //firebase save the datetime with nanoseconds, current mysql can also do that, but my old mysql have only seconds
    //to make sure do not miss any, less 1 second first
    lastUpdatedAt.setSeconds(lastUpdatedAt.getSeconds()-1);

    let count = 0;;
    let punchesSnapshot = await db.collection("stores").doc(storeId).collection("punches").where('updated_at', '>', lastUpdatedAt).orderBy('updated_at').get();
    for (let punch of punchesSnapshot.docs){
        let p = punch.data();
        try
        {
            logger.log(p);
            let resSQL = await conn.execute('select * from punches where id = ?', [p.id]);
            if (resSQL[0].length==0) {
                resSQL = await conn.execute('insert into punches (id, time, employee_id, action, created_at, updated_at, store, node) values(?, ?, ?, ?, ?, ?, ?, ?)', [p.id, p.time.toDate(), p.employee_id, p.action, p.created_at.toDate(), p.updated_at.toDate(), p.store, p.node]);
                if (resSQL[0].affectedRows == 1){
                    //const resFb = await punch.ref.update({state: "downloaded"});
                    //console.log(resFb);
    
                    let fn = `${p.id}.jpeg`;
                    logger.log(`dl camera/${fn} to ${global.config.cameraPath}/${fn}`);
                    
                    let file = bucket.file(`camera/${fn}`);
                    await file.download({
                        destination: `${global.config.cameraPath}/${fn}`,
                    });
        
                    count++;
                }
            }
}  
        catch(ex){logger.log(ex.toString())}
    }

    await conn.end();
    logger.log(`total ${count} punches downloaded`);
}

async function syncEmployees(){
    async function uploadPhoto(id, dataUrl){
        console.log(`uploading ${id}`);

        let photoFile = `${configSync.employeesPhotoPath}/${id}.jpg`;
        let photoData = await ffs.readFile(photoFile);
        let gcf = bucket.file(`employees/${id}.jpg`);

        let [metadata1] = await gcf.getMetadata();

        await gcf.save(photoData);

        let [metadata] = await gcf.getMetadata();

        let downloadToken;
        if (metadata.metadata && metadata.metadata.firebaseStorageDownloadTokens){
            downloadToken = metadata.metadata.firebaseStorageDownloadTokens;
        }
        else{
            downloadToken = uuid();
            await gcf.setMetadata({
                metadata: {
                  // Update the download token:
                  firebaseStorageDownloadTokens: downloadToken,
                  // Or delete it:
                  //firebaseStorageDownloadTokens: null,
                }
            });
        }
        let url = `https://firebasestorage.googleapis.com/v0/b/${storageBucket}/o/${encodeURIComponent(photoFile)}?alt=media&token=${downloadToken}`;
        return url;
    }
    
    async function updateEmployee(employeeRef, employee){
        console.log("updating " + employee.id);
        count = count + 1;
        await employeeRef.set(employee);
    }
    
    async function imgToDataUrl(photo_file){
        //no encoding means binary
        let photoData = await ffs.readFile(photo_file);
        let buf = Buffer.from(photoData, 'binary');
        let string = buf.toString('base64');
        string = "data:image/jpeg;base64," + string;
        return string;
    }
    
    async function syncEmployee(empDb){
        let id = empDb.id;
        let photo_file = `${configSync.employeesPhotoPath}/${id}.jpg`;
    
        let photo_md5 = await getMD5(photo_file);
        let photo_url;

        let employeeRef = fb.collection("employees").doc(id.toString());

        let empFb = await employeeRef.get();
        empFb = empFb.data();

        //if local have a photo
        if (photo_md5){
          //have remote
          if (empFb){
            //photo not match
            if (empFb.photo_md5 != photo_md5) {
              photo_url = await ulPhoto(`employees/${id}.jpg`, photo_file);
            }
            else{
              //console.log("skip same photo" + id);  
            }
          }
          else {
              //the photo might be alright, just the data missing, but neverthenless, upload the photo
              photo_url = await ulPhoto(`employees/${id}.jpg`, photo_file);
          }
        }
    
        //photo changed, update fb anyway
        if (photo_url) {
          empDb.photo_url = photo_url;
          empDb.photo_md5 = photo_md5;
          logger.log("update " + id + "for new photo");
          await updateEmployee(employeeRef, empDb);
        }
        else{
            if (empFb){
                empDb.photo_url = empFb.photo_url;
                empDb.photo_md5 = empFb.photo_md5;
    
                if (empFb.updated_at.toMillis() < empDb.updated_at.valueOf()) {
                    logger.log("update " + id + "for new updated_at");
                    await updateEmployee(employeeRef, empDb);
                }
                else{
                    //logger.log("skip fb data, same timestamp " + id);
                }
            }
            else{
                logger.log("create " + id);
                empDb.photo_url = null;
                empDb.photo_md5 = null;
                await updateEmployee(employeeRef, empDb);
            }
        }
    }

    logger.log(`syncEmployees`);
    const conn = await mysql.createConnection(configSync.mysql);
    let fb = admin.firestore();
    let bucket = admin.storage().bucket();

    let count = 0;

    //to sych the deleted employees, the only way is to get all and compare all
    let [employeesDb, cols] = await conn.execute('select * from tss.employees');

    employeesDb = employeesDb.map((emp)=>{
        let {store_id, empno, name, id, barcode, name_cn, department, address, city, postal, rate, active, active2, notes, position, created_at, updated_at} = {...emp};
        return {store_id, empno, name, id, barcode, name_cn, department, address, city, postal, rate, active, active2, notes, position, created_at, updated_at};
    });
    let ctAdded = 0;
    let ctRemoved = 0;
    let ctUpdated = 0;

    let employeesFb =  await fb.collection("employees").get();
    for (let empRef of employeesFb.docs){
        let empFb = empRef.data();
        empFb.updated_at = empFb.updated_at.toDate();
        let empDb = employeesDb.find((empDb)=>empDb.id == empFb.id);
        if (empDb){
            if (empDb.updated_at>empFb.updated_at){
                logger.log(`update employee id = ${empDb.id}`);

                let photo_file = `${configSync.employeesPhotoPath}/${empDb.id}.jpg`;
                empDb.photo_md5 = await getMD5(photo_file);
                if (empDb.photo_md5 == empFb.photo_md5){
                    empDb.photo_url = empFb.photo_url;
                }
                else{
                    logger.log(`upload photo id = ${photo_file}`);
                    empDb.photo_url = await ulPhoto(`employees/${empDb.id}.jpg`, photo_file);
                }
                await empRef.ref.set(empDb);
                ctUpdated++;
            }
            empDb.found = true;
        }
        else{
            logger.log(`remove employee id = ${empFb.id}`);

            if (empFb.photo_url){
                let file = bucket.file(empFb.photo_url);
                await file.delete({ignoreNotFound: true});
            }
            await empRef.ref.delete();
            ctRemoved++;
        }
    }
    for (let empDb of employeesDb){
        if (!empDb.found){
            logger.log(`add employee id = ${empDb.id}`);

            let photo_file = `${configSync.employeesPhotoPath}/${empDb.id}.jpg`;
            empDb.photo_md5 = await getMD5(photo_file);
            empDb.photo_url = await ulPhoto(`employees/${empDb.id}.jpg`, photo_file);
            await fb.collection("employees").doc(empDb.id.toString()).set(empDb);
            ctAdded++;
        }
    }
    
    await conn.end();
}

async function sync(){
    for (let store of configSync.stores ){
        await syncPunches(store);
    }

    await syncEmployees();
}

async function main(){
    let appPath = process.cwd();
    //let configPath = path.join(process.env['APPDATA'], process.env['npm_package_name']);
    let configPath = appPath;
    //copy config.json into local folder
    global.config = await loadConfig(appPath, configPath);

    global.config.cameraPath = '/home/sning/camera/';
    global.config.employeesPhotoPath = '/home/sning/photos/';

    await sync();
    //setInterval(sync, configSync.interval);
}

main();