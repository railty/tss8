const express = require('express');
const path = require('path');
const favicon = require('serve-favicon');
const logger = require('electron-log');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const expressWs = require('express-ws');
const ffs = require('final-fs');
const MD5 = require("crypto-js/md5");
const { showMsg, readDataUrl } = require('../utils');

exports.initServer = () => {
    const app = express();
    expressWs(app);

    app.use(favicon(path.join(__dirname, '../../public', 'favicon.ico')));
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: false }));
    app.use(cookieParser());
    app.use(express.static(path.join(__dirname, '../../public')));
    
    app.set('views', path.join(__dirname, 'views'));
    app.set('view engine', 'ejs');

    app.get('/getConfig', function(req, res, next) {
        res.send(global.config);
    });

    /*
    const mysql = require('mysql2/promise');

    app.get('/getMysqlEmployees', async function(req, res, next) {
      const conn = await mysql.createConnection(global.config.mysql);
      let [rows, cols] = await conn.execute('select * from tss.employees');

      let employees = [];
      for (let r of rows){
        showMsg(`[${r.id}][${r.name}]`);

        let {store_id, empno, name, id, barcode, name_cn, department, address, city, postal, rate, active, active2, notes, position, created_at, updated_at} = {...r};
        let photoFile = global.config.employeePhotoPath + id + ".jpg";
        let dataUrl = await readDataUrl(photoFile);
        let photo_md5 = MD5(dataUrl).toString();
        employees.push({store_id, empno, name, id, barcode, name_cn, department, address, city, postal, rate, active, active2, notes, position, created_at, updated_at, photo_md5});
      }
      showMsg("");
      await conn.end();
      res.send(employees);
    });
    */
    app.get('/getDataUrl', async function(req, res, next) {
      let rc;
      if (req.query.type == "employeePhoto"){
        let id = req.query.id;
        let photoFile = global.config.employeePhotoPath + id + ".jpg";
        try{
          let dataUrl = await readDataUrl(photoFile);
          rc = {
            result: 'ok',
            dataUrl: dataUrl
          }
        }
        catch(ex){
          rc = {
            result: 'error',
            dataUrl: ex.toString()
          }
        }
      }
      else{
        rc = {
          result: 'unknown type',
        }
      }

      res.send(rc);
    });

    app.get('/employees/:employeePhoto', function(req, res, next) {
      let employeePhoto = req.params.employeePhoto;
      let photoFile = global.config.employeePhotoPath + employeePhoto;
      res.sendFile(photoFile);
    });

    app.ws('/ipc', function(ws, req) {
      ws.on('message', function(msg) {
        ws.send("Ready");
        console.log(msg);
      });
    });    
    
    // catch 404 and forward to error handler
    app.use(function(req, res, next) {
      var err = new Error('Not Found');
      err.status = 404;
      next(err);
    });
    
    // error handler
    app.use(function(err, req, res, next) {
      // set locals, only providing error in development
      res.locals.message = err.message;
      res.locals.error = req.app.get('env') === 'development' ? err : {};
    
      // render the error page
      res.status(err.status || 500);
      res.render('error');
    });

    let host = global.config.server.host;
    let port = global.config.server.port;
    app.listen(port, () => {
      console.log(`app listening at http://${host}:${port}`)
    })
}
