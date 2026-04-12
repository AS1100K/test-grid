const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../../services/db");

var router = express.Router();

router.post("/login", async function (req, res, _) {
  var body = req.body;

  if (typeof body.username != "string" || typeof body.password != "string") {
    return res.status(400).send({
      status: 400,
      success: false,
      message: "Both username and password field are required.",
    });
  }

  var [users, _] = await pool.query(
    "SELECT password_hash, role, assigned_exam_id FROM users WHERE username=?",
    [body.username],
  );

  if (users.length > 1) {
    return res.status(500).send({
      status: 500,
      success: false,
      message:
        "Unexpected Internal Server Error. Found multiple entries of same username.",
    });
  }

  var user = users[0];
  var valid_password = await bcrypt.compare(body.password, user.password_hash);

  if (valid_password) {
    var paylaod = {
      username: body.username,
      role: user.role,
      assigned_exam_id: user.assigned_exam_id,
    };

    var token = jwt.sign(paylaod, process.env.JWT_SECRET, {
      // TODO: Role based expiration
      // - super_admin: 1d
      // - admin: 1d
      // - student: exam_duration + 50% time
      expiresIn: "1d",
    });

    return res.status(201).send({
      status: 201,
      success: true,
      data: {
        token,
        username: body.username,
        role: user.role,
        assigned_exam_id: user.assigned_exam_id,
      },
    });
  }

  return res.status(401).send({
    status: 401,
    success: false,
    message: "Either the username or password is incorrect.",
  });
});

router.post("/verify", async function (req, res, _) {
  var token = req.body.token;
  if (typeof token != "string") {
    return res.status(400).send({
      status: 400,
      success: false,
      message: "The Access Token is required in the body.",
    });
  }

  try {
    var decoded = jwt.verify(token, process.env.JWT_SECRET, { complete: true });
    var payload = decoded.payload;

    if (
      typeof payload.username != "string" ||
      typeof payload.role != "string"
    ) {
      return res.status(401).send({
        status: 401,
        success: false,
        message: "Invalid Access Token Payload.",
      });
    }

    var [result, _] = await pool.query(
      "SELECT role, assigned_exam_id from users WHERE username=?",
      [payload.username],
    );

    if (result.length > 1) {
      return res.status(500).send({
        status: 500,
        success: false,
        message:
          "Internal Server Error. Found multiple entries of same username.",
      });
    }

    var user = result[0];
    if (
      (user.role === payload.role,
      user.assigned_exam_id === payload.assigned_exam_id)
    ) {
      return res.status(201).send({
        status: 201,
        success: true,
        data: {
          username: payload.username,
          role: payload.role,
          assigned_exam_id: payload.assigned_exam_id,
        },
      });
    }

    return res.status(401).send({
      status: 401,
      success: false,
      message: "Invalid Access Token.",
    });
  } catch (error) {
    return res.status(401).send({
      status: 401,
      success: false,
      message: `Invalid Access Token. ${error.message}`,
    });
  }
});

module.exports = router;
