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

module.exports = router;