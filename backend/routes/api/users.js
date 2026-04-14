const express = require("express");
const bcrypt = require("bcrypt");
const pool = require("../../services/db");
const config = require("../../config");
const { hasPermissions } = require("../../utils");

const router = express.Router();

router.post("/", async function (req, res, _) {
  const permission = await hasPermissions(req.headers.authorization, [
    "super_admin",
    "admin",
  ]);

  if (!permission.success) {
    return res.status(permission.status).send(permission);
  }

  const { username, password, role, assigned_exam_id } = req.body;

  if (
    typeof username !== "string" ||
    username.trim() === "" ||
    typeof password !== "string" ||
    password.trim() === ""
  ) {
    return res.status(400).send({
      status: 400,
      success: false,
      message: "Invalid username or password.",
    });
  }

  const validUsername = username.trim();
  if (username.includes(" ")) {
    return res.status(400).send({
      status: 400,
      success: false,
      message: "Spaces are not allowed in username.",
    });
  }

  // TODO: Add checks for password security

  if (typeof role !== "string" || (role !== "student" && role !== "admin")) {
    return res.status(400).send({
      status: 400,
      success: false,
      message: "Invalid role. Valid roles are `student` and `admin`.",
    });
  }

  if (role === "admin" && assigned_exam_id !== null) {
    return res.status(400).send({
      status: 400,
      success: false,
      message: "`assigned_exam_id` is only required for `student` role.",
    });
  }

  try {
    const passwordHash = await bcrypt.hash(password, config.salt_rounds);

    const [existing] = await pool.query(
      "SELECT 1 FROM users WHERE username = ? LIMIT 1;",
      [validUsername],
    );
    if (existing.length > 0) {
      return res.status(409).send({
        status: 409,
        success: false,
        message: "Username already exists.",
      });
    }

    await pool.query(
      "INSERT INTO users (username, password_hash, role, assigned_exam_id) VALUES (?, ?, ?, ?);",
      [validUsername, passwordHash, role, assigned_exam_id],
    );

    return res.status(201).send({
      status: 201,
      success: true,
    });
  } catch (err) {
    return res.status(500).send({
      status: 500,
      success: false,
      message: err.message,
    });
  }
});

module.exports = router;
