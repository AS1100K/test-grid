const express = require("express");
const authRouter = require("./api/auth");

var router = express.Router();

router.use("/auth", authRouter);

module.exports = router;
