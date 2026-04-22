const express = require("express");
const pool = require("../../services/db");
const { hasPermissions } = require("../../utils");
const parsePaperRouter = require("./exams/parse_paper");
const questionsRouter = require("./exams/questions");
const paperRouter = require("./exams/paper");
const {
  getExamTotalMarks,
  reconcileExamSessions,
} = require("../../services/sessionGrading");

const router = express.Router();

const SORT_SQL_MAP = Object.freeze({
  student_username: "ts.student_username",
  marks: "ts.total_marks",
  percentage: "percentage",
  percentile: "ranks.percentile",
});

function sanitizeSort(sortBy, sortOrder) {
  const safeSortBy = Object.hasOwn(SORT_SQL_MAP, sortBy) ? sortBy : "marks";
  const safeSortOrder = String(sortOrder || "").toUpperCase() === "ASC" ? "ASC" : "DESC";
  return {
    safeSortBy,
    safeSortOrder,
  };
}

function toCsvSafeValue(value) {
  if (value == null) {
    return "";
  }

  const str = String(value);
  const trimmed = str.trimStart();
  const requiresEscaping =
    /^[=+\-@]/.test(trimmed) || str.startsWith("\t") || str.startsWith("\r");
  const safe = requiresEscaping ? `'${str}` : str;
  return `"${safe.replace(/"/g, '""')}"`;
}

function toCsv(headers, rows) {
  const headerLine = headers.map((h) => toCsvSafeValue(h.label)).join(",");
  const dataLines = rows.map((row) =>
    headers.map((h) => toCsvSafeValue(row[h.key])).join(","),
  );
  return [headerLine, ...dataLines].join("\n");
}

async function tryReconcileExam(res, examId) {
  try {
    await reconcileExamSessions(examId);
    return true;
  } catch (err) {
    res.status(500).send({
      status: 500,
      success: false,
      message: `Failed to reconcile exam sessions. ${err.message}`,
    });
    return false;
  }
}

router.use("/parse_paper", parsePaperRouter);
router.use("/questions", questionsRouter);
router.use("/paper", paperRouter);

router.put("/", async function (req, res, _) {
  const permission = await hasPermissions(
    req.headers.authorization,
    "super_admin",
  );

  if (!permission.success) {
    return res.status(permission.status).send(permission);
  }

  const { title, exam_id, is_active } = req.body;
  let { description, duration } = req.body;

  if (exam_id != null && typeof exam_id !== "number") {
    return res.status(400).send({
      status: 400,
      success: false,
      message: "`exam_id` must be a number if provided.",
    });
  }

  if (typeof title !== "string" || title.trim() === "") {
    return res.status(400).send({
      status: 400,
      success: false,
      message: "title is required and must be a non-empty string.",
    });
  }
  const cleanTitle = title.trim();

  if (description == null) {
    description = null;
  } else if (typeof description !== "string") {
    return res.status(400).send({
      status: 400,
      success: false,
      message: "description must be a string if provided.",
    });
  } else if (description.trim() === "") {
    description = null;
  } else {
    description = description.trim();
  }

  if (duration == null || duration === "") {
    duration = null;
  } else {
    // Allow numeric strings or numbers
    const num = Number(duration);
    if (!Number.isInteger(num) || num <= 0) {
      return res.status(400).send({
        status: 400,
        success: false,
        message:
          "duration must be a positive integer number of minutes or null.",
      });
    }
    duration = num;
  }

  if (is_active != null && typeof is_active !== "boolean") {
    return res.status(400).send({
      status: 400,
      success: false,
      message: "`is_active` must be a boolean if provided.",
    });
  }

  try {
    if (exam_id) {
      await pool.query(
        "UPDATE exams SET title=?, description=?, duration=?, is_active=? WHERE id=?",
        [cleanTitle, description, duration, is_active || false, exam_id],
      );

      return res.status(200).send({
        status: 200,
        success: true,
        data: { id: exam_id },
      });
    }
    const [result] = await pool.query(
      "INSERT INTO exams (title, description, duration, is_active) VALUES (?, ?, ?, ?)",
      [cleanTitle, description, duration, is_active || false],
    );

    return res.status(201).send({
      status: 201,
      success: true,
      data: { id: result.insertId },
    });
  } catch (err) {
    globalThis.console.error(err);
    return res.status(500).send({
      status: 500,
      success: false,
      message: `Failed to create exam. ${err.message}`,
    });
  }
});

router.get("/", async function (req, res, _) {
  const permission = await hasPermissions(req.headers.authorization, [
    "super_admin",
    "admin",
  ]);

  if (!permission.success) {
    return res.status(permission.status).send(permission);
  }

  const [result] = await pool.query("SELECT id, title, is_active from exams");
  return res.status(200).send({
    status: 200,
    success: true,
    data: result,
  });
});

router.get("/:exam_id/submissions", async function (req, res, _) {
  const permission = await hasPermissions(req.headers.authorization, "super_admin");
  if (!permission.success) {
    return res.status(permission.status).send(permission);
  }

  const examId = Number(req.params.exam_id);
  if (!Number.isInteger(examId) || examId <= 0) {
    return res.status(400).send({
      status: 400,
      success: false,
      message: "Invalid exam id.",
    });
  }

  const { safeSortBy, safeSortOrder } = sanitizeSort(
    req.query.sort_by,
    req.query.sort_order,
  );
  const sortExpr = SORT_SQL_MAP[safeSortBy];
  if (!(await tryReconcileExam(res, examId))) {
    return;
  }

  const [rows] = await pool.query(
    `SELECT
      ts.id AS session_id,
      ts.student_username,
      ts.status,
      ts.total_marks AS marks,
      CASE
        WHEN et.total_exam_marks > 0 AND ts.total_marks IS NOT NULL
          THEN ROUND((ts.total_marks * 100) / et.total_exam_marks, 2)
        ELSE NULL
      END AS percentage,
      ranks.percentile
    FROM test_sessions ts
    INNER JOIN (
      SELECT COALESCE(SUM(COALESCE(q.marks, 0)), 0) AS total_exam_marks
      FROM sections s
      INNER JOIN questions q ON q.section_id = s.id
      WHERE s.exam_id=?
    ) et
    LEFT JOIN (
      SELECT
        id,
        ROUND(PERCENT_RANK() OVER (ORDER BY total_marks) * 100, 2) AS percentile
      FROM test_sessions
      WHERE exam_id=? AND status='submitted' AND total_marks IS NOT NULL
    ) ranks ON ranks.id = ts.id
    WHERE ts.exam_id=?
    ORDER BY ${sortExpr} ${safeSortOrder}, ts.student_username ASC`,
    [examId, examId, examId],
  );

  const [highestRows] = await pool.query(
    "SELECT COALESCE(MAX(total_marks), 0) AS highest_marks FROM test_sessions WHERE exam_id=? AND status='submitted';",
    [examId],
  );

  return res.status(200).send({
    status: 200,
    success: true,
    data: {
      highest_marks: Number(highestRows?.[0]?.highest_marks ?? 0),
      rows,
    },
  });
});

router.get("/:exam_id/submissions/:student_username/responses", async function (req, res, _) {
  const permission = await hasPermissions(req.headers.authorization, "super_admin");
  if (!permission.success) {
    return res.status(permission.status).send(permission);
  }

  const examId = Number(req.params.exam_id);
  const studentUsername = req.params.student_username;

  if (!Number.isInteger(examId) || examId <= 0 || !studentUsername) {
    return res.status(400).send({
      status: 400,
      success: false,
      message: "Invalid request.",
    });
  }
  if (!(await tryReconcileExam(res, examId))) {
    return;
  }

  const [sessions] = await pool.query(
    "SELECT id, total_marks, status FROM test_sessions WHERE exam_id=? AND student_username=? LIMIT 1;",
    [examId, studentUsername],
  );

  if (sessions.length !== 1) {
    return res.status(404).send({
      status: 404,
      success: false,
      message: "Session not found.",
    });
  }

  const session = sessions[0];

  const [responses] = await pool.query(
    "SELECT s.section_order, s.name AS section_name, q.question_order, q.question_text, COALESCE(q.marks, 0) AS question_marks, q.correct_option, sr.selected_option, sr.saved_at, CASE WHEN sr.selected_option = q.correct_option THEN COALESCE(q.marks, 0) ELSE 0 END AS marks_awarded FROM sections s INNER JOIN questions q ON q.section_id = s.id LEFT JOIN student_response sr ON sr.question_id = q.id AND sr.test_session_id = ? WHERE s.exam_id=? ORDER BY s.section_order ASC, q.question_order ASC;",
    [session.id, examId],
  );

  const totalExamMarks = await getExamTotalMarks(examId);
  const percentage =
    totalExamMarks > 0
      ? Number((((session.total_marks ?? 0) * 100) / totalExamMarks).toFixed(2))
      : 0;

  return res.status(200).send({
    status: 200,
    success: true,
    data: {
      student_username: studentUsername,
      status: session.status,
      marks: session.total_marks,
      percentage,
      responses,
    },
  });
});

router.get("/:exam_id/submissions/export/summary", async function (req, res, _) {
  const permission = await hasPermissions(req.headers.authorization, "super_admin");
  if (!permission.success) {
    return res.status(permission.status).send(permission);
  }

  const examId = Number(req.params.exam_id);
  if (!Number.isInteger(examId) || examId <= 0) {
    return res.status(400).send({
      status: 400,
      success: false,
      message: "Invalid exam id.",
    });
  }
  if (!(await tryReconcileExam(res, examId))) {
    return;
  }

  const [rows] = await pool.query(
    "SELECT ts.student_username, ts.total_marks AS marks, CASE WHEN et.total_exam_marks > 0 AND ts.total_marks IS NOT NULL THEN ROUND((ts.total_marks * 100) / et.total_exam_marks, 2) ELSE NULL END AS percentage, ranks.percentile FROM test_sessions ts INNER JOIN (SELECT COALESCE(SUM(COALESCE(q.marks, 0)), 0) AS total_exam_marks FROM sections s INNER JOIN questions q ON q.section_id = s.id WHERE s.exam_id=?) et LEFT JOIN (SELECT id, ROUND(PERCENT_RANK() OVER (ORDER BY total_marks) * 100, 2) AS percentile FROM test_sessions WHERE exam_id=? AND status='submitted' AND total_marks IS NOT NULL) ranks ON ranks.id = ts.id WHERE ts.exam_id=? ORDER BY ts.student_username ASC;",
    [examId, examId, examId],
  );

  const csv = toCsv(
    [
      { key: "student_username", label: "student_username" },
      { key: "marks", label: "marks" },
      { key: "percentage", label: "percentage" },
      { key: "percentile", label: "percentile" },
    ],
    rows,
  );

  res.setHeader("Content-Type", "application/vnd.ms-excel; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="exam-${examId}-summary.xls"`,
  );
  return res.status(200).send(csv);
});

router.get("/:exam_id/submissions/export/full", async function (req, res, _) {
  const permission = await hasPermissions(req.headers.authorization, "super_admin");
  if (!permission.success) {
    return res.status(permission.status).send(permission);
  }

  const examId = Number(req.params.exam_id);
  if (!Number.isInteger(examId) || examId <= 0) {
    return res.status(400).send({
      status: 400,
      success: false,
      message: "Invalid exam id.",
    });
  }
  if (!(await tryReconcileExam(res, examId))) {
    return;
  }

  const [rows] = await pool.query(
    "SELECT ts.student_username, ts.status AS session_status, ts.total_marks AS marks, CASE WHEN et.total_exam_marks > 0 AND ts.total_marks IS NOT NULL THEN ROUND((ts.total_marks * 100) / et.total_exam_marks, 2) ELSE NULL END AS percentage, ranks.percentile, s.section_order, s.name AS section_name, q.question_order, q.question_text, q.correct_option, sr.selected_option, CASE WHEN sr.selected_option = q.correct_option THEN COALESCE(q.marks, 0) ELSE 0 END AS marks_awarded, sr.saved_at FROM test_sessions ts INNER JOIN sections s ON s.exam_id = ts.exam_id INNER JOIN questions q ON q.section_id = s.id LEFT JOIN student_response sr ON sr.question_id = q.id AND sr.test_session_id = ts.id INNER JOIN (SELECT COALESCE(SUM(COALESCE(q2.marks, 0)), 0) AS total_exam_marks FROM sections s2 INNER JOIN questions q2 ON q2.section_id = s2.id WHERE s2.exam_id=?) et LEFT JOIN (SELECT id, ROUND(PERCENT_RANK() OVER (ORDER BY total_marks) * 100, 2) AS percentile FROM test_sessions WHERE exam_id=? AND status='submitted' AND total_marks IS NOT NULL) ranks ON ranks.id = ts.id WHERE ts.exam_id=? ORDER BY ts.student_username ASC, s.section_order ASC, q.question_order ASC;",
    [examId, examId, examId],
  );

  const csv = toCsv(
    [
      { key: "student_username", label: "student_username" },
      { key: "session_status", label: "session_status" },
      { key: "marks", label: "marks" },
      { key: "percentage", label: "percentage" },
      { key: "percentile", label: "percentile" },
      { key: "section_order", label: "section_order" },
      { key: "section_name", label: "section_name" },
      { key: "question_order", label: "question_order" },
      { key: "question_text", label: "question_text" },
      { key: "correct_option", label: "correct_option" },
      { key: "selected_option", label: "selected_option" },
      { key: "marks_awarded", label: "marks_awarded" },
      { key: "saved_at", label: "saved_at" },
    ],
    rows,
  );

  res.setHeader("Content-Type", "application/vnd.ms-excel; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="exam-${examId}-full.xls"`,
  );
  return res.status(200).send(csv);
});

module.exports = router;
