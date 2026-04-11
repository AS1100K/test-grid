const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../../services/db");

var router = express.Router();

router.post("/login", async function (req, res, _) {
  var body = req.body;

  if (typeof body.username != "string" && typeof body.password != "string") {
    return res.status(401).send({
      status: 401,
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
      role: users.role,
      assigned_exam_id: body.assigned_exam_id,
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
      },
    });
  }

  return res.status(401).send({
    status: 401,
    success: false,
    message: "Either the username or password is incorrect.",
  });
});

module.exports = router;
