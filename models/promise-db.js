var mysql = require('sync-mysql');
var pool = new mysql({
    host: 'localhost',
    user: 'root',
    password: 'ialert',
    database: 'iAlert'
  });
module.exports = pool;