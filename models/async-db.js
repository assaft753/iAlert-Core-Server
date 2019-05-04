var mysql = require('mysql');

var pool = mysql.createPool({
    host: "localhost",
    user: "ialert",
    password: "1234567",
    database: 'iAlert'
});

// var pool = mysql.createPool({
//     host: "localhost",
//     user: "root",
//     password: "ialert",
//     database: 'iAlert'
// });

module.exports = pool;

