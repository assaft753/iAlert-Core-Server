var express = require('express');
var router = express.Router();
var helper = require('../models/helper');
var asyncDb = require('../models/async-db');
var queries = require('../queries/queries');
var fbAdmin = require('../models/iAlert-firebase');
var deviceLanguageNotification = require('./device_language_notification');
var cityNamesByLanguage = require('../city_names_by_language');
var rp = require('request-promise');
var _ = require('underscore');
var log4js = require('log4js');
var Logger = log4js.getLogger('[Operative]');
Logger.level = 'debug';

router.get('/notify', function (req, res)  {

    //------- Private function -------//

    function sendNotification(message, deviceId) {
        try {
        fbAdmin.messaging()
            .send(message)
            .then(function (data) {
                Logger.info('Successfully sent message: ' + data + ', to deviceId: ' + deviceId);
            }).catch(function (err) {
            Logger.error('Could not notify to deviceId: ' + deviceId + '\n Error while sending message:', err);
        });
    }
    catch (err) {
            Logger.error('Could not notify to deviceId: ' + deviceId + '\n Error while sending message:', err);
        }

    }
    
    function createNotficationForDevice (device, redAlertId, maxTime, isRealAlert, citiesNames) {
        return new Promise (function (resolve) {
            var deviceId = device['unique_id'];
            var preferredLanguage = device.preferred_language.toLowerCase();
            var message;

            if (isRealAlert) {
                message = {
                    notification: {
                        title: deviceLanguageNotification['realAlert']['' + preferredLanguage].title,
                        body: deviceLanguageNotification['realAlert']['' + preferredLanguage].body
                    },
                    data: {
                        redAlertId: redAlertId.toString(),
                        max_time_to_arrive_to_shelter: maxTime.toString()
                    }
                };
            } else {
                if (preferredLanguage !== 'english') {
                    citiesNames = citiesNames.split(',');
                    var citiesNamesByPreferredLanguage = [];
                    citiesNames.forEach(function (name) {
                        citiesNamesByPreferredLanguage.push(cityNamesByLanguage['' + name]['' + preferredLanguage])
                    });

                    citiesNamesByPreferredLanguage = citiesNamesByPreferredLanguage.join(',');
                }
                message = {
                    notification: {
                        title: deviceLanguageNotification['preferredAlert']['' + preferredLanguage].title + citiesNamesByPreferredLanguage,
                        body: deviceLanguageNotification['preferredAlert']['' + preferredLanguage].body
                    }
                };
            }

            message.token = deviceId.toString();

            if (isRealAlert && device.is_android && device.is_war_mode) {
                var body = {
                    unique_id: deviceId,
                    latitude: device.latitude,
                    longitude: device.longitude,
                    red_alert_id: redAlertId
                };

                var options = {
                    method: 'POST',
                    uri: 'http://localhost:3000/operative/closestSheltersAfterNotification',
                    body: body,
                    json: true
                };

                rp(options)
                    .then(function (resp) {
                        message.data['latitude'] = resp.result.latitude.toString();
                        message.data['longitude'] = resp.result.longitude.toString();
                        sendNotification(message, deviceId);
                    }).catch(function (err) {
                        Logger.error('Could not add latitude and longitude to notification message due to error: ' + err);
                    }).finally(function () {
                        return resolve();
                    });
            } else {
                sendNotification(message, deviceId);
                return resolve();
            }
        });
    }

    function sendNotificationToDevicesWhichContainAreaAsPreferred(areaCode, devicesInAlertArea) {
        asyncDb.query(queries.select_city_by_area_code, [areaCode], function (err, citiesNames) {
            if (!helper.isEmpty(err)) {
                Logger.error(err.stack);
                return res.status(500).send(err);
            }

            if (helper.isEmpty(citiesNames)) {
                Logger.error('Could not find city name for area code: ' + areaCode);
                return res.status(404).send('Could not find city name for area code: ' + areaCode);
            }

            asyncDb.query(queries.select_all_device_ids_by_area_code, [areaCode], function (err, deviceIds) {
                if (!helper.isEmpty(err)) {
                    Logger.error(err.stack);
                    return res.status(500).send(err);
                }

                if (!helper.isEmpty(deviceIds)) {
                    Logger.debug('****** Got device_ids = ' + JSON.stringify(deviceIds, null, 4));
                    Logger.debug('***** device_ids = ' + deviceIds);
                    asyncDb.query(queries.select_all_devices_with_ids_in_array, [deviceIds], function (devices) {
                        if (!helper.isEmpty(err)) {
                            Logger.error(err.stack);
                            return res.status(500).send(err);
                        }

                        if (!helper.isEmpty(devices)) {

                            devices = _.difference(devices, devicesInAlertArea);

                            if (!helper.isEmpty(devices)) {
                                Logger.debug('****** Going to send notification for ' + devices.length + ' devices');

                                var promises = [];

                                devices.forEach(function (device) {
                                    promises.push(createNotficationForDevice(device, null, null, false, citiesNames))
                                });

                                Promise.all(promises)
                                    .then(function () {
                                        return res.sendStatus(200);
                                    });
                            } else {
                                return res.sendStatus(200);
                            }
                        } else {
                            return res.sendStatus(200);
                        }
                    });
                } else {
                    return res.sendStatus(200);
                }
            });
        });

    }

    //------- Code section -------//

    var areaCode = req.query.area_code;

    if (helper.isEmpty(areaCode)) {
        Logger.error('Could not notify to device. Error: area_code is mandatory');
        return res.status(400).send('area_code is mandatory');
    }

    asyncDb.query(queries.insert_red_alert_notification, [areaCode], function (err, dbRes) {
        if (!helper.isEmpty(err)) {
            Logger.error(err.stack);
            return res.status(500).send(err.message);
        }
        if (dbRes['affectedRows'] === 0) {
            Logger.error('Could not notify to device. Error: No rows were inserted to DB');
            return res.status(500).send('No rows were inserted to DB');
        }

        asyncDb.query(queries.select_max_time_by_area_code, [areaCode], function (err, maxTime) {
            if (err) {
                Logger.error(err.stack);
                return res.status(500).send(err);
            }

            maxTime = maxTime[0].max_time_to_arrive_to_shelter;
            var redAlertId = dbRes['insertId'];
            asyncDb.query(queries.select_devices_by_area_code, [areaCode], function (err, devices) {
                if (!helper.isEmpty(err)) {
                    Logger.error(err.stack);
                    return res.status(500).send(err);
                }

                var promises = [];
                
                devices.forEach(function (device) {
                    promises.push(createNotficationForDevice(device, redAlertId, maxTime, true, null));
                });

                Logger.debug('Going to notify all signed devices for area code: ' + areaCode);
                Promise.all(promises)
                    .then(function () {
                      sendNotificationToDevicesWhichContainAreaAsPreferred(areaCode);
                    }).catch(function (error) {
                        Logger.debug('Failed to notify signed devices with Error: ' + error);
                });
            });
        });
    });
});

router.post('/arrive', function (req, res) {
    var redAlertId = req.body.red_alert_id;
    var uniqueId = req.body.unique_id;

    if (helper.isEmpty(redAlertId)) {
        Logger.error('Could not set device to arrived. Error: Red alert id is mandatory');
        return res.status(400).send('Red alert id is mandatory');
    }

    if (helper.isEmpty(uniqueId)) {
        Logger.error('Could not set device to arrived. Error: Device id is mandatory');
        return res.status(400).send('Device id is mandatory');
    }

    asyncDb.query(queries.update_arrival_to_safe_zone, [uniqueId, redAlertId], function (err) {
        if (!helper.isEmpty(err)) {
            Logger.error(err.stack);
            return res.status(500).send(err.message);
        }

        return res.sendStatus(200);
    });
});

// Converts from degrees to radians.
Math.toRadians = function(degrees) {
    return degrees * Math.PI / 180;
};

// Converts from radians to degrees.
Math.toDegrees = function(radians) {
    return radians * 180 / Math.PI;
};

/**
 * Calculates the end-safePoint from a given source at a given range (meters)
 * and bearing (degrees). This methods uses simple geometry equations to
 * calculate the end-safePoint.
 *
 * @param latitude
 *           Device latitude
 * @param longitude
 *           Device longitude
 * @param range
 *           Range in meters
 * @param bearing
 *           Bearing in degrees
 * @return End-safePoint from the source given the desired range and bearing.
 */
function calculateDerivedPosition(latitude, longitude, range, bearing) {
    {
        var EarthRadius = 6371000; // m

        var latA = Math.toRadians(latitude);
        var lonA = Math.toRadians(longitude);
        var angularDistance = range / EarthRadius;
        var trueCourse = Math.toRadians(bearing);

        var lat = Math.asin(
            Math.sin(latA) * Math.cos(angularDistance) +
            Math.cos(latA) * Math.sin(angularDistance)
            * Math.cos(trueCourse));

        var dlon = Math.atan2(
            Math.sin(trueCourse) * Math.sin(angularDistance)
            * Math.cos(latA),
            Math.cos(angularDistance) - Math.sin(latA) * Math.sin(lat));

        var lon = ((lonA + dlon + Math.PI) % (Math.PI * 2)) - Math.PI;

        lat = Math.toDegrees(lat);
        lon = Math.toDegrees(lon);

        var newPoint = {};
        newPoint['latitude'] = lat;
        newPoint['longitude'] = lon;

        return newPoint;
    }
}

function getDistanceBetweenTwoPoints(deviceLat, deviceLon, shelterLat, shelterLon) {
    var R = 6371000; // m
    var dLat = Math.toRadians(shelterLat - deviceLat);
    var dLon = Math.toRadians(shelterLon - deviceLon);
    var lat1 = Math.toRadians(deviceLat);
    var lat2 = Math.toRadians(shelterLat);

    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.sin(dLon / 2)
        * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}

function getClosestShelters(latitude, longitude, redAlertId, uniqueId, getAll, cb) {
    if (helper.isEmpty(latitude) && helper.isEmpty(longitude)) {
        // select lat lon by unique id from users
        asyncDb.query(queries.select_lat_lon_by_unique_id, [uniqueId], function (coordErr, coordRes) {
            if (coordErr) {
                return cb(500, coordErr);
            } else if (helper.isEmpty(coordRes)) {
                return cb(404, 'Could not find coordinates for unique_id: ' + uniqueId);
            } else {
                latitude = coordRes[0].latitude;
                longitude = coordRes[0].longitude;
                selectClosestShelters(latitude, longitude, getAll, cb);
            }
        })
    } else {
        selectClosestShelters(latitude, longitude, getAll, cb);
    }
}

function selectClosestShelters(latitude, longitude, getAll, cb) {
    var MAXIMUM_DISTANCE = 400;

    var MULT = 1.1;
    var p1 = calculateDerivedPosition(latitude, longitude, MULT * MAXIMUM_DISTANCE, 0);
    var p2 = calculateDerivedPosition(latitude, longitude, MULT * MAXIMUM_DISTANCE, 90);
    var p3 = calculateDerivedPosition(latitude, longitude, MULT * MAXIMUM_DISTANCE, 180);
    var p4 = calculateDerivedPosition(latitude, longitude, MULT * MAXIMUM_DISTANCE, 270);

    var query = queries.select_all_approved_shelters.split(';')[0] + " AND "
        + "latitude > " + p3.latitude + " AND "
        + "latitude < " + p1.latitude + " AND "
        + "longitude < " + p2.longitude + " AND "
        + "longitude > " + p4.longitude;

    // query the DB
    asyncDb.query(query, function (err, closestShelterArr) {
        if (err) {
            return cb(500, err);
        } else if (helper.isEmpty(closestShelterArr)) {
            return cb(404, 'Could not find closest shelter for (latitude, longitude) = (' + latitude + ', ' + longitude + ')');
        } else if (getAll) {
            return cb(null, null, closestShelterArr);
        } else {
            var smallestDistance;
            var closestCoord = {};
            var shelterId = -1;

            closestShelterArr.forEach(function (point) {
                var tempDistance = getDistanceBetweenTwoPoints(latitude, longitude, point.latitude, point.longitude);
                if (helper.isEmpty(smallestDistance)) {
                    smallestDistance = tempDistance;
                    closestCoord['latitude'] = point.latitude;
                    closestCoord['longitude'] = point.longitude;
                    shelterId = point.id;
                }

                if (tempDistance < smallestDistance) {
                    smallestDistance = tempDistance;
                    closestCoord['latitude'] = point.latitude;
                    closestCoord['longitude'] = point.longitude;
                    shelterId = point.id;
                }
            });
            return cb(null, null, closestCoord, shelterId);
        }
    });
}


router.post('/closestShelters', function (req, res) {
    var uniqueId = req.body.unique_id;
    var latitude = req.body.latitude;
    var longitude = req.body.longitude;

    if (helper.isEmpty(uniqueId)) {
        Logger.error('Could not get closest shelter. Error: unique_id is mandatory');
        return res.status(400).send('unique_id is mandatory');
    }

    getClosestShelters(latitude, longitude, null, uniqueId, true, function (errorCode, error, closestCoord) {
        var errorMessage;
        if (errorCode) {
            if (error && error.message) {
                errorMessage = error.message;

            } else {
                errorMessage = error;
            }
            Logger.error('Could not get closest shelter. Error: ' + errorMessage);
            return res.status(errorCode).send(errorMessage);

        }  else {
            var result = {
                result: closestCoord
            };
            res.status(200).send(result); // send shelter coordinates to device
        }
    });
});

router.post('/closestSheltersAfterNotification', function (req, res) {
    var uniqueId = req.body.unique_id;
    var latitude = req.body.latitude;
    var longitude = req.body.longitude;
    var redAlertId = req.body.red_alert_id;

    if (helper.isEmpty(uniqueId)) {
        Logger.error('Could not get closest shelter (after notification). Error: unique_id is mandatory');
        return res.status(400).send('unique_id is mandatory');
    }

    if (helper.isEmpty(redAlertId)) {
        Logger.error('Could not get closest shelter (after notification). Error: red_alert_id is mandatory');
        return res.status(400).send('red_alert_id is mandatory');
    }

    getClosestShelters(latitude, longitude, null, uniqueId, false, function (errorCode, error, closestCoord, shelterId) {
        var errorMessage;
        if (errorCode) {
            if (error && error.message) {
                errorMessage = error.message;

            } else {
                errorMessage = error;
            }
            Logger.error('Could not get closest shelter (after notification). Error: ' + errorMessage);
            return res.status(errorCode).send(errorMessage);
        } else {
            asyncDb.query(queries.select_area_code_by_red_alert_id, [redAlertId], function (err, areaCode) {
                if (err) {
                    Logger.error(err.stack);
                    return res.status(500).send(err.message);
                } else if (helper.isEmpty(areaCode)) {
                    Logger.error('Could not get closest shelter (after notification). Error: Could not find the area_code for red_alert_id: ' + redAlertId);
                    return res.status(404).send('Could not find the area_code for red_alert_id: ' + redAlertId);
                } else {
                    areaCode = areaCode[0].area_code;
                    asyncDb.query(queries.select_max_time_by_area_code, [areaCode], function (err, maxTime) {
                       if (err) {
                           Logger.error(err.stack);
                           return res.status(500).send(err.message);
                       } else if (helper.isEmpty(maxTime)) {
                           Logger.error('Could not get closest shelter (after notification). Error: Could not find max_time_to_arrive_to_shelter for area_code: ' + areaCode);
                           return res.status(404).send('Could not find max_time_to_arrive_to_shelter for area_code: ' + areaCode);
                       } else {
                           maxTime = maxTime[0].max_time_to_arrive_to_shelter;
                           closestCoord.max_time_to_arrive_to_shelter = maxTime;
                           var result = {
                               result: closestCoord
                           };
                           res.status(200).send(result); // send shelter coordinates to device

                           // Insert information to devices_red_alert table
                           asyncDb.query(queries.select_id_by_unique_id, [uniqueId], function (err, id) {
                               if (err) {
                                   Logger.error('Error while getting device id from DB. Error: ' + err);
                               } else {
                                   id = id[0].id;
                                   asyncDb.query(queries.insert_red_alert_for_user, [redAlertId, shelterId, 0, id, shelterId, 0], function (err) {
                                       if (err) {
                                           Logger.error('Error while inserting to devices_red_alert. Error: ' + err.message);
                                       } else {
                                           Logger.info('Successfully insert to devices_red_alert.');
                                       }
                                   });
                               }
                           });
                       }
                    });
                }

            });
        }
    });
});

module.exports = router;
