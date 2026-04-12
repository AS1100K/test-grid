const express = require("express");
const authRouter = require("./api/auth");
const examsRouter = require("./api/exams");

var router = express.Router();

router.use("/auth", authRouter);
router.use("/exams", examsRouter);

module.exports = router;
