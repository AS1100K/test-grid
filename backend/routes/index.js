const express = require("express");
const pool = require("../services/db");

var router = express.Router();

/* GET home page. */
router.get("/", function (req, res, next) {
  res.send("Hello World!");
});

module.exports = router;
