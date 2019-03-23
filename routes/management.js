var express = require('express');
var queries = require('../queries/queries');
var router = express.Router();
var connection = require('../models/async-db');
var helper = require('../models/helper');
var fbAdmin = require('../models/iAlert-firebase');
var TOKEN = 'iAlert_Collection_Shelters_Token';
var log4js = require('log4js');
var Logger = log4js.getLogger('[Management]');
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
    var area_code = req.query.area_code;
    if (helper.isEmpty(area_code)) {
        Logger.error('Could not get shelters safe zone. Error: area_code is mandatory');
        return res.status(400).send('area_code is mandatory');
    }

    area_code = parseInt(area_code, 10);
    connection.query(queries.select_shelters_by_location, [area_code], function (err, dbRes) {
        if (err) {
            Logger.error(err.stack);
            return res.status(500).send(err.message);
        } else if (helper.isEmpty(dbRes)) {
            Logger.error('Could not get shelters safe zone. Error: Could not find any shelter with area code: ' + area_code);
            return res.status(404).send('Could not find any shelter with area code: ' + area_code);
        } else {
            var result = {
                result: dbRes
            };
            Logger.info('Get shelters for safe zone with area code: ' + area_code + ' successfully');
            return res.status(200).send(result);
        }
    });
});

router.post('/shelters', function (req, res) {
    var city = req.body.city ? req.body.city : '';
    var user_email = req.body.user_email ? req.body.user_email : 0;
    var latitude = req.body.latitude ? req.body.latitude : 0;
    var longitude = req.body.longitude ? req.body.longitude : 0;
    var address = req.body.address ? req.body.address : '';

    connection.query(queries.select_area_code_by_city_name, [city.toLowerCase()], function (err, area_code) {
        if (err) {
            Logger.error(err.stack);
            return res.status(500).send(err.message);
        } else if (helper.isEmpty(area_code)){
            Logger.error('Could not create shelters. Error: Could not find any area for city: ' + city);
            return res.status(404).send('Could not find any area for city: ' + city);
        } else {
            area_code = area_code[0].area_code;
            connection.query(queries.select_all_by_lat_lon, [latitude, longitude], function (err, dbRes) {
                if (err) {
                    Logger.error(err.stack);
                    return res.status(500).send(err.message);
                } else if (!helper.isEmpty(dbRes)) {
                    Logger.info('This shelter in latitude = ' + latitude + ' and longitude = ' + longitude + ' already exists in DB');
                    return res.status(200).send('This shelter in latitude = ' + latitude + ' and longitude = ' + longitude + ' already exists in DB');
                } else {
                    connection.query(queries.insert_shelter, [area_code, user_email, latitude, longitude, address], function (err, dbRes) {
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
    var area_code = req.query.area_code;
    if (helper.isEmpty(area_code)) {
        Logger.error('Could not get devices. Error: area_code is mandatory');
        return res.status(400).send('area_code is mandatory');
    }

    area_code = parseInt(area_code, 10);
    connection.query(queries.select_devices_by_area_code, [area_code], function (err, dbRes) {
        if (err) {
            Logger.error(err.stack);
            return res.status(500).send(err.message);
        } else if (helper.isEmpty(dbRes)) {
            Logger.error('Could not get devices. Error: Could not find any device with area code: ' + area_code);
            return res.status(404).send('Could not find any device with area code: ' + area_code);
        }  else {
            var result = {
                result: dbRes
            };

            Logger.info('Get devices in area code: ' + area_code + ' successfully');
            return res.status(200).send(result);
        }
    });
});


//------- Users -------//

router.post('/users/withPoints', function (req, res) {
    var email = req.body.email ? req.body.email : '';
    var admin = req.body.admin ? req.body.admin : false;
    var points_approved = req.body.points_approved ? req.body.points_approved : 0;
    var points_collected = req.body.points_collected ? req.body.points_collected : 0;
    var points_declined = req.body.points_declined ? req.body.points_declined : 0;

    connection.query(queries.insert_user_with_points, [email, admin, points_approved, points_collected, points_declined]
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
    var email = req.body.email ? req.body.email : '';
    var admin = req.body.admin ? req.body.admin : false;

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

    Logger.info('Token is correct, check email and password validation');

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
    var area_code = req.body.area_code ? req.body.area_code : -1;
    var city = req.body.city ? req.body.city : '';

    connection.query(queries.insert_areas, [area_code, city.toLowerCase()], function (err, dbRes) {
        if (err) {
            Logger.error(err.stack);
            return res.status(500).send(err.message);
        } else {
            Logger.info('Create area successfully');
            return res.status(200).send(dbRes);
        }
    });
});

router.get('/areas', function (req, res) {
    var city = req.query.city;
    if (helper.isEmpty(city)) {
        Logger.error('Could not get area. Error: city is mandatory');
        return res.status(400).send('city is mandatory');
    }

    connection.query(queries.select_area_code_by_city_name, [city.toLowerCase()], function ( err, dbRes ) {
        if (err) {
            Logger.error(err.stack);
            return res.status(500).send(err.message);
        } else if (helper.isEmpty(dbRes)) {
            Logger.error('Could not get area. Error: Could not find any area for city name: ' + city.toLowerCase());
            return res.status(404).send('Could not find any area for city name: ' + city.toLowerCase());
        } else {
            Logger.info('Get area for city: ' + city.toLowerCase() + ' successfully');
            return res.status(200).send(dbRes[0]);
        }
    });
});

module.exports = router;
