var mysql = require('mysql');

var pool = mysql.createPool({
    host: "3.121.116.91",
    user: "ialert",
    password: "1234567",
    database: 'iAlert'
});

module.exports = pool;

