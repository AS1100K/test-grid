const express = require("express");
const authRouter = require("./api/auth");
const examsRouter = require("./api/exams");

const router = express.Router();

router.use("/auth", authRouter);
router.use("/exams", examsRouter);

module.exports = router;
