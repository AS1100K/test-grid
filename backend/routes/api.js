const express = require("express");
const authRouter = require("./api/auth");
const examsRouter = require("./api/exams");
const usersRouter = require("./api/users");

const router = express.Router();

router.use("/auth", authRouter);
router.use("/exams", examsRouter);
router.use("/users", usersRouter);

module.exports = router;
