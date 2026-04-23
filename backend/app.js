const express = require("express");
const fs = require("fs");
const path = require("path");
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

app.use("/api", apiRouter);

const frontendBuildPath = path.resolve("public");
const frontendEntryPath = path.join(frontendBuildPath, "index.html");

if (fs.existsSync(frontendEntryPath)) {
  app.use(express.static(frontendBuildPath));
  app.get(/^(?!\/api(?:\/|$)).*/, function (_, res) {
    res.sendFile(frontendEntryPath);
  });
}

module.exports = app;
