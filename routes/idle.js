var express = require('express');
var promise_db = require('../models/promise-db');
var queries = require('../queries/queries');
var router = express.Router();

router.post('/register', (req, res, next) => {
  var uniqueId = req.body['unique_id'];
  var prevUniqueId = req.body['prev_id'];
  if (uniqueId == undefined)
    res.send(400);
  var result = promise_db.query(queries.register_device, uniqueId);
  console.log(result);
  res.send(result);
});
module.exports = router;