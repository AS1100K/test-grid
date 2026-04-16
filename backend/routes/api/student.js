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

router.post("/save_response", async function (req, res, _) {
  const permission = await hasPermissions(req.headers.authorization, "student");
  if (!permission.status) {
    return res.status(permission.status).send(permission);
  }

  const [session] = await pool.query(
    "SELECT ts.id, ts.status, ts.start_time, e.duration FROM test_sessions ts LEFT JOIN exams e ON ts.exam_id = e.id WHERE ts.student_username=? AND ts.exam_id=?;",
    [permission.data.username, permission.data.assigned_exam_id],
  );

  if (session.length === 0) {
    return res.status(401).send({
      status: 401,
      success: false,
      message: "Invalid Test Session.",
    });
  }

  const test_session = session[0];

  if (test_session.status !== "in_progress") {
    return res.status(401).send({
      status: 401,
      success: false,
      message: "The exam is " + test_session.status,
    });
  }

  const now = new Date();
  const start_time = new Date(test_session.start_time);
  const elapsedMinutes = (now.getTime() - start_time.getTime()) / 60_000;

  if (elapsedMinutes >= test_session.duration) {
    await pool.query("UPDATE test_sessions SET status=? WHERE id=?", [
      "submitted",
      test_session.id,
    ]);

    return res.status(401).send({
      status: 401,
      success: false,
      message: "The exam is over.",
    });
  }

  const { question_id, selected_option } = req.body;

  try {
    if (selected_option === null) {
      await pool.query(
        "DELETE FROM student_response WHERE question_id=? AND test_session_id=?",
        [question_id, test_session.id],
      );

      return res.status(200).send({
        status: 200,
        success: true,
      });
    }

    await pool.query(
      "INSERT INTO student_response (question_id, test_session_id, selected_option) VALUES (?, ?, ?) \
        ON DUPLICATE KEY UPDATE \
        selected_option = VALUES(selected_option), \
        saved_at = CURRENT_TIMESTAMP",
      [question_id, test_session.id, selected_option],
    );

    return res.status(200).send({
      status: 200,
      success: true,
    });
  } catch (err) {
    return res.status(500).send({
      status: 500,
      success: false,
      message: err.message || JSON.stringify(err),
    });
  }
});

router.post("/submit", async function (req, res, _) {
  const permission = await hasPermissions(req.headers.authorization, "student");
  if (!permission.status) {
    return res.status(permission.status).send(permission);
  }

  const [sessions] = await pool.query(
    "UPDATE test_sessions SET status=? WHERE student_username=? AND exam_id=?;",
    ["submitted", permission.data.username, permission.data.assigned_exam_id],
  );

  if (sessions.affectedRows !== 0) {
    return res.status(200).send({
      status: 200,
      success: true,
    });
  } else {
    return res.status(400).send({
      status: 400,
      success: false,
      message: "Invalid Exam Session",
    });
  }
});

module.exports = router;
