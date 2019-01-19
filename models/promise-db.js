var mysql = require('sync-mysql');
var pool = new mysql({
    host: 'localhost',
    user: 'ialert',
    password: '1234567',
    database: 'iAlert'
  });
module.exports = pool;