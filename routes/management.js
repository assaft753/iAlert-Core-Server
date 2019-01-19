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
            return res.status(200).send(dbRes);
        }
    });
});

router.get('/shelters/safeZones/:area_code', function (req, res) {
    var area_code = req.params.area_code;
    if (helper.isEmpty(area_code)) {
        return res.status(501).send('area code path parameter is mandatory');
    }

    area_code = parseInt(area_code, 10);
    connection.query(queries.select_shelters_by_location, [area_code], function (err, dbRes) {
        if (err) {
            return res.status(500).send(err.message);
        } else if (helper.isEmpty(dbRes)) {
            return res.status(404).send('Could not find any shelter with area code: ' + area_code);
        } else {
            return res.status(200).send(dbRes);
        }
    });
});

router.post('/shelters', function (req, res) {
    var area_code = req.body.area_code ? req.body.area_code : -1;
    var user_id = req.body.user_id ? req.body.user_id : 0;
    var latitude = req.body.latitude ? req.body.latitude : 0;
    var longitude = req.body.longitude ? req.body.longitude : 0;
    var address = req.body.address ? req.body.address : '';

    connection.query(queries.insert_shelter, [area_code, user_id, latitude, longitude, address], function (err, dbRes) {
        if (err) {
            return res.status(500).send(err.message);
        } else {
            return res.status(200).send(dbRes);
        }
    });
});


router.put('/shelters/:id', function (req, res) {
    var id = req.params.id;

    if (helper.isEmpty(id)) {
        return res.status(501).send('id path parameter is mandatory');
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

router.delete('/shelters/:id', function (req, res) {
    var id = req.params.id;

    if (helper.isEmpty(id)) {
        return res.status(501).send('id path parameter is mandatory');
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

router.get('/devices/:area_code', function (req, res) {
    var area_code = req.params.area_code;
    if (helper.isEmpty(area_code)) {
        return res.status(501).send('area_code path parameter is mandatory');
    }

    area_code = parseInt(area_code, 10);
    connection.query(queries.select_devices_by_area_code, [area_code], function (err, dbRes) {
        if (err) {
            return res.status(500).send(err.message);
        } else if (helper.isEmpty(dbRes)) {
            return res.status(404).send('Could not find any device with area code: ' + area_code);
        }  else {
            return res.status(200).send(dbRes);
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

router.put('/users/points_approved/:email', function (req, res) {
    var email = req.params.email;

    if (helper.isEmpty(email)) {
        return res.status(501).send('email path parameter is mandatory');
    }

    connection.query(queries.update_pointes_approved_for_user, [email], function (err, dbRes) {
        if (err) {
            return res.status(500).send(err.message);
        } else {
            return res.status(200).send(dbRes);
        }
    });
});

router.put('/users/points_declined/:email', function (req, res) {
    var email = req.params.email;

    if (helper.isEmpty(email)) {
        return res.status(501).send('email path parameter is mandatory');
    }

    connection.query(queries.update_pointes_declined_for_user, [email], function (err, dbRes) {
        if (err) {
            return res.status(500).send(err.message);
        } else {
            return res.status(200).send(dbRes);
        }
    });
});

router.get('/users/:email', function (req, res) {
    var email = req.params.email;
    if (helper.isEmpty(email)) {
        return res.status(501).send('email path parameter is mandatory');
    }

    connection.query(queries.select_user_by_email, [email], function (err, dbRes) {
        if (err) {
            return res.status(500).send(err.message);
        } else if (helper.isEmpty(dbRes)) {
            return res.status(404).send('Could not find any user with email: ' + email);
        }  else {
            return res.status(200).send(dbRes);
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

router.get('/areas/:city', function (req, res) {
    var city = req.params.city;
    if (helper.isEmpty(city)) {
        return res.status(501).send('city path parameter is mandatory');
    }

    connection.query(queries.select_area_code_by_city_name, [city.toLowerCase()], function ( err, dbRes ) {
        if (err) {
            return res.status(500).send(err.message);
        } else if (helper.isEmpty(dbRes)) {
            return res.status(404).send('Could not find any area for city name: ' + city.toLowerCase());
        } else {
            return res.status(200).send(dbRes);
        }
    });
});

module.exports = router;
