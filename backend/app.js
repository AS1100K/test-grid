const express = require("express");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
const cors = require("cors");
const fileUpload = require("express-fileupload");

const apiRouter = require("./routes/api");

const app = express();

app.use(cors());
app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(fileUpload());

// var path = require("path");
// app.use(express.static(path.join(__dirname, "public")));

app.use("/api", apiRouter);

module.exports = app;
