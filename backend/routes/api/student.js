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
    "SELECT is_active, duration FROM exams WHERE id=?",
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
    "SELECT id, status, start_time FROM test_sessions WHERE student_username=? AND exam_id=?",
    [permission.data.username, permission.data.assigned_exam_id],
  );

  let session_id;
  let session_status;
  let session_start_time;

  if (session.length === 0) {
    try {
      const [result] = await pool.query(
        "INSERT INTO test_sessions (student_username, exam_id) VALUES (?, ?);",
        [permission.data.username, permission.data.assigned_exam_id],
      );

      session_id = result.insertId;
      session_status = "in_progress";
      session_start_time = new Date().toISOString();
    } catch (err) {
      return res.status(500).send({
        status: 500,
        success: false,
        message: err.message,
      });
    }
  } else {
    session_id = session[0].id;
    session_status = session[0].status;
    session_start_time = session[0].start_time;
  }

  if (typeof examInfo[0].duration === "number") {
    try {
      const startTime = new Date(session[0].start_time);

      // Ensure the start time is valid
      if (!isNaN(startTime.getTime())) {
        const now = new Date();
        const elapsedMinutes = (now.getTime() - startTime.getTime()) / 60000;

        if (elapsedMinutes >= examInfo[0].duration) {
          if (session[0].status !== "completed") {
            await pool.query("UPDATE test_sessions SET status=? WHERE id=?", [
              "submitted",
              session[0].id,
            ]);

            // TODO: compute marks

            return res.status(200).send({
              status: 200,
              success: true,
              data: {
                session_id: session_id,
                status: "submitted",
                start_time: session_start_time,
              },
            });
          }
        }
      }
    } catch (err) {
      return res.status(500).send({
        status: 500,
        success: false,
        message: err.message,
      });
    }
  }

  const [sections] = await pool.query(
    "SELECT id, name, instructions FROM sections WHERE exam_id=? ORDER BY section_order ASC;",
    [permission.data.assigned_exam_id],
  );

  if (sections.length === 0) {
    return res.status(500).send({
      status: 500,
      success: false,
      message: "Invalid Exam. No sections found.",
    });
  }

  const res_sections = [];
  const query =
    "SELECT \
      q.id, \
      q.question_text, \
      q.marks, \
      q.option_a, \
      q.option_b, \
      q.option_c, \
      q.option_d, \
      sr.selected_option, \
      sr.saved_at, \
      CASE WHEN sr.selected_option IS NOT NULL THEN 'saved' ELSE 'not_attempted' END AS status \
  FROM questions q \
  LEFT JOIN student_response sr ON \
      q.id = sr.question_id AND sr.test_session_id = ? \
  WHERE \
      q.section_id = ? \
  ORDER BY \
      RAND();";

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];

    try {
      const [questions] = await pool.query(query, [session_id, section.id]);
      res_sections.push({
        ...section,
        questions,
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
    success: true,
    data: {
      session_id,
      status: session_status,
      start_time: session_start_time,
      data: res_sections,
    },
  });
});

module.exports = router;
