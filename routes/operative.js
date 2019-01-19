var express = require('express');
var router = express.Router();
var helper = require('../models/helper');
var async_db = require('../models/async-db');
var queries = require('../queries/queries');
var fbAdmin = require('../models/iAlert-firebase');

router.get('/', function (req, res, next) {
    res.send('respond with a resource');
});

router.get('/notify/:areacode', (req, res, next) => {
    var areacode = req.params.areacode;
    if (helper.isEmpty(areacode)) {
        res.sendStatus(400);
        return;
    }

    async_db.query(queries.insert_areas, [new Date(), areacode], (err, dbRes) => {
        console.log(err);
        console.log(dbRes);
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
            console.log(err);
            console.log(devices);
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

                fbAdmin.messaging().send(message)
                    .then((response) => {
                        console.log('Successfully sent message:', response);
                    })
                    .catch((error) => {
                        console.log('Error sending message:', error);
                    });
            });
        });
    });

});

module.exports = router;