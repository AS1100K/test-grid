const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../../services/db");
const { verifyAccessToken } = require("../../utils");

const router = express.Router();

router.post("/login", async function (req, res, _) {
  const body = req.body;

  if (typeof body.username !== "string" || typeof body.password !== "string") {
    return res.status(400).send({
      status: 400,
      success: false,
      message: "Both username and password field are required.",
    });
  }

  const [users] = await pool.query(
    "SELECT password_hash, role, assigned_exam_id FROM users WHERE username=?",
    [body.username],
  );

  if (users.length !== 1) {
    return res.status(400).send({
      status: 400,
      success: false,
      message: "Either username or password is incorrect.",
    });
  }

  const user = users[0];
  const valid_password = await bcrypt.compare(
    body.password,
    user.password_hash,
  );

  if (valid_password) {
    const paylaod = {
      username: body.username,
      role: user.role,
      assigned_exam_id: user.assigned_exam_id,
    };

    const token = jwt.sign(paylaod, globalThis.process.env.JWT_SECRET, {
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
  const token = req.body.token;
  const result = await verifyAccessToken(token);

  return res.status(result.status).send(result);
});

module.exports = router;
