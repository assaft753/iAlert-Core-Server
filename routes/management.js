var express = require('express');
var queries = require('../queries/queries');
var router = express.Router();
var connection = require('../models/async-db');
var helper = require('../models/helper');
var fbAdmin = require('../models/iAlert-firebase');
var TOKEN = 'iAlert_Collection_Shelters_Token';
var log4js = require('log4js');
var Logger = log4js.getLogger('[Management]');
var _ = require('underscore');
Logger.level = 'debug';


//------- Shelters -------//

router.get('/shelters', function (req, res) {
    connection.query(queries.select_all_shelters, function (err, dbRes) {
        if (err) {
            Logger.error(err.stack);
            return res.status(500).send(err.message);
        } else if (helper.isEmpty(dbRes)) {
            Logger.error('Could not get all shelters. Error: Could not find any shelter');
            return res.status(404).send('Could not find any shelter');
        } else {
            var result = {
                result: dbRes
            };
            Logger.info('Get all shelters successfully');
            return res.status(200).send(result);
        }
    });
});

router.get('/shelters/safeZones', function (req, res) {
    var areaCode = req.query.area_code;
    if (helper.isEmpty(areaCode)) {
        Logger.error('Could not get shelters safe zone. Error: area_code is mandatory');
        return res.status(400).send('area_code is mandatory');
    }

    areaCode = parseInt(areaCode, 10);
    connection.query(queries.select_shelters_by_location, [areaCode], function (err, dbRes) {
        if (err) {
            Logger.error(err.stack);
            return res.status(500).send(err.message);
        } else if (helper.isEmpty(dbRes)) {
            Logger.error('Could not get shelters safe zone. Error: Could not find any shelter with area code: ' + areaCode);
            return res.status(404).send('Could not find any shelter with area code: ' + areaCode);
        } else {
            var result = {
                result: dbRes
            };
            Logger.info('Get shelters for safe zone with area code: ' + areaCode + ' successfully');
            return res.status(200).send(result);
        }
    });
});

router.post('/shelters', function (req, res) {
    var city = req.body.city;
    var userEmail = req.body.user_email;
    var latitude = req.body.latitude ? req.body.latitude : 0;
    var longitude = req.body.longitude ? req.body.longitude : 0;
    var address = req.body.address ? req.body.address : '';

    if (helper.isEmpty(city)) {
        Logger.error('Could not post shelter. Error: city is mandatory');
        return res.status(400).send('city is mandatory');
    }

    if (helper.isEmpty(userEmail)) {
        Logger.error('Could not post shelter. Error: user_email is mandatory');
        return res.status(400).send('user_email is mandatory');
    }

    var cityName = helper.convertCityName(city);

    if (helper.isEmpty(cityName)) {
        Logger.error('Could not post shelter. Error: city must contains letters');
        return res.status(400).send('city must contains letters');
    }

    connection.query(queries.select_area_code_by_city_name, [cityName], function (err, areaCode) {
        if (err) {
            Logger.error(err.stack);
            return res.status(500).send(err.message);
        } else if (helper.isEmpty(areaCode)){
            Logger.error('Could not create shelters. Error: Could not find any area for city: ' + cityName);
            return res.status(404).send('Could not find any area for city: ' + cityName);
        } else {
            areaCode = areaCode[0].area_code;
            connection.query(queries.select_all_by_lat_lon, [latitude, longitude], function (err, dbRes) {
                if (err) {
                    Logger.error(err.stack);
                    return res.status(500).send(err.message);
                } else if (!helper.isEmpty(dbRes)) {
                    Logger.info('This shelter in latitude = ' + latitude + ' and longitude = ' + longitude + ' already exists in DB');
                    return res.status(200).send('This shelter in latitude = ' + latitude + ' and longitude = ' + longitude + ' already exists in DB');
                } else {
                    connection.query(queries.insert_shelter, [areaCode, userEmail, latitude, longitude, address], function (err, dbRes) {
                        if (err) {
                            Logger.error(err.stack);
                            return res.status(500).send(err.message);
                        } else {
                            Logger.info('Create shelters successfully');
                            return res.status(200).send(dbRes);
                        }
                    });
                }
            });
        }
    });

});


router.put('/shelters', function (req, res) {
    var id = req.query.id;

    if (helper.isEmpty(id)) {
        Logger.error('Could not update shelters. Error: id is mandatory');
        return res.status(400).send('id is mandatory');
    }

    id = parseInt(id, 10);
    connection.query(queries.update_approved_shelter, [id], function (err, dbRes) {
        if (err) {
            Logger.error(err.stack);
            return res.status(500).send(err.message);
        } else {
            Logger.info('Update shelter with id: ' + id + ' successfully');
            return res.status(200).send(dbRes);
        }
    });
});

router.delete('/shelters', function (req, res) {
    var id = req.query.id;

    if (helper.isEmpty(id)) {
        Logger.error('Could not delete shelters. Error: id is mandatory');
        return res.status(400).send('id is mandatory');
    }

    connection.query(queries.delete_shelter, [id], function (err, dbRes) {
        if (err) {
            Logger.error(err.stack);
            return res.status(500).send(err.message);
        } else {
            Logger.info('Delete shelter with id: ' + id + ' successfully');
            return res.status(200).send(dbRes);
        }
    });
});


//------- Devices -------//

router.get('/devices', function (req, res) {
    var areaCode = req.query.area_code;

    if (helper.isEmpty(areaCode)) {
        Logger.error('Could not get devices. Error: area_code is mandatory');
        return res.status(400).send('area_code is mandatory');
    }

    areaCode = parseInt(areaCode, 10);
    connection.query(queries.select_devices_by_area_code, [areaCode], function (err, dbRes) {
        if (err) {
            Logger.error(err.stack);
            return res.status(500).send(err.message);
        } else if (helper.isEmpty(dbRes)) {
            Logger.error('Could not get devices. Error: Could not find any device with area code: ' + areaCode);
            return res.status(404).send('Could not find any device with area code: ' + areaCode);
        }  else {
            var result = {
                result: dbRes
            };

            Logger.info('Get devices in area code: ' + areaCode + ' successfully');
            return res.status(200).send(result);
        }
    });
});


//------- Users -------//

router.post('/users/withPoints', function (req, res) {
    var email = req.body.email;
    var admin = req.body.admin ? req.body.admin : false;
    var pointsApproved = req.body.points_approved ? req.body.points_approved : 0;
    var pointsCollected = req.body.points_collected ? req.body.points_collected : 0;
    var pointsDeclined = req.body.points_declined ? req.body.points_declined : 0;

    if (helper.isEmpty(email)) {
        Logger.error('Could not post user with points. Error: email is mandatory');
        return res.status(400).send('email is mandatory');
    }

    connection.query(queries.insert_user_with_points, [email, admin, pointsApproved, pointsCollected, pointsDeclined]
        , function (err, dbRes) {
            if (err) {
                Logger.error(err.stack);
                return res.status(500).send(err.message);
            } else {
                Logger.info('Create users with points successfully');
                return res.status(200).send(dbRes);
            }
        });
});

router.post('/users', function (req, res) {
    var email = req.body.email;
    var admin = req.body.admin ? req.body.admin : false;

    if (helper.isEmpty(email)) {
        Logger.error('Could not post user. Error: email is mandatory');
        return res.status(400).send('email is mandatory');
    }

    connection.query(queries.insert_user, [email, admin], function ( err, dbRes ) {
        if (err) {
            Logger.error(err.stack);
            return res.status(500).send(err.message);
        } else {
            Logger.info('Create users successfully');
            return res.status(200).send(dbRes);
        }
    });
});

router.put('/users/points_approved', function (req, res) {
    var email = req.query.email;

    if (helper.isEmpty(email)) {
        Logger.error('Could not update user with points approved. Error: email is mandatory');
        return res.status(400).send('email is mandatory');
    }

    connection.query(queries.update_pointes_approved_for_user, [email], function (err, dbRes) {
        if (err) {
            Logger.error(err.stack);
            return res.status(500).send(err.message);
        } else {
            Logger.info('Update users with points approved for email: ' + email + ' successfully');
            return res.status(200).send(dbRes);
        }
    });
});

router.put('/users/points_collected', function (req, res) {
    var email = req.query.email;

    if (helper.isEmpty(email)) {
        Logger.error('Could not update user with points collected. Error: email is mandatory');
        return res.status(400).send('email is mandatory');
    }

    connection.query(queries.update_pointes_collected_for_user, [email], function (err, dbRes) {
        if (err) {
            Logger.error(err.stack);
            return res.status(500).send(err.message);
        } else {
            Logger.info('Update users with points collected for email: ' + email + ' successfully');
            return res.status(200).send(dbRes);
        }
    });
});

router.put('/users/points_declined', function (req, res) {
    var email = req.query.email;

    if (helper.isEmpty(email)) {
        Logger.error('Could not update user with points declined. Error: email is mandatory');
        return res.status(400).send('email is mandatory');
    }

    connection.query(queries.update_pointes_declined_for_user, [email], function (err, dbRes) {
        if (err) {
            Logger.error(err.stack);
            return res.status(500).send(err.message);
        } else {
            Logger.info('Update users with points declined for email: ' + email + ' successfully');
            return res.status(200).send(dbRes);
        }
    });
});

router.get('/users', function (req, res) {
    var email = req.query.email;

    if (helper.isEmpty(email)) {
        Logger.error('Could not get user. Error: email is mandatory');
        return res.status(400).send('email is mandatory');
    }

    connection.query(queries.select_user_by_email, [email], function (err, dbRes) {
        if (err) {
            Logger.error(err.stack);
            return res.status(500).send(err.message);
        } else if (helper.isEmpty(dbRes)) {
            Logger.error('Could not get user. Error: Could not find any user with email: ' + email);
            return res.status(404).send('Could not find any user with email: ' + email);
        }  else {
            Logger.info('Get user with email: ' + email + ' successfully');
            return res.status(200).send(dbRes[0]);
        }
    });
});

router.post('/users/register', function (req, res) {
    var email = req.query.email;
    var password = req.query.password;
    var token = req.query.token;

    if (token !== TOKEN) {
        Logger.error('Could not register user. Error: Unknown token, could not register the user.');
        return res.status(401).send('Unknown token, could not register the user.');
    }

    Logger.info('Token is correct, validating email and password is not empty');

    if (helper.isEmpty(email)){
        Logger.error('Could not register user. Error: email is mandatory');
        return res.status(400).send('email is mandatory');
    }

    if (helper.isEmpty(password)){
        Logger.error('Could not register user. Error: password is mandatory');
        return res.status(400).send('password is mandatory');
    }

    Logger.info('Start registering the user with email: ' + email);

    fbAdmin.auth().createUser({
        email: email,
        emailVerified: false,
        password: password,
        disabled: false
    }).then(function(userRecord) {
        Logger.info('Successfully created new user: ' + userRecord.uid + ' for email: ' + email);
        return res.status(200).send(userRecord);
    }).catch(function (error) {
        Logger.error('Could not create user for email: ' + email + ' due to error: ' + error);
        Logger.error(error.stack);
        return res.status(500).send(error.message);
    });
});


//------- Areas -------//

router.post('/areas', function (req, res) {
    var areaCode = req.body.area_code;
    var city = req.body.city;
    var maxTime = req.body.max_time_to_arrive_to_shelter;

    if (helper.isEmpty(areaCode)) {
        Logger.error('Could not post area. Error: area_code is mandatory');
        return res.status(400).send('area_code is mandatory');
    }

    if (helper.isEmpty(city)) {
        Logger.error('Could not post area. Error: city is mandatory');
        return res.status(400).send('city is mandatory');
    }

    if (helper.isEmpty(maxTime)) {
        Logger.error('Could not post area. Error: max_time_to_arrive_to_shelter is mandatory');
        return res.status(400).send('max_time_to_arrive_to_shelter is mandatory');
    }

    var cityName = helper.convertCityName(city);

    if (helper.isEmpty(cityName)) {
        Logger.error('Could not post shelter. Error: city must contains letters');
        return res.status(400).send('city must contains letters');
    }

    // Check if area_code is already exists in table
    connection.query(queries.select_area_by_area_code, [areaCode], function (err, dbRes) {
        if (err) {
            Logger.error(err.stack);
            return res.status(500).send(err.message);
        } else if (helper.isEmpty(dbRes)) {
            // Insert new area
            connection.query(queries.insert_areas, [areaCode, cityName, maxTime], function (err, dbRes) {
                if (err) {
                    Logger.error(err.stack);
                    return res.status(500).send(err.message);
                } else {
                    Logger.info('Create area successfully');
                    return res.status(200).send(dbRes);
                }
            });
        } else {
            // parse city to array
            var area = dbRes[0];
            var cities = area.city;
            cities = cities.split(',');
            // check if city is already exists in the array
            if (_.indexOf(cities, cityName) !== -1) {
                // Send message: city exists
                return res.status(409).send('city already exists');
            } else {
                // update city array + convert to string and save it to DB
                cities.push(cityName);
                cities = cities.join(',');
                connection.query(queries.update_city, [cities, areaCode], function (err, dbRes) {
                    if (err) {
                        Logger.error(err.stack);
                        return res.status(500).send(err.message);
                    } else {
                        Logger.info('Create area successfully');
                        return res.status(200).send(dbRes);
                    }
                });
            }
        }
    });
});

router.get('/areas/getAll', function (req, res) {
   connection.query(queries.select_all_areas, [], function (err, dbRes) {
       if (err) {
           Logger.error(err.stack);
           return res.status(500).send(err.message);
       } else if (helper.isEmpty(dbRes)) {
           Logger.error('Could not get all areas. Error: Could not find any area');
           return res.status(404).send('Could not find any area');
       } else {
           Logger.info('Get all areas successfully');
           return res.status(200).send(dbRes);
       }
   })
});

router.get('/areas', function (req, res) {
    var city = req.query.city;

    if (helper.isEmpty(city)) {
        Logger.error('Could not get area. Error: city is mandatory');
        return res.status(400).send('city is mandatory');
    }

    var cityName = helper.convertCityName(city);

    if (helper.isEmpty(cityName)) {
        Logger.error('Could not post shelter. Error: city must contains letters');
        return res.status(400).send('city must contains letters');
    }

    connection.query(queries.select_area_code_by_city_name, [cityName], function ( err, dbRes ) {
        if (err) {
            Logger.error(err.stack);
            return res.status(500).send(err.message);
        } else if (helper.isEmpty(dbRes)) {
            Logger.error('Could not get area. Error: Could not find any area for city name: ' + cityName);
            return res.status(404).send('Could not find any area for city name: ' + cityName);
        } else {
            Logger.info('Get area for city: ' + cityName + ' successfully');
            return res.status(200).send(dbRes[0]);
        }
    });
});

router.post('/areas/preferred', function (req, res) {
    var areaCode = req.body.area_code;
    var uniqueId = req.body.unique_id;

    if (helper.isEmpty(areaCode)) {
        Logger.error('Could not add preferred area for device. Error: area_code is mandatory');
        return res.status(400).send('area_code is mandatory');
    }

    if (helper.isEmpty(uniqueId)) {
        Logger.error('Could not add preferred area for device. Error: unique_id is mandatory');
        return res.status(400).send('unique_id is mandatory');
    }

    connection.query(queries.select_device, [uniqueId], function (err, deviceId) {
        if (err) {
            Logger.error(err.stack);
            return res.status(500).send(err.message);
        } else if (helper.isEmpty(deviceId) || helper.isEmpty(deviceId[0].id)) {
            var errMsg = 'Could not add preferred area for device. Error: could not find device_id for unique_id: ' + uniqueId;
            Logger.error(errMsg);
            return res.status(404).send(errMsg);
        } else {
            connection.query(queries.insert_preferred_areas_for_device, [deviceId[0].id, areaCode], function (err, dbRes) {
                if (err) {
                    Logger.error(err.stack);
                    return res.status(500).send(err.message);
                } else {
                    Logger.info('Successfully added preferred area: area_code: ' + areaCode + ' for unique_id: ' + uniqueId);
                    return res.status(200).send(dbRes);
                }
            });
        }
    });
});

router.get('/areas/preferred', function (req, res) {
    var uniqueId = req.query.unique_id;

    if (helper.isEmpty(uniqueId)) {
        Logger.error('Could not get preferred areas for device. Error: unique_id is mandatory');
        return res.status(400).send('unique_id is mandatory');
    }

    connection.query(queries.select_device, [uniqueId], function (err, deviceId) {
        if (err) {
            Logger.error(err.stack);
            return res.status(500).send(err.message);
        } else if (helper.isEmpty(deviceId) || helper.isEmpty(deviceId[0].id)) {
            var errMsg = 'Could not get preferred areas for device. Error: could not find device_id for unique_id: ' + uniqueId;
            Logger.error(errMsg);
            return res.status(404).send(errMsg);
        } else {
            connection.query(queries.select_preferred_areas_for_device, [deviceId[0].id], function (err, dbRes) {
                if (err) {
                    Logger.error(err.stack);
                    return res.status(500).send(err.message);
                } else {
                    Logger.info('Successfully get preferred areas for unique_id: ' + uniqueId);
                    return res.status(200).send(dbRes);
                }
            });
        }
    });
});


router.delete('/areas/allPreferred', function (req, res) {
    var uniqueId = req.query.unique_id;

    if (helper.isEmpty(uniqueId)) {
        Logger.error('Could not delete all preferred areas for device. Error: unique_id is mandatory');
        return res.status(400).send('unique_id is mandatory');
    }

    connection.query(queries.select_device, [uniqueId], function (err, deviceId) {
        if (err) {
            Logger.error(err.stack);
            return res.status(500).send(err.message);
        } else if (helper.isEmpty(deviceId) || helper.isEmpty(deviceId[0].id)) {
            var errMsg = 'Could not delete all preferred areas for device. Error: could not find device_id for unique_id: ' + uniqueId;
            Logger.error(errMsg);
            return res.status(404).send(errMsg);
        } else {
            connection.query(queries.delete_all_preferred_area_for_device, [deviceId[0].id], function (err, dbRes) {
                if (err) {
                    Logger.error(err.stack);
                    return res.status(500).send(err.message);
                } else {
                    Logger.info('Successfully deleted all preferred areas for unique_id: ' + uniqueId);
                    return res.status(200).send(dbRes);
                }
            });
        }
    });
});

router.delete('/areas/OnePreferred', function (req, res) {
    var uniqueId = req.query.unique_id;
    var areaCode = req.query.area_code;

    if (helper.isEmpty(areaCode)) {
        Logger.error('Could not delete preferred area for device. Error: area_code is mandatory');
        return res.status(400).send('area_code is mandatory');
    }

    if (helper.isEmpty(uniqueId)) {
        Logger.error('Could not delete preferred area for device. Error: unique_id is mandatory');
        return res.status(400).send('unique_id is mandatory');
    }

    connection.query(queries.select_device, [uniqueId], function (err, deviceId) {
        if (err) {
            Logger.error(err.stack);
            return res.status(500).send(err.message);
        } else if (helper.isEmpty(deviceId) || helper.isEmpty(deviceId[0].id)) {
            var errMsg = 'Could not delete preferred area for device. Error: could not find device_id for unique_id: ' + uniqueId;
            Logger.error(errMsg);
            return res.status(404).send(errMsg);
        } else {
            connection.query(queries.delete_preferred_area_for_device, [deviceId[0].id, areaCode], function (err, dbRes) {
                if (err) {
                    Logger.error(err.stack);
                    return res.status(500).send(err.message);
                } else {
                    Logger.info('Successfully deleted preferred area: area_code: ' + areaCode + ' for unique_id: ' + uniqueId);
                    return res.status(200).send(dbRes);
                }
            });
        }
    });
});

module.exports = router;
