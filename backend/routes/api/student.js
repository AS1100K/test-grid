const express = require("express");
const pool = require("../../services/db");
const { hasPermissions } = require("../../utils");

const router = express.Router();

router.get("/exam_info", async function (req, res, _) {
  const permission = await hasPermissions(req.headers.authorization, "student");
  if (!permission.success) {
    return res.status(permission.status).send(permission);
  }

  if (!permission.data.assigned_exam_id) {
    return res.status(401).send({
      status: 401,
      success: false,
      message:
        "No exam assigned yet. Please ask the adminstrator to assign you an exam.",
    });
  }

  const [examInfo] = await pool.query(
    "SELECT title, description, is_active, duration FROM exams WHERE id=?",
    [permission.data.assigned_exam_id],
  );

  if (examInfo.length !== 1) {
    return res.status(404).send({
      status: 404,
      success: false,
      message: "The exam you are trying to access doesn't exists anymore.",
    });
  }

  if (!examInfo[0].is_active) {
    return res.status(401).send({
      status: 401,
      success: false,
      message: "The exam you are trying to attempt isn't active yet.",
    });
  }

  res.status(200).send({
    status: 200,
    success: true,
    data: examInfo[0],
  });
});

router.post("/start_exam", async function (req, res, _) {
  const permission = await hasPermissions(req.headers.authorization, "student");
  if (!permission.success) {
    return res.status(permission.status).send(permission);
  }

  if (!permission.data.assigned_exam_id) {
    return res.status(401).send({
      status: 401,
      success: false,
      message:
        "No exam assigned yet. Please ask the adminstrator to assign you an exam.",
    });
  }

  const [examInfo] = await pool.query(
    "SELECT is_active FROM exams WHERE id=?",
    [permission.data.assigned_exam_id],
  );

  if (examInfo.length !== 1) {
    return res.status(404).send({
      status: 404,
      success: false,
      message: "The exam you are trying to access doesn't exists anymore.",
    });
  }

  if (!examInfo[0].is_active) {
    return res.status(401).send({
      status: 401,
      success: false,
      message: "The exam you are trying to attempt isn't active yet.",
    });
  }

  const [session] = await pool.query(
    "SELECT id, status FROM test_sessions WHERE student_username=? AND exam_id=?",
    [permission.data.username, permission.data.assigned_exam_id],
  );

  if (session.length === 0) {
    try {
      const [result] = await pool.query(
        "INSERT INTO test_sessions (student_username, exam_id) VALUES (?, ?);",
        [permission.data.username, permission.data.assigned_exam_id],
      );

      const sessionId = result.insertId;

      return res.status(200).send({
        status: 200,
        success: false,
        data: {
          session_id: sessionId,
          status: "in_progress",
        },
      });
    } catch (err) {
      return res.status(500).send({
        status: 500,
        success: false,
        message: err.message,
      });
    }
  }

  return res.status(200).send({
    status: 200,
    success: false,
    data: {
      session_id: session[0].id,
      status: session[0].status,
    },
  });
});

module.exports = router;
