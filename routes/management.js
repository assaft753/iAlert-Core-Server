var express = require('express');
var queries = require('../queries/queries');
var router = express.Router();
var connection = require('../models/async-db');
var helper = require('../models/helper');


//------- Shelters -------//

router.get('/shelters', function (req, res) {
    connection.query(queries.select_all_shelters, function (err, dbRes) {
        if (err) {
            return res.status(500).send(err.message);
        } else if (helper.isEmpty(dbRes)) {
            return res.status(404).send('Could not find any shelter');
        } else {
            var result = {
                result: dbRes
            };
            return res.status(200).send(result);
        }
    });
});

router.get('/shelters/safeZones', function (req, res) {
    var area_code = req.query.area_code;
    if (helper.isEmpty(area_code)) {
        return res.status(400).send('area_code is mandatory');
    }

    area_code = parseInt(area_code, 10);
    connection.query(queries.select_shelters_by_location, [area_code], function (err, dbRes) {
        if (err) {
            return res.status(500).send(err.message);
        } else if (helper.isEmpty(dbRes)) {
            return res.status(404).send('Could not find any shelter with area code: ' + area_code);
        } else {
            var result = {
                result: dbRes
            };
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
            return res.status(500).send(err.message);
        } else if (helper.isEmpty(area_code)){
            return res.status(404).send('Could not find any area for city: ' + city);
        } else {
            area_code = area_code[0].area_code;
            connection.query(queries.select_all_by_lat_lon, [latitude, longitude], function (err, dbRes) {
                if (err) {
                    return res.status(500).send(err.message);
                } else if (!helper.isEmpty(dbRes)) {
                    return res.status(200).send('This shelter in latitude = ' + latitude + ' and longitude = ' + longitude + ' already exists in DB');
                } else {
                    connection.query(queries.insert_shelter, [area_code, user_email, latitude, longitude, address], function (err, dbRes) {
                        if (err) {
                            return res.status(500).send(err.message);
                        } else {
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
        return res.status(400).send('id is mandatory');
    }

    id = parseInt(id, 10);
    connection.query(queries.update_approved_shelter, [id], function (err, dbRes) {
        if (err) {
            return res.status(500).send(err.message);
        } else {
            return res.status(200).send(dbRes);
        }
    });
});

router.delete('/shelters', function (req, res) {
    var id = req.query.id;

    if (helper.isEmpty(id)) {
        return res.status(400).send('id is mandatory');
    }

    connection.query(queries.delete_shelter, [id], function (err, dbRes) {
        if (err) {
            return res.status(500).send(err.message);
        } else {
            return res.status(200).send(dbRes);
        }
    });
});


//------- Devices -------//

router.get('/devices', function (req, res) {
    var area_code = req.query.area_code;
    if (helper.isEmpty(area_code)) {
        return res.status(400).send('area_code is mandatory');
    }

    area_code = parseInt(area_code, 10);
    connection.query(queries.select_devices_by_area_code, [area_code], function (err, dbRes) {
        if (err) {
            return res.status(500).send(err.message);
        } else if (helper.isEmpty(dbRes)) {
            return res.status(404).send('Could not find any device with area code: ' + area_code);
        }  else {
            var result = {
                result: dbRes
            };
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
                return res.status(500).send(err.message);
            } else {
                return res.status(200).send(dbRes);
            }
        });
});

router.post('/users', function (req, res) {
    var email = req.body.email ? req.body.email : '';
    var admin = req.body.admin ? req.body.admin : false;

    connection.query(queries.insert_user, [email, admin], function ( err, dbRes ) {
        if (err) {
            return res.status(500).send(err.message);
        } else {
            return res.status(200).send(dbRes);
        }
    });
});

router.put('/users/points_approved', function (req, res) {
    var email = req.query.email;

    if (helper.isEmpty(email)) {
        return res.status(400).send('email is mandatory');
    }

    connection.query(queries.update_pointes_approved_for_user, [email], function (err, dbRes) {
        if (err) {
            return res.status(500).send(err.message);
        } else {
            return res.status(200).send(dbRes);
        }
    });
});

router.put('/users/points_collected', function (req, res) {
    var email = req.query.email;

    if (helper.isEmpty(email)) {
        return res.status(400).send('email is mandatory');
    }

    connection.query(queries.update_pointes_collected_for_user, [email], function (err, dbRes) {
        if (err) {
            return res.status(500).send(err.message);
        } else {
            return res.status(200).send(dbRes);
        }
    });
});

router.put('/users/points_declined', function (req, res) {
    var email = req.query.email;

    if (helper.isEmpty(email)) {
        return res.status(400).send('email is mandatory');
    }

    connection.query(queries.update_pointes_declined_for_user, [email], function (err, dbRes) {
        if (err) {
            return res.status(500).send(err.message);
        } else {
            return res.status(200).send(dbRes);
        }
    });
});

router.get('/users', function (req, res) {
    var email = req.query.email;
    if (helper.isEmpty(email)) {
        return res.status(400).send('email is mandatory');
    }

    connection.query(queries.select_user_by_email, [email], function (err, dbRes) {
        if (err) {
            return res.status(500).send(err.message);
        } else if (helper.isEmpty(dbRes)) {
            return res.status(404).send('Could not find any user with email: ' + email);
        }  else {
            return res.status(200).send(dbRes[0]);
        }
    });
});


//------- Areas -------//

router.post('/areas', function (req, res) {
    var area_code = req.body.area_code ? req.body.area_code : -1;
    var city = req.body.city ? req.body.city : '';

    connection.query(queries.insert_areas, [area_code, city.toLowerCase()], function (err, dbRes) {
            if (err) {
                return res.status(500).send(err.message);
        } else {
            return res.status(200).send(dbRes);
        }
    });
});

router.get('/areas', function (req, res) {
    var city = req.query.city;
    if (helper.isEmpty(city)) {
        return res.status(400).send('city is mandatory');
    }

    connection.query(queries.select_area_code_by_city_name, [city.toLowerCase()], function ( err, dbRes ) {
        if (err) {
            return res.status(500).send(err.message);
        } else if (helper.isEmpty(dbRes)) {
            return res.status(404).send('Could not find any area for city name: ' + city.toLowerCase());
        } else {
            return res.status(200).send(dbRes[0]);
        }
    });
});

module.exports = router;
