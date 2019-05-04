var queries = require('../queries/queries');
var connection = require('../models/async-db');

exports.isEmpty = function (value) {
    return (
        value === '' ||
        value === null ||
        value === undefined ||
        (Array.isArray(value) && value.length === 0) ||
        (typeof value === 'object' && !(value instanceof Map) && Object.keys(value).length === 0) ||
        (value instanceof Map && value.size === 0)
    );
};

exports.degreeToXY = function (lat, lon) {
    var rMajor = 6378137; //Equatorial Radius, WGS84
    var shift = Math.PI * rMajor;
    var x = lon * shift / 180;
    var y = Math.log(Math.tan((90 + lat) * Math.PI / 360)) / (Math.PI / 180);
    y = y * shift / 180;

    return { 'x': x, 'y': y };
};

exports.convertCityName = function (city) {
    var regex = new RegExp('[^a-zA-Z]', 'g');
    city = city.replace(regex, '');
    city = city.toLowerCase();
    return city;
};


exports.findAreaByCityName = function (cityName, cb) {
    connection.query(queries.select_all_areas, [], function (err, dbRes) {
        if (err) {
            return cb(500, err.message);
        } else if (isEmpty(dbRes)) {
            return cb(404, 'Could not create shelters. Error: Could not find any areas');
        } else {
            var cities = [];
            var foundArea = null;

            for (var i = 0; i < dbRes.length && isEmpty(foundArea); i++) {
                cities = dbRes[i].city.split(',');
                if (_.indexOf(cities, cityName) !== -1) {
                    foundArea = dbRes[i];
                }
            }

            return cb(null, null, foundArea);
        }
    });
};
