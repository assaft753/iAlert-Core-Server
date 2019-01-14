var express = require('express');
var promise_db = require('../models/promise-db');
//var firebase = require('../models/iAlert-firebase');
var router = express.Router();

router.get('/', function(req, res, next) {
  var result = "good";
 // firebase.messaging().send();
  res.send(result);
});

module.exports = router;