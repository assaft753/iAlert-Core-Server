var mysql = require('mysql');

var pool = mysql.createPool({
    host: "localhost",
    user: "ialert",
    password: "1234567",
    database: 'iAlert'
});

module.exports = pool;

