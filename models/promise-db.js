var mysql = require('sync-mysql');
var pool = new mysql({
    host: '127.0.0.1',
    user: 'ialert',
    password: '1234567',
    database: 'iAlert'
  });
module.exports = pool;