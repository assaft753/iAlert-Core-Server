var express = require('express');
var promise_db = require('../models/promise-db');
var queries = require('../queries/queries');
var router = express.Router();

router.post('/register', (req, res, next) => {
  var uniqueId = req.body['unique_id'];
  var prevUniqueId = req.body['prev_id'] != undefined ? req.body['prev_id'] : null;
  if (uniqueId == undefined) {
    res.sendStatus(400);
    return;
  }

  try {
    var currentUniqueId = promise_db.query(queries.update_device_id, [uniqueId, prevUniqueId]);
    if (currentUniqueId.affectedRows > 0) {
      res.status(200).send(currentUniqueId);
      return;
    }
    var currentUniqueId = promise_db.query(queries.register_device, [uniqueId]);
    if (currentUniqueId['affectedRows'] > 0) {
      res.status(200).send(currentUniqueId);
      return;
    }
    res.sendStatus(500);
  }
  catch (err) {
    res.status(400).send(err);
  }
});

router.put('/update', (req, res, next) => {

  var lat = req.body['lat'];
  var lang = req.body['lang'];
  var city = req.body['city'];
  var uniqueId = req.body['unique_id'];
  if (lat == undefined || lang == undefined || city == undefined || uniqueId == undefined) {
    res.sendStatus(400);
    return;
  }
  lowerCaseCity = city.toLowerCase();
  try {
    var areaCodeList = promise_db.query(queries.select_area_code_by_city_name, [lowerCaseCity]);
    if (areaCodeList.length == 0) {
      res.sendStatus(404);
      return;
    }
    var areaCode = areaCodeList[0]['area_code'];
    var updateResult = promise_db.query(queries.update_device, [lat, lang, areaCode, uniqueId]);
    if (updateResult.affectedRows == 0) {
      res.sendStatus(404);
      return;
    }
    res.status(200).send(updateResult);
  }
  catch (err) {
    res.status(400).send(err);
  }
});
module.exports = router;