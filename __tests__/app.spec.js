const puppeteer = require('puppeteer-core');
const fetch = require('node-fetch');
const assert = require('assert').strict;
const path = require('path');
const sqlite3 = require('sqlite-async');
const ffs = require('final-fs');
const admin = require("firebase-admin");

let serviceAccount = require("../tss7-firebase-adminsdk.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: "tss7-c74db.appspot.com"
});
let bucket = admin.storage().bucket();
let firebaseDb = admin.firestore();

const { loadConfig } = require('../src/utils');
const { fileNameFilterStripRegExp } = require('final-fs');
const { match } = require('assert');

let browser;
let page;
let config;
let dbPunch;

beforeAll(async () => {
    const response = await fetch(`http://localhost:8315/json/version/list?t=${Math.random()}`)
    const debugEndpoints = await response.json()
    let webSocketDebuggerUrl = debugEndpoints['webSocketDebuggerUrl'];
  
    browser = await puppeteer.connect({
        browserWSEndpoint: webSocketDebuggerUrl,
        defaultViewport: null,
        slowMo: 50
    })
  
    let pages = await browser.pages()
    page = pages[0];

    config = loadConfig();
    dbPunch = await sqlite3.open(config.sqlite.punch);

    let sql = 'delete from punches WHERE employee_id in (99998, 99999)';
    await dbPunch.run(sql);

    
    let punchesSnapshot = await firebaseDb.collection("stores").doc('999').collection("employees").doc('99999').collection("punches").get();
    for (let doc of punchesSnapshot.docs) {
        await doc.ref.delete();
    };
});

test("start and switch to admn", async () => {
    try{
        let version = await page.$("#version");
        const strVersion = await page.evaluate(element => element.textContent, version);
        assert.equal(strVersion, process.env.npm_package_version);

        let store = await page.$("#store");
        const strStore = await page.evaluate(element => element.textContent, store);
        assert.equal(strStore, config.store);

        let dt = await page.$("#date");
        const strDate = await page.evaluate(element => element.textContent, dt);
        assert.equal(strDate, (new Date()).toLocaleDateString('en-US',{year: 'numeric', month:'2-digit', day:'2-digit', weekday:'long'}).replace(',', ''));

        let tm = await page.$("#time");
        const strTime1 = await page.evaluate(element => element.textContent, tm);

        await page.keyboard.type("admin@@@");
        await page.keyboard.press('Enter');
        
        let clock = await page.$("svg[aria-label='clock']");
        const ns = await page.evaluate((element, attr) => element.getAttribute(attr), clock, 'xmlns');
        assert.equal(ns, "http://www.w3.org/2000/svg");

        let buttonExit = await page.$("#exit");
        await page.evaluate(element => element.click(), buttonExit);
        //this was working but not anymore
        //await buttonExit.click();

        tm = await page.$("#time");
        const strTime2 = await page.evaluate(element => element.textContent, tm);
        assert.notEqual(strTime1, strTime2);
        
    }
    catch(ex){
        console.log(ex.toString());
    }
});

test("punch inactive card", async () => {
    try{
        let barcode = "EMP99999998";
        await page.keyboard.type(barcode);
        await page.keyboard.press('Enter');

        let warnings = await page.$('#warnings');
        let strText = await page.evaluate(element => element.textContent, warnings);
        assert(strText == 'Account Disabled' || strText == '此卡无效');

        await page.waitForTimeout(1111);
        strText = await page.evaluate(element => element.textContent, warnings);
        assert(strText == 'Account Disabled' || strText == '此卡无效');

        await page.waitForTimeout(1111);
        strText = await page.evaluate(element => element.textContent, warnings);
        assert(strText == 'Account Disabled' || strText == '此卡无效');

        let input = await page.$("input");
        assert.equal(input, null);
        await page.waitForTimeout(config.warningCanvasTimeout);
    }
    catch(ex){
        console.log(ex.toString());
    }
});

test("punch active card", async () => {
    try{
        //await page.emulateTimezone('America/Vancouver');

        let res;

        let barcode = "EMP99999999";
        await page.keyboard.type(barcode);
        await page.keyboard.press('Enter');

        async function getInfo(){
            return await page.evaluate((aria) => {
                let ici = document.querySelector("img[aria-label='checkin_photo']");
                let ico = document.querySelector("img[aria-label='checkout_photo']");
                let nci = document.querySelector("div[aria-label='checkin_name']");
                let nco = document.querySelector("div[aria-label='checkout_name']");
                return [ici.src, ico.src, nci.textContent, nco.textContent];
            });
        }
        await page.waitForTimeout(50);
        res = await getInfo();

        assert(res[0].endsWith("enter.jpg"));
        assert(res[1].endsWith("99999.jpg"));
        assert(res[2]=='');
        assert(res[3]=='Test');

        await page.waitForTimeout(5000);

        barcode = "EMP99999999";
        await page.keyboard.type(barcode);
        await page.keyboard.press('Enter');

        await page.waitForTimeout(50);
        res = await getInfo();
        assert(res[0].endsWith("99999.jpg"));
        assert(res[1].endsWith("exit.jpg"));
        assert(res[2]=='Test');        
        assert(res[3]=='');

        function roundToSeconds(seconds){
            return new Date(Math.floor(seconds/1000)*1000);
        }

        let sql = `SELECT * from punches WHERE employee_id = 99999 order by time`;
        let punches = await dbPunch.all(sql);
        punches = punches.map((p)=>{
            //time from sqlite3 is utc time but no time zone, ie, ''2021-01-29T15:52:28', add '.000Z' to let js know it is utc not local time
            p.time = p.time +".000Z";
            p.created_at = p.created_at +".000Z";
            p.updated_at = p.updated_at +".000Z";

            //round to seconds
            p.time = roundToSeconds(Date.parse(p.time));
            p.created_at = roundToSeconds(Date.parse(p.created_at));
            p.updated_at = roundToSeconds(Date.parse(p.updated_at));

            //take out the prototype function staff so I can do a deep compare
            let {action, time, created_at, updated_at, employee_id, id, node, photo_name, store} = {...p};
            return {action, time, created_at, updated_at, employee_id, id, node, photo_name, store};
        });
        //console.log(punches);

        assert(punches.length == 2);
        assert(punches[0].action == "checkin");
        assert(punches[1].action == "checkout");
        assert.equal(config.cameraPath + punches[0].id + ".jpeg", punches[0].photo_name);
        assert.equal(config.cameraPath + punches[1].id + ".jpeg", punches[1].photo_name);

        assert(await ffs.exists(punches[1].photo_name));
        assert(await ffs.exists(punches[1].photo_name));

        /*
        let files = await bucket.getFiles({
            prefix: 'camera/'
        });
        files = files[0].map((f)=>{
            return f.name;
        });
        */

        //let firebase do its thing
        await page.waitForTimeout(5000);

        let file0 = bucket.file(`camera/${punches[0].id}.jpeg`);
        assert(await file0.exists());
        
        let file1 = bucket.file(`camera/${punches[1].id}.jpeg`);
        assert(await file1.exists());

        let punchesSnapshot = await firebaseDb.collection("stores").doc('999').collection("employees").doc('99999').collection("punches").get();
        let firePunches = punchesSnapshot.docs.map((p)=>{
            p = p.data();

            //the time canot be exactly same so round to 1 second
            // the time in sqlite is database write time
            // the time in firebase is client time, ie, created_at = updated_at = time
            p.created_at = roundToSeconds(p.created_at.toDate().getTime());
            p.updated_at = roundToSeconds(p.updated_at.toDate().getTime());
            p.time = roundToSeconds(p.time.toDate().getTime());

            p.photo_filename = decodeURIComponent(p.photo_url);
            p.photo_filename = p.photo_filename.replace(/^.*[\\\/]/, '').replace(/\?(.*)$/, '');
            delete p.photo_url;

            delete p.empno;
            delete p.store_id;

            let {action, time, created_at, updated_at, employee_id, id, node, photo_filename, store} = {...p};
            return {action, time, created_at, updated_at, employee_id, id, node, photo_filename, store};
        }).sort((a, b)=>{
            return a.time-b.time;
        });

        punches = punches.map((p)=>{
            p.photo_filename = p.photo_name.replace(/^.*[\\\/]/, '');
            delete p.photo_name;
            return p;
        });

        //same reason, re-construct 2 array to be clear, to avoid some prototype thing to make compare fails
        assert.deepEqual([...punches], [...firePunches]);
    }
    catch(ex){
        console.log(ex.toString());
    }
});

afterAll(async () => {
    browser.disconnect();
    await dbPunch.close();
});