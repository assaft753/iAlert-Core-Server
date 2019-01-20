var express = require('express');
var router = express.Router();
var helper = require('../models/helper');
var async_db = require('../models/async-db');
var queries = require('../queries/queries');
var fbAdmin = require('../models/iAlert-firebase');

router.get('/notify/:areacode', (req, res, next) => {
    var areacode = req.params.areacode;
    if (helper.isEmpty(areacode)) {
        res.sendStatus(400);
        return;
    }

    async_db.query(queries.insert_red_alert_notification, [new Date(), areacode], (err, dbRes) => {
        if (!helper.isEmpty(err)) {
            res.status(500).send(err);
            return;
        }
        if (dbRes['affectedRows'] == 0) {
            res.status(500).send(err);
            return;
        }
        var redAlertId = dbRes['insertId'];
        async_db.query(queries.select_devices_by_area_code, [areacode], (err, devices) => {
            if (!helper.isEmpty(err)) {
                res.status(500).send(err);
                return;
            }
            devices.forEach(device => {
                var deviceId = device['unique_id'];
                var message = {
                    notification: {
                        title: 'צבע אדום',
                        body: 'לחץ בכדי לקבל הכוונה למקום בטוח'
                    },
                    data: {
                        redAlertId: redAlertId
                    },
                    token: deviceId
                };
                try {
                    fbAdmin.messaging().send(message).then(data => {
                        console.log('Successfully sent message:', data);
                    }).catch(err => { console.log('Error sending message:', err); })
                }
                catch (err) {
                    console.log('Error sending message:', err);
                }
                /* .then((response) => {
                     console.log('Successfully sent message:', response);
                 })
                 .catch((error) => {
                     console.log('Error sending message:', error);
                 });*/
            });
            res.sendStatus(200);
        });
    });
});

router.post('/arrive', (req, res, next) => {
    var redAlertId = req.body['red_alert_id'];
    var deviceId = req.body['device_id'];
    if (helper.isEmpty(redAlertId) || helper.isEmpty(deviceId)) {
        res.sendStatus(400);
        return;
    }

    async_db.query(queries.update_arrival_to_safe_zone, [deviceId, redAlertId], (err, dbRes) => {
        if (!helper.isEmpty(err)) {
            res.status(500).send(err);
            return;
        }
        res.sendStatus(200);
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

function selectClosestShelters(latitude, longitude, getAll, cb) {
    var MAXIMUM_DISTANCE = 400;

    var MULT = 1.1;
    var p1 = calculateDerivedPosition(latitude, longitude, MULT * MAXIMUM_DISTANCE, 0);
    var p2 = calculateDerivedPosition(latitude, longitude, MULT * MAXIMUM_DISTANCE, 90);
    var p3 = calculateDerivedPosition(latitude, longitude, MULT * MAXIMUM_DISTANCE, 180);
    var p4 = calculateDerivedPosition(latitude, longitude, MULT * MAXIMUM_DISTANCE, 270);

    var query = queries.select_all_shelters.split(';')[0] + " WHERE "
        + "latitude > " + p3.latitude + " AND "
        + "latitude < " + p1.latitude + " AND "
        + "longitude < " + p2.longitude + " AND "
        + "longitude > " + p4.longitude;

    // query the DB
    async_db.query(query, function (err, closestShelterArr) {
        if (err) {
            return cb(err);
        } else if (helper.isEmpty(closestShelterArr)) {
            return cb(404, 'Could not find closest shelter for (latitude, longitude) = (' + latitude + ', ' + longitude + ')');
        } else if (getAll) {
            return cb(null, null, closestShelterArr);
        } else {
            var smallestDistance = -1;
            var closestCoord = {};
            closestShelterArr.forEach(function (point) {
                var tempDistance = getDistanceBetweenTwoPoints(latitude, longitude, point.latitude, point.longitude);
                if (tempDistance < smallestDistance) {
                    smallestDistance = tempDistance;
                    closestCoord['latitude'] = point.latitude;
                    closestCoord['longitude'] = point.longitude;
                }
            });
            return cb(null, null, closestCoord);
        }
    });
}


router.get('/closestShelters/:unique_id', function (req, res) {
    var unique_id = req.params.unique_id;
    var latitude = req.body.latitude;
    var longitude = req.body.longitude;
    var red_alert_id = req.body.red_alert_id;

    //---------- Private functions section ----------//

    function sendResult(error, message, closestCoord, shelterId) {
        if (error && error === 404) {
            return res.status(error).send(message);
        } else if (error) {
            return res.status(500).send(error.message);
        } else {
            res.status(200).send(closestCoord); // send shelter coordinates to device

            // Insert information to devices_red_alert table
            async_db.query(queries.insert_red_alert_for_user, [red_alert_id, shelterId, 0, unique_id], function (err, dbRes) {
                if (err) {
                    return res.status(err).send(err.message);
                } else {
                    return res.status(200).send(dbRes);
                }
            });
        }
    }

    //---------- Code section ----------//

    if (helper.isEmpty(unique_id)) {
        return res.status(501).send('unique_id path parameter is mandatory');
    }

    if (helper.isEmpty(latitude) && helper.isEmpty(longitude)) {
        // select lat lon by unique id from users
        async_db.query(queries.select_lat_lon_by_unique_id, [unique_id], function (coordErr, coordRes) {
            if (coordErr) {
                return res.status(500).send(coordErr.message);
            } else if (helper.isEmpty(coordRes)) {
                return res.status(404).send('Could not find coordinates for unique_id: ' + unique_id);
            } else {
                latitude = coordRes[0].latitude;
                longitude = coordRes[0].longitude;
                selectClosestShelters(latitude, longitude, false, sendResult);
            }
        })
    } else {
        selectClosestShelters(latitude, longitude, true, sendResult);
    }
});

module.exports = router;