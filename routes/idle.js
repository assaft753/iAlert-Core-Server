var express = require('express');
var promise_db = require('../models/promise-db');
var queries = require('../queries/queries');
var helper = require('../models/helper');
var connection = require('../models/async-db');
var router = express.Router();

router.post('/register', function (req, res) {
  var uniqueId = req.body['unique_id'];
  var prevUniqueId = req.body['prev_id'];
  if (helper.isEmpty(uniqueId)) {
      return res.status(400).send('unique id is mandatory');
  }

  if (helper.isEmpty(prevUniqueId)) {
      connection.query(queries.register_device, [uniqueId], function (err, dbRes) {
         if (err) {
             return res.status(500).send(err.message);
         }  else if (dbRes['affectedRows'] > 0) {
             return res.status(200).send(dbRes);
         } else {
             return res.sendStatus(500);
        }
      });
  } else {
      connection.query(queries.update_device_id, [uniqueId, prevUniqueId], function (err, dbRes) {
          if (err) {
              return res.status(500).send(err.message);
          }  else if (dbRes['affectedRows'] > 0) {
              return res.status(200).send(dbRes);
          } else {
              return res.sendStatus(500);
          }
      });
  }

  // try {
  //   var currentUniqueId = promise_db.query(queries.update_device_id, [uniqueId, prevUniqueId]);
  //   if (currentUniqueId.affectedRows > 0) {
  //       currentUniqueId = promise_db.query(queries.register_device, [uniqueId]);
  //       if (currentUniqueId['affectedRows'] > 0) {
  //         return res.status(200).send(currentUniqueId);
  //       } else {
  //           return res.sendStatus(500);
  //       }
  //   }
  // }
  // catch (err) {
  //   return res.status(400).send(err);
  // }
});

router.put('/update', function (req, res) {
    var lat = req.body['lat'];
    var lang = req.body['lang'];
    var city = req.body['city'];
    var uniqueId = req.body['unique_id'];
    var language = req.body['language'];

    if (helper.isEmpty(lat)){
      return res.status(400).send('lat is mandatory');
    }

    if (helper.isEmpty(lang)){
        return res.status(400).send('lang is mandatory');
    }

    if (helper.isEmpty(lat)){
        return res.status(city).send('city is mandatory');
    }

    if (helper.isEmpty(uniqueId)){
        return res.status(400).send('unique_id is mandatory');
    }

    if (helper.isEmpty(language)){
        return res.status(400).send('language is mandatory');
    }

    var lowerCaseCity = city.toLowerCase();
    try {
        var areaCodeList = promise_db.query(queries.select_area_code_by_city_name, [lowerCaseCity]);
        if (areaCodeList.length === 0) {
          return res.status(404).send('Could not find area code for city: ' + city);
        }
        var areaCode = areaCodeList[0]['area_code'];
        var updateResult = promise_db.query(queries.update_device, [lat, lang, areaCode, language, uniqueId]);
        if (updateResult.affectedRows === 0) {
          return res.status(500).send('Failed to update device');
        }
        return res.status(200).send(updateResult);
    } catch (err) {
        return res.status(500).send(err);
    }
});

router.put('/preferred_language', function (req, res) {
    var uniqueId = req.body.unique_id;
    var language = req.body.language;

    if (helper.isEmpty(uniqueId)){
        return res.status(400).send('unique_id is mandatory');
    }

    if (helper.isEmpty(language)){
        return res.status(400).send('language is mandatory');
    }

    connection.query(queries.update_preferred_language_by_unique_id, [language.toLowerCase(), uniqueId], function (err, dbRes) {
        if (err) {
            return res.status(500).send(err.message);
        } else {
            return res.status(200).send(dbRes);
        }
    });
});
module.exports = router;