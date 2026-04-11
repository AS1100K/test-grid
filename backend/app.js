const express = require("express");
const cookieParser = require("cookie-parser");
const logger = require("morgan");

const apiRouter = require("./routes/api");

var app = express();

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// var path = require("path");
// app.use(express.static(path.join(__dirname, "public")));

app.use("/api", apiRouter);

module.exports = app;
