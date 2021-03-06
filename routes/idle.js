var express = require('express');
var queries = require('../queries/queries');
var helper = require('../models/helper');
var connection = require('../models/async-db');
var router = express.Router();
var log4js = require('log4js');
var Logger = log4js.getLogger('[Idle]');
Logger.level = 'debug';

//------- Devices -------//

/** EndPoint to register new device or replace unique Id with a new one */
router.post('/register', function (req, res) {
  var uniqueId = req.body.unique_id;
  var isAndroid = req.body.is_android ? req.body.is_android : 0;
  var prevUniqueId = req.body.prev_id;

  if (helper.isEmpty(uniqueId)) {
      Logger.error('Could not register device. Error: unique_id is mandatory');
      return res.status(400).send('unique_id is mandatory');
  }

  if (helper.isEmpty(prevUniqueId)) {
      connection.query(queries.register_device, [uniqueId, isAndroid], function (err, dbRes) {
         if (err) {
             Logger.error(err.stack);
             return res.status(500).send(err.message);
         }  else if (dbRes['affectedRows'] > 0) {
             Logger.info('Register device with unique id: ' + uniqueId + ' successfully');
             return res.status(200).send(dbRes);
         } else {
             Logger.error(err.stack);
             return res.sendStatus(500);
        }
      });
  } else {
      connection.query(queries.update_device_id, [uniqueId, prevUniqueId], function (err, dbRes) {
          if (err) {
              Logger.error(err.stack);
              return res.status(500).send(err.message);
          }  else if (dbRes['affectedRows'] > 0) {
              Logger.info('Update device with previous unique id: ' + prevUniqueId + ' with new unique id: ' + uniqueId + ' successfully');
              return res.status(200).send(dbRes);
          } else {
              Logger.error(err.stack);
              return res.sendStatus(500);
          }
      });
  }
});

/** EndPoint to update device location for continues updates.
 *  Must register the phone before send location.
 */
router.put('/update', function (req, res) {
    var lat = req.body.lat;
    var lang = req.body.lang;
    var city = req.body.city;
    var uniqueId = req.body.unique_id;
    var language = req.body.language;

    if (helper.isEmpty(lat)){
        Logger.error('Could not update device. Error: lat is mandatory');
      return res.status(400).send('lat is mandatory');
    }

    if (helper.isEmpty(lang)){
        Logger.error('Could not update device. Error: lang is mandatory');
        return res.status(400).send('lang is mandatory');
    }

    if (helper.isEmpty(city)){
        Logger.error('Could not update device. Error: city is mandatory');
        return res.status(400).send('city is mandatory');
    }

    if (helper.isEmpty(uniqueId)){
        Logger.error('Could not update device. Error: uniqueId is mandatory');
        return res.status(400).send('unique_id is mandatory');
    }

    if (helper.isEmpty(language)){
        Logger.error('Could not update device. Error: language is mandatory');
        return res.status(400).send('language is mandatory');
    }

    var cityName = helper.convertCityName(city);

    if (helper.isEmpty(cityName)) {
        Logger.error('Could not post shelter. Error: city must contains letters');
        return res.status(400).send('city must contains letters');
    }
    helper.findAreaByCityName(cityName, function (errCode, errMessage, foundArea) {
        if (errCode && errMessage) {
            Logger.error(errMessage);
            return res.status(errCode).send(errMessage);
        } else if (helper.isEmpty(foundArea)) {
            Logger.error('Could not update device. Error: Could not find area code for city: ' + cityName);
            return res.status(404).send('Could not find area code for city: ' + cityName);
        } else {
            var areaCode = foundArea.area_code;
            language = validateLanguage(language);
            connection.query(queries.update_device, [lat, lang, areaCode, language, uniqueId], function (err, updateResult) {
                if (err){
                    Logger.error('Could not update device. Error: Failed to update device');
                    return res.status(500).send('Failed to update device');
                } else {
                    Logger.info('Update device for unique id: ' + uniqueId + ' with values: ' +
                        'lat: ' + lat + ' ' +
                        'lang: ' + lang + ' ' +
                        'areaCode: ' + areaCode + ' ' +
                        'language: ' + language + ' successfully');
                    return res.status(200).send(updateResult);
                }
            });
        }
    });
});

/**
 * Helper function to validate that the langage is one of the system support languages
 * If language is not supported, 'english' will return by default
 * @param language
 * @return {string}
 */
function validateLanguage (language) {
    language = language.toLowerCase();
    if (language !== 'hebrew' && language !== 'english' && language !== 'russian') {
        Logger.debug('Server support only languages: hebrew, english and russian, update device language with default language: english');
        language = 'english';
    }
    return language;
}

/** EndPoint to update the device’s preferred language which will be used for notifications */
router.put('/preferred_language', function (req, res) {
    var uniqueId = req.body.unique_id;
    var language = req.body.language;

    if (helper.isEmpty(uniqueId)){
        Logger.error('Could not update device. Error: unique_id is mandatory');
        return res.status(400).send('unique_id is mandatory');
    }

    if (helper.isEmpty(language)){
        Logger.error('Could not update device. Error: language is mandatory');
        return res.status(400).send('language is mandatory');
    }

    language = validateLanguage(language);
    connection.query(queries.update_preferred_language_by_unique_id, [language, uniqueId], function (err, dbRes) {
        if (err) {
            Logger.error(err.stack);
            return res.status(500).send(err.message);
        } else {
            Logger.info('Update device for unoque id: ' + uniqueId + ' with preferred language: ' + language + ' successfully');
            return res.status(200).send(dbRes);
        }
    });
});
module.exports = router;