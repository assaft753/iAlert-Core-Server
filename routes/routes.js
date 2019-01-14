var mysql = require('mysql');
var express = require('express');
var queries = require('../queries/queries');
var router = express.Router();
var sync_mysql = require('../models/promise-db');
var connection;
//mysql.createConnection({
//    host: 'localhost',
//    user: 'ialert',
// password: '1234567',
// database: 'iAlert'
//}).then(function(conn){
//    connection = conn;
//}).catch(function (error) {
//    console.error('Could not connect to DB due to error: ' + error);
//});

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

//module.exports = function (app) {
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

router.get('/', function (req, res) {
    return res.status(200).send('Success');
});

router.get('/shelters', function (req, res) {
    //	connection.connect(function(err) {
    //		if (err) {
    //      		console.error('Could not connect to DB due to error: ' + err);
    //      		return res.status(err.errCode).send('Could not connect to DB due to error: ' + err.message);
    //		}
    //		console.log("Connected!");

    connection.query('SELECT * FROM shelters', function (err, dbRes) {
        if (err) {
            return res.status(err.errCode).send(err.message);
        } else {
            return res.status(200).send(dbRes);
        }
    });
    //  	});
});


router.get('/shelters/safeZones/:areas', function (req, res) {
    var areas = req.params.areas;
    if (isEmpty(areas)) {
        return res.status(501).send('areas path parameter is mandatory');
    }

    areas = parseInt(areas, 10);
    connection.query('SELECT * FROM shelters WHERE areas = ' + areas + ' AND approved = 1', function (err, dbRes) {
        if (err) {
            return res.status(err.errCode).send(err.message);
        } else {
            return res.status(200).send(dbRes);
        }
    });
});

router.post('/shelters', function (req, res) {
    var areas = req.body.areas ? req.body.areas : '';
    var user_id = req.body.user_id ? req.body.user_id : '';
    var latitude = req.body.latitude ? req.body.latitude : 0;
    var longitude = req.body.longitude ? req.body.longitude : 0;
    var address = req.body.address ? req.body.address : '';

    console.log('areas = ' + areas + ', user_id = ' + user_id + ', latitude = ' + latitude + ', longitude = ' + longitude + ', address = ' + address);
    console.log('areas = ' + typeof areas + ', user_id = ' + typeof user_id + ', latitude = ' + typeof latitude + ', longitude = ' + typeof longitude + ', address = ' + typeof address);
    connection.query('INSERT INTO shelters (areas, user_id, latitude, longitude, address) ' +
        'VALUES (' + areas + ',"' + user_id + '",' + latitude + ',' + longitude + ',"' + address + '")'
        , function (err, dbRes) {
            if (err) {
                return res.status(err.errCode).send(err.message);
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
    //after
    var dbRes = sync_mysql.query(queries.update_approved_shelter, [id]);
    return res.status(200).send(dbRes);

    //before
    connection.query('UPDATE shelters approved SET approved = 1 WHERE id = ' + id, function (err, dbRes) {
        if (err) {
            return res.status(err.errCode).send(err.message);
        } else {
            return res.status(200).send(dbRes);
        }
    });
});

//    app.delete('/shelters/:id', function (req, res) {
//        var id = req.params.id;
//
//        if (isEmpty(id)) {
//            return res.status(501).send('id path parameter is mandatory');
//        }

//       connection.query('DELETE FROM shelters WHERE id = ' + id, function (err, dbRes) {
//            if (err) {
//                return res.status(err.errCode).send(err.message);
//            } else {
//                return res.status(200).send(dbRes);
//            }
//        });
//DELETE FROM shelters WHERE id = ?;"
//    });
//};
//
module.exports = router;
