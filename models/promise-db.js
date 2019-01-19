var mysql = require('sync-mysql');
var pool = new mysql({
    host: '3.121.116.91',
    user: 'ialert',
    password: '1234567',
    database: 'iAlert'
  });
module.exports = pool;