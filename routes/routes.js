var mysql = require('mysql');
var express = require('express');
var queries = require('../queries/queries');
var router = express.Router();
var connection;

connection = mysql.createConnection({
    host: "localhost",
    user: "ialert",
    password: "1234567",
    database: 'iAlert'
});

connection.connect(function (err) {
    if (err) console.error('Could not connect to DB due to error: ' + err);
    else console.log("Connected!");
});

function isEmpty(value) {
    return (
        value === '' ||
        value === null ||
        value === undefined ||
        (Array.isArray(value) && value.length === 0) ||
        (typeof value === 'object' && !(value instanceof Map) && Object.keys(value).length === 0) ||
        (value instanceof Map && value.size === 0)
    );
}

//------- Shelters -------//

router.get('/shelters', function (req, res) {
    connection.query(queries.select_all_shelters, function (err, dbRes) {
        if (err) {
            return res.status(err.code).send(err.message);
        } else {
            return res.status(200).send(dbRes);
        }
    });
});


router.get('/shelters/safeZones/:areas', function (req, res) {
    var areas = req.params.areas;
    if (isEmpty(areas)) {
        return res.status(501).send('areas path parameter is mandatory');
    }

    areas = parseInt(areas, 10);
//    connection.query(queries.select_shelters_by_location, [areas], function (err, dbRes) {
     connection.query('SELECT * FROM shelters WHERE areas = ' + areas + ' AND approved = 1', function (err, dbRes) {
        if (err) {
            return res.status(err.code).send(err.message);
        } else {
            return res.status(200).send(dbRes);
        }
    });
});

router.post('/shelters', function (req, res) {
    var areas = req.body.areas ? req.body.areas : '';
    var user_id = req.body.user_id ? req.body.user_id : 0;
    var latitude = req.body.latitude ? req.body.latitude : 0;
    var longitude = req.body.longitude ? req.body.longitude : 0;
    var address = req.body.address ? req.body.address : '';

   // connection.query(queries.insert_shelter, [areas, user_id, latitude, longitude, address]
     connection.query('INSERT INTO shelters (areas, user_id, latitude, longitude, address) ' +
         'VALUES (' + areas + ',' + user_id + ',' + latitude + ',' + longitude + ',"' + address + '")'
        , function (err, dbRes) {
            if (err) {
                return res.status(err.code).send(err.message);
            } else {
                return res.status(200).send(dbRes);
            }
    });
});


router.put('/shelters/:id', function (req, res) {
    var id = req.params.id;

    if (isEmpty(id)) {
        return res.status(501).send('id path parameter is mandatory');
    }

    connection.query(queries.update_approved_shelter, [id], function (err, dbRes) {
    // connection.query('UPDATE shelters SET approved = 1 WHERE id = ' + id, function (err, dbRes) {
        if (err) {
            return res.status(err.code).send(err.message);
        } else {
            return res.status(200).send(dbRes);
        }
    });
});

router.delete('/shelters/:id', function (req, res) {
    var id = req.params.id;

    if (isEmpty(id)) {
        return res.status(501).send('id path parameter is mandatory');
    }

    connection.query(queries.delete_shelter, [id], function (err, dbRes) {
   // connection.query('DELETE FROM shelters WHERE id = ' + id, function (err, dbRes) {
        if (err) {
            return res.status(err.code).send(err.message);
        } else {
            return res.status(200).send(dbRes);
        }
    });
});

//------- Devices -------//

router.get('/devices/:area_code', function (req, res) {
    var area_code = req.params.area_code;
    if (isEmpty(area_code)) {
        return res.status(501).send('area_code path parameter is mandatory');
    }

    area_code = parseInt(area_code, 10);
    connection.query(queries.select_devices_by_area_code, [area_code], function (err, dbRes) {
    // connection.query('SELECT * FROM devices WHERE area_code = ' + area_code, function ( err, dbRes ) {
        if (err) {
            return res.status(err.code).send(err.message);
        } else {
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
    var points_declined = req.body.points_declined ? req.body.points_declined : '';

    connection.query(queries.insert_user_with_points, [email, admin, points_approved, points_collected, points_declined]
    // connection.query('INSERT INTO users (email, admin, points_approved, points_collected, points_declined) ' +
    //                 'VALUES ("' + email + '",' + admin + ',' + points_approved + ',' + points_collected + ',' + points_declined + ')'
                    , function ( err, dbRes ) {
        if (err) {
            return res.status(err.code).send(err.message);
        } else {
            return res.status(200).send(dbRes);
        }
    });
});

router.post('/users', function (req, res) {
    var email = req.body.email ? req.body.email : '';
    var admin = req.body.admin ? req.body.admin : false;

    connection.query(queries.insert_user, [email, admin]
    // connection.query('INSERT INTO users (email, admin) VALUES ("' + email + '",' + admin + ')'
                    , function ( err, dbRes ) {
        if (err) {
            return res.status(err.code).send(err.message);
        } else {
            return res.status(200).send(dbRes);
        }
    });
});

router.put('/users/points_approved/:email', function (req, res) {
    var email = req.params.email;

    if (isEmpty(email)) {
        return res.status(501).send('email path parameter is mandatory');
    }

    connection.query(queries.update_pointes_approved_for_user, [email], function (err, dbRes) {
    // connection.query('UPDATE users SET points_approved = points_approved + 1 WHERE email = "' + email + '"', function (err, dbRes) {
        if (err) {
            return res.status(err.code).send(err.message);
        } else {
            return res.status(200).send(dbRes);
        }
    });
});

router.put('/users/points_declined/:email', function (req, res) {
    var email = req.params.email;

    if (isEmpty(email)) {
        return res.status(501).send('email path parameter is mandatory');
    }

    connection.query(queries.update_pointes_declined_for_user, [email], function (err, dbRes) {
    // connection.query('UPDATE users SET points_declined = points_declined + 1 WHERE email = "' + email + '"', function (err, dbRes) {
        if (err) {
            return res.status(err.code).send(err.message);
        } else {
            return res.status(200).send(dbRes);
        }
    });
});

router.get('/users/:email', function (req, res) {
    var email = req.params.email;
    if (isEmpty(email)) {
        return res.status(501).send('email path parameter is mandatory');
    }

    connection.query(queries.select_user_by_email, [email], function (err, dbRes) {
    // connection.query('SELECT * FROM users WHERE email = "' + email + '"', function ( err, dbRes ) {
        if (err) {
            return res.status(err.code).send(err.message);
        } else {
            return res.status(200).send(dbRes);
        }
    });
});

//------- Areas -------//

router.post('/areas', function (req, res) {
    var area_code = req.body.area_code ? req.body.area_code : '';
    var city = req.body.city ? req.body.city : '';

    connection.query(queries.insert_areas, [area_code, city]
    // connection.query('INSERT INTO areas (area_code, city) VALUES (' + area_code + ',"' + city + '")'
                    , function ( err, dbRes ) {
        if (err) {
            return res.status(err.code).send(err.message);
        } else {
            return res.status(200).send(dbRes);
        }
    });
});

router.get('/areas:city', function (req, res) {
    var city = req.params.city;
    if (isEmpty(city)) {
        return res.status(501).send('city path parameter is mandatory');
    }

    connection.query(queries.select_area_code_by_city_name, [city]
    // connection.query('SELECT area_code FROM areas WHERE city = "' + city + '")'
        , function ( err, dbRes ) {
            if (err) {
                return res.status(err.code).send(err.message);
            } else {
                return res.status(200).send(dbRes);
            }
        });
});

module.exports = router;
