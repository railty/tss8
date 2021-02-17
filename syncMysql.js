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

let config;

async function storage(){
    let bucket = admin.storage().bucket();

    /*
    let employees = await bucket.getFiles({
        prefix: 'employees/'
    });
    console.log(employees.length);

    employees = employees[0].map((f)=>{
        return f.name;
    });
    */

   let photoFile = "employees/100.jpg";
    let file1 = bucket.file(photoFile);
    let [e1] = await file1.exists();
    console.log(e1);
    let [metadata] = await file1.getMetadata();
    let downloadToken = metadata.metadata.firebaseStorageDownloadTokens;

    let url = `https://firebasestorage.googleapis.com/v0/b/${storageBucket}/o/${encodeURIComponent(photoFile)}?alt=media&token=${downloadToken}`;
    console.log(url);

   // const [metadata] = await file1.getMetadata();
}
//storage();

async function cloudStore(){
    let db = admin.firestore();

    let punchesSnapshot = await db.collection("stores").doc('999').collection("employees").doc('99999').collection("punches").get();
    console.log(punchesSnapshot.docs.length);

    for (let doc of punchesSnapshot.docs) {
        console.log(doc.data());
        await doc.ref.delete();
    };

}

//cloudStore();



async function test_mysql(){
    
    // query database
    //const [rows, fields] = await connection.execute('SELECT * FROM `t_users` WHERE `name` like ? AND `coins` = ?', ['D%', 1000]);
    const [rows, fields] = await connection.execute('SELECT * FROM `punches`');
    console.log(rows);
    console.log(fields);

    //let res = await connection.execute('update `t_users` set name = ? WHERE `userid` = ?', ['aaa', 362]);

    await connection.end()
}

//test_mysql();

async function syncPunches(storeId){
    logger.log(`syncPunches for ${storeId}`);
    const conn = await mysql.createConnection(configSync.mysql);
    let db = admin.firestore();
    let bucket = admin.storage().bucket();

    let employeesSnapshot = await db.collection("stores").doc(storeId).collection("employees").listDocuments();
    let count = 0;;
    for (let employeeRef of employeesSnapshot){
        let employee = await employeeRef.get();

        if (!employee.exists){  //this is to make sure this is acollection, listDocuments will return docs and sub collections, we are only interested in collections
            let punchesSnapshot = await employeeRef.collection("punches").where('state', '==', 'created').get();
            for (let punch of punchesSnapshot.docs){
                let p = punch.data();

                try
                {
                    logger.log(p);
                    let resSQL = await conn.execute('insert into punches (id, time, employee_id, action, created_at, updated_at, store, node) values(?, ?, ?, ?, ?, ?, ?, ?)', [p.id, p.time.toDate(), p.employee_id, p.action, p.created_at.toDate(), p.updated_at.toDate(), p.store, p.node]);
                    if (resSQL[0].affectedRows == 1){
                        const resFb = await punch.ref.update({state: "downloaded"});
                        console.log(resFb);

                        logger.log(`dl camera/${fn} to ${config.cameraPath}/${fn}`);
                        let fn = `${p.id}.jpeg`;
                        let file = bucket.file(`camera/${fn}`);
                        await file.download({
                            destination: `${config.cameraPath}/${fn}`,
                        });
            
                        count++;
                    }
                }  
                catch(ex){logger.log(ex.toString())}
            }
        }
    }

    await conn.end();
    logger.log(`total ${count} punches downloaded`);
}

async function syncEmployees(){
    logger.log(`syncEmployees`);
    const conn = await mysql.createConnection(configSync.mysql);
    let fb = admin.firestore();
    let bucket = admin.storage().bucket();

    let employeesFb = {};
    let files;
    let count = 0;

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

        let empFb = employeesFb[id];

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
    
        let employeeRef = fb.collection("employees").doc(id.toString());
    
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

    let [rows, cols] = await conn.execute('select * from tss.employees');

    let employeesSnapshot = await fb.collection("employees").get();
    employeesSnapshot.forEach((doc) => {employeesFb[doc.id] = doc.data();});

    for (let emp of rows){
        let {store_id, empno, name, id, barcode, name_cn, department, address, city, postal, rate, active, active2, notes, position, created_at, updated_at} = {...emp};
        emp = {store_id, empno, name, id, barcode, name_cn, department, address, city, postal, rate, active, active2, notes, position, created_at, updated_at};
        if (emp.id==99999){
            let x = 1;
            x++;
            await syncEmployee(emp);
        }
        //await syncEmployee(emp);
    }
    
    await conn.end();
    logger.log(`total ${count} employees uploaded`);
}

async function sync(){
    for (let store of configSync.stores ){
        //await syncPunches(store);
    }

    await syncEmployees();
}

async function main(){
    let appPath = process.cwd();
    let configPath = appPath;
    config = await loadConfig(appPath, configPath);

    await sync();
    //setInterval(await sync, configSync.interval);
}

main();