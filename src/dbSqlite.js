const moment = require('moment');
const ffs = require('final-fs');
const sqlite3 = require('sqlite-async')
const logger = require('electron-log');
const path = require('path');
const MD5 = require("crypto-js/md5");

class DBSQLite{
  constructor(){
    this.dbConfig = global.config.sqlite;
  }

  async getDbStats(){
    const tss = await sqlite.open(this.dbConfig.tss);
    const punch = await sqlite.open(this.dbConfig.punch);

    let res = await tss.get(`SELECT count(*) as ct from employees`);
    let ctEmployees = res.ct;

    res = await punch.get(`SELECT count(*) as ct from punches`);
    let ctPunches = res.ct;

    res = await punch.get(`SELECT count(*) as ct from punches where state = 'uploaded'`);
    let ctUploadedPunches = res.ct;
    return {
      employees: ctEmployees,
      punches: ctPunches,
      uploaded_punches: ctUploadedPunches
    }
    await tss.close();
    await punch.close();
  }

  async getEmployeeTS(){
    const tss = await sqlite.open(this.dbConfig.tss);
    let ts = await tss.get('SELECT max(updated_at) as updated_at from employees');
    await tss.close();
    let updated_since = ts.updated_at || new Date('2000-01-01');
    console.log(updated_since);
    return updated_since;
  }

  async getPunches(){
    //for some reason, if I move this to the top, Utils will be {}
    const Utils = require('../utils.js');

    const punch = await sqlite3.open(this.dbConfig.punch);
    let punches = await punch.all(`SELECT * from punches WHERE state is null order by created_at limit ${config.sync.punchLimit}`);
    await punch.close();

    //await array.map must be wrapped in Promise.all
    //Utils is not avaviable inside map function
    /*
    punches = await Promise.all(punches.map(async (p)=>{
      console.log(Utils);
      if (p.photo_name) p.photo = await Utils.loadPhoto(p.photo_name);
      return p;
    }));
    */
    for (let p of punches){
      if (p.photo_name) p.photo = await Utils.loadPhoto(p.photo_name);
    }
    //console.log(punches);
    return punches;
  }

  async deletePunches(pids){
    const punch = await sqlite.open(this.dbConfig.punch);
    let nSuccess = 0;
    for(let pid of pids){
      let res = await punch.run("update punches set state = 'uploaded' WHERE id = ?", [pid]);
      if (res && res.stmt && res.stmt.changes)
        if (res.stmt.changes == 1) nSuccess++;
    }
    await punch.close();
    return nSuccess;
  }

  async purgePunches(){
    const punch = await sqlite.open(this.dbConfig.punch);
    let sql = `delete from punches WHERE state = 'uploaded' and (julianday('now') - julianday(updated_at)) > ${config.sync.punchExpiredDays}`;
    await punch.run(sql);
    await punch.close();
  }

  ///////////////////////////////////////////////////////////////////
  async savePunch(data){
    let barcode = data.empno;
    let canvas = data.photo;
    let punchId = data.id;

    const tss = await sqlite3.open(this.dbConfig.tss);
    const punch = await sqlite3.open(this.dbConfig.punch);

    //only local store employee can punch
    let sql = `SELECT id, empno, barcode, name, name_cn, department, active, active2 from employees WHERE store_id = ${config.storeId} and barcode = '${barcode}'`;
    logger.info(sql);
    const employees = await tss.all(sql);

    var punchAction;
    
    let rc = {};
    if (employees.length > 0){
      let tm = new Date();
      let dayStart = new Date(tm.getTime()); //make a copy of tm
      dayStart.setHours(config.startHour);
      dayStart.setMinutes(0);
      dayStart.setSeconds(0);
      dayStart.setMilliseconds(0);
      dayStart = moment(dayStart).utc().format("YYYY-MM-DDTHH:mm:ss");
      tm = moment(tm).utc().format("YYYY-MM-DDTHH:mm:ss");

      let empId = employees[0].id;
      let active = employees[0].active;

      rc = {
        status: 'OK',
        id: employees[0].id,
        name: employees[0].name,
        name_cn: employees[0].name_cn,
        empno:employees[0].empno,
        active: employees[0].active
      };

      if (empId && active){
        let sql = `SELECT * from punches WHERE employee_id = ${empId} and time >= '${dayStart}' and time < '${tm}' order by time desc limit 1`;
        logger.info("saving punch");
        logger.info(sql);
        const last_punches = await punch.all(sql);
        /*
        I could change the state of the employee to in /out, which will make some reporting easier,
        however, due the the employee database no replicate back to hq, I chose not to do it.
        the general rule is, hq will update employee database, branch will update punch database
        */
  
        if (last_punches.length == 0) //first punch of the day
          punchAction = 'checkin'
        else
          punchAction = (last_punches[0].action == 'checkin') ? 'checkout' : 'checkin';
  
        let photoName = "";
        if (canvas){
          let regex = /^data:.+\/(.+);base64,(.*)$/;
          let matches = canvas.match(regex);
          let ext = matches[1];
          let data = matches[2];
          let buffer = Buffer.from(data, 'base64');
  
          photoName = config.camera.path + punchId + '.' + ext;
          await ffs.writeFile(photoName, buffer);
        }
  
        let res = await punch.run('INSERT into punches(id, time, employee_id, action, store, node, photo_name, created_at, updated_at) values (?, ?, ?, ?, ?, ?, ?, ?, ?)', [punchId, tm, empId, punchAction, config.store, config.hostname, photoName, tm, tm]);
        if (res && res.changes && res.changes == 1){
          //console.log('OK');
          rc = {
            status: 'OK',
            id: employees[0].id,
            name: employees[0].name,
            name_cn: employees[0].name_cn,
            empno:employees[0].empno,
            action: punchAction,
            punchId: punchId,
            active: employees[0].active
          };
        }
        else{
          console.log('cannot save punch');
          rc = {status: 'cannot save punch'};
        }
      }
    }
    else rc = {status: 'no employee found'};

    await tss.close();
    await punch.close();

    return rc;
  }

  async getLocalEmployees(){
    const tss = await sqlite3.open(this.dbConfig.tss);
    let employees = await tss.all(`SELECT * from employees order by updated_at`);
    await tss.close();

    for (let e of employees) {
        let pf = path.join(global.config.employeePhotoPath, e.id + ".jpg");
        try {
            let binary = await ffs.readFile(pf);
            e.photo = 'data:image/jpeg;base64,' + Buffer.from(binary).toString('base64');
            e.photo_md5 = MD5(e.photo).toString();
            logger.log(e.photo_md5);
        }
        catch (ex) {
            logger.log(`cannot find ${pf}`);
        }
    }
    return employees;

  }

  async upsertLocalEmployee(emp){
    const tss = await sqlite3.open(this.dbConfig.tss);
    let sql = `SELECT * from employees where id = ${emp.id}`;
    let rows = await tss.all(sql);
    if (rows.length > 0) {
        console.log(`update ${emp.id} ${emp.updated_at}`);
        let res = await tss.run('update employees set store_id = ?, empno = ?, barcode = ?, name = ?, name_cn = ?, department = ?, active = ?, active2 = ?, created_at = ?, updated_at = ? where id = ?', [emp.store_id, emp.empno, emp.barcode, emp.name, emp.name_cn, emp.department, emp.active, emp.active2, emp.created_at, emp.updated_at, emp.id]);
        //console.log(res);
    }
    else {
        console.log(`insert ${emp.id} ${emp.updated_at}`);
        let res = await tss.run('insert into employees(store_id, id, empno, barcode, name, name_cn, department, active, active2, created_at, updated_at) values(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [emp.store_id, emp.id, emp.empno, emp.barcode, emp.name, emp.name_cn, emp.department, emp.active, emp.active2, emp.created_at, emp.updated_at]);
        //console.log(res);
    }
    await tss.close();
  
    console.log("employee saved");
  }  

}


module.exports = DBSQLite;
