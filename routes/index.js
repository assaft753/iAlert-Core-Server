var express = require('express');
var promise_db = require('../models/promise-db');
var firebase = require('../models/iAlert-firebase');
var router = express.Router();

router.get('/', function(req, res, next) {
  //var result = promise_db.query("insert into `areas` (area_code,city) values (?,?)",[211,'Ashdod']);
  var result = "good";
 // firebase.messaging().send();
  res.send(result);
});

module.exports = router;
