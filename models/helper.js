exports.isEmpty = function (value) {
    return (
        value === '' ||
        value === null ||
        value === undefined ||
        (Array.isArray(value) && value.length === 0) ||
        (typeof value === 'object' && !(value instanceof Map) && Object.keys(value).length === 0) ||
        (value instanceof Map && value.size === 0)
    );
}

exports.degreeToXY = function (lat, lon) {
    var rMajor = 6378137; //Equatorial Radius, WGS84
    var shift = Math.PI * rMajor;
    var x = lon * shift / 180;
    var y = Math.log(Math.tan((90 + lat) * Math.PI / 360)) / (Math.PI / 180);
    y = y * shift / 180;

    return { 'x': x, 'y': y };
}
