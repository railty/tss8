const puppeteer = require('puppeteer-core');
const fetch = require('node-fetch');
const assert = require('assert').strict;
const path = require('path');
const sqlite3 = require('sqlite-async');

const { loadConfig, getPunchAction } = require('../src/utils');

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
        console.log(strTime1)

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
        assert(strText == 'Account Disabled');

        await page.waitForTimeout(1111);
        strText = await page.evaluate(element => element.textContent, warnings);
        assert(strText == '此卡无效');

        await page.waitForTimeout(1111);
        strText = await page.evaluate(element => element.textContent, warnings);
        assert(strText == 'Account Disabled');

        barcode = "EMP99999999";
        await page.keyboard.type(barcode);
        await page.keyboard.press('Enter');

    }
    catch(ex){
        console.log(ex.toString());
    }
});

test.only("punch active card", async () => {
    try{
        let action = await getPunchAction(dbPunch, config.startHour);
console.log(action);

        let barcode = "EMP99999999";
        await page.keyboard.type(barcode);
        await page.keyboard.press('Enter');
        
        let checkin_photo, checkout_photo, checkin_name, checkout_name;
        checkin_photo = await page.$("img[aria-label='checkin_photo']");
        checkin_photo = await page.evaluate(element => element.src, checkin_photo);

        checkout_photo = await page.$("img[aria-label='checkout_photo']");
        checkout_photo = await page.evaluate(element => element.src, checkout_photo);

        checkin_name = await page.$("div[aria-label='checkin_name']");
        checkin_name = await page.evaluate(element => element.textContent, checkin_name);

        checkout_name = await page.$("div[aria-label='checkout_name']");
        checkout_name = await page.evaluate(element => element.textContent, checkout_name);

        console.log(checkin_name);
        console.log(checkout_name);
        console.log(checkout_name);
        console.log(checkout_photo);

        await page.waitForTimeout(5000);

        barcode = "EMP99999999";
        await page.keyboard.type(barcode);
        await page.keyboard.press('Enter');

        checkin_photo = await page.$("img[aria-label='checkin_photo']");
        checkin_photo = await page.evaluate(element => element.src, checkin_photo);

        checkout_photo = await page.$("img[aria-label='checkout_photo']");
        checkout_photo = await page.evaluate(element => element.src, checkout_photo);

        checkin_name = await page.$("div[aria-label='checkin_name']");
        checkin_name = await page.evaluate(element => element.textContent, checkin_name);

        checkout_name = await page.$("div[aria-label='checkout_name']");
        checkout_name = await page.evaluate(element => element.textContent, checkout_name);

        console.log(checkin_name);
        console.log(checkout_name);
        console.log(checkout_name);
        console.log(checkout_photo);
    }
    catch(ex){
        console.log(ex.toString());
    }
});

afterAll(async () => {
    browser.disconnect();
    await dbPunch.close();
});