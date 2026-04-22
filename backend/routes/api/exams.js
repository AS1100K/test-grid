const express = require("express");
const pool = require("../../services/db");
const { hasPermissions } = require("../../utils");
const parsePaperRouter = require("./exams/parse_paper");
const questionsRouter = require("./exams/questions");
const paperRouter = require("./exams/paper");
const ExcelJS = require("exceljs");
const {
  getExamResults,
} = require("../../services/results");

const router = express.Router();

function sortResults(rows, sortBy, sortOrder) {
  const keyMap = {
    username: "student_username",
    marks: "total_marks",
    percentage: "percentage",
    percentile: "percentile",
    status: "status",
  };

  const key = keyMap[sortBy] || "total_marks";
  const direction = sortOrder === "asc" ? 1 : -1;

  return [...rows].sort((a, b) => {
    const aValue = a[key];
    const bValue = b[key];

    // Always push missing values to the bottom for readability
    if (aValue == null && bValue != null) return 1;
    if (aValue != null && bValue == null) return -1;
    if (aValue == null && bValue == null) return 0;

    if (typeof aValue === "string" || typeof bValue === "string") {
      return aValue.localeCompare(bValue) * direction;
    }

    return (aValue - bValue) * direction;
  });
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

router.get("/:exam_id/results", async function (req, res, _) {
  const permission = await hasPermissions(
    req.headers.authorization,
    "super_admin",
  );

  if (!permission.success) {
    return res.status(permission.status).send(permission);
  }

  const examId = Number(req.params.exam_id);
  if (!Number.isInteger(examId)) {
    return res.status(400).send({
      status: 400,
      success: false,
      message: "Invalid exam id.",
    });
  }

  try {
    const aggregated = await getExamResults(examId);

    if (!aggregated) {
      return res.status(404).send({
        status: 404,
        success: false,
        message: "Exam not found.",
      });
    }

    const sortBy = req.query.sort_by;
    const sortOrder = req.query.order === "asc" ? "asc" : "desc";
    const sorted = sortResults(aggregated.results, sortBy, sortOrder);

    return res.status(200).send({
      status: 200,
      success: true,
      data: {
        exam: aggregated.exam,
        total_possible_marks: aggregated.total_possible_marks,
        highest_marks: aggregated.highest_marks,
        results: sorted,
      },
    });
  } catch (err) {
    return res.status(500).send({
      status: 500,
      success: false,
      message: err.message,
    });
  }
});

router.get(
  "/:exam_id/results/:session_id/responses",
  async function (req, res, _) {
    const permission = await hasPermissions(
      req.headers.authorization,
      "super_admin",
    );

    if (!permission.success) {
      return res.status(permission.status).send(permission);
    }

    const examId = Number(req.params.exam_id);
    const sessionId = Number(req.params.session_id);

    if (!Number.isInteger(examId) || !Number.isInteger(sessionId)) {
      return res.status(400).send({
        status: 400,
        success: false,
        message: "Invalid exam or session id.",
      });
    }

    try {
      const aggregated = await getExamResults(examId);
      if (!aggregated) {
        return res.status(404).send({
          status: 404,
          success: false,
          message: "Exam not found.",
        });
      }

      const sessionResult = aggregated.results.find(
        (r) => r.id === sessionId,
      );

      if (!sessionResult) {
        return res.status(404).send({
          status: 404,
          success: false,
          message: "Session not found for this exam.",
        });
      }

      if (sessionResult.status !== "submitted") {
        return res.status(400).send({
          status: 400,
          success: false,
          message: "Responses are only available for submitted sessions.",
        });
      }

      const [responses] = await pool.query(
        "SELECT \
            q.id AS question_id, \
            q.question_text, \
            q.option_a, \
            q.option_b, \
            q.option_c, \
            q.option_d, \
            q.correct_option, \
            q.marks, \
            sr.selected_option, \
            sr.saved_at, \
            s.name AS section_name, \
            s.section_order, \
            q.question_order \
          FROM student_response sr \
          INNER JOIN questions q ON sr.question_id = q.id \
          INNER JOIN sections s ON q.section_id = s.id \
          WHERE sr.test_session_id=? \
          ORDER BY s.section_order ASC, q.question_order ASC",
        [sessionId],
      );

      const formatted = responses.map((response) => ({
        question_id: response.question_id,
        question_text: response.question_text,
        option_a: response.option_a,
        option_b: response.option_b,
        option_c: response.option_c,
        option_d: response.option_d,
        correct_option: response.correct_option,
        selected_option: response.selected_option,
        marks: response.marks,
        section_name: response.section_name,
        question_order: response.question_order,
        section_order: response.section_order,
        awarded_marks:
          response.selected_option === response.correct_option
            ? response.marks
            : 0,
        saved_at: response.saved_at,
      }));

      return res.status(200).send({
        status: 200,
        success: true,
        data: {
          exam: aggregated.exam,
          total_possible_marks: aggregated.total_possible_marks,
          highest_marks: aggregated.highest_marks,
          session: sessionResult,
          responses: formatted,
        },
      });
    } catch (err) {
      return res.status(500).send({
        status: 500,
        success: false,
        message: err.message,
      });
    }
  },
);

router.get("/:exam_id/results/export", async function (req, res, _) {
  const permission = await hasPermissions(
    req.headers.authorization,
    "super_admin",
  );

  if (!permission.success) {
    return res.status(permission.status).send(permission);
  }

  const examId = Number(req.params.exam_id);
  if (!Number.isInteger(examId)) {
    return res.status(400).send({
      status: 400,
      success: false,
      message: "Invalid exam id.",
    });
  }

  const type = req.query.type === "full" ? "full" : "summary";
  const sortBy = req.query.sort_by;
  const sortOrder = req.query.order === "asc" ? "asc" : "desc";

  try {
    const aggregated = await getExamResults(examId);

    if (!aggregated) {
      return res.status(404).send({
        status: 404,
        success: false,
        message: "Exam not found.",
      });
    }

    const results = sortResults(aggregated.results, sortBy, sortOrder);
    const workbook = new ExcelJS.Workbook();
    const summarySheet = workbook.addWorksheet("Summary");

    summarySheet.columns = [
      { header: "Student Username", key: "student_username", width: 25 },
      { header: "Status", key: "status", width: 14 },
      { header: "Marks", key: "total_marks", width: 12 },
      { header: "Percentage", key: "percentage", width: 14 },
      { header: "Percentile", key: "percentile", width: 14 },
      { header: "Session ID", key: "session_id", width: 14 },
    ];

    results.forEach((row) => {
      summarySheet.addRow({
        student_username: row.student_username,
        status: row.status,
        total_marks: row.total_marks,
        percentage: row.percentage,
        percentile: row.percentile,
        session_id: row.id,
      });
    });

    if (type === "full") {
      const responsesSheet = workbook.addWorksheet("Responses");
      responsesSheet.columns = [
        { header: "Student Username", key: "student_username", width: 25 },
        { header: "Session ID", key: "session_id", width: 14 },
        { header: "Section", key: "section_name", width: 16 },
        { header: "Question Order", key: "question_order", width: 14 },
        { header: "Question ID", key: "question_id", width: 14 },
        { header: "Question", key: "question_text", width: 50 },
        { header: "Selected Option", key: "selected_option", width: 16 },
        { header: "Correct Option", key: "correct_option", width: 16 },
        { header: "Marks Awarded", key: "awarded_marks", width: 14 },
        { header: "Question Marks", key: "question_marks", width: 14 },
        { header: "Saved At", key: "saved_at", width: 24 },
      ];

      const [responses] = await pool.query(
        "SELECT \
            ts.id AS test_session_id, \
            ts.student_username, \
            sr.selected_option, \
            sr.saved_at, \
            q.id AS question_id, \
            q.question_text, \
            q.correct_option, \
            q.marks, \
            s.name AS section_name, \
            s.section_order, \
            q.question_order \
          FROM student_response sr \
          INNER JOIN test_sessions ts ON sr.test_session_id = ts.id \
          INNER JOIN questions q ON sr.question_id = q.id \
          INNER JOIN sections s ON q.section_id = s.id \
          WHERE ts.exam_id = ? AND ts.status = 'submitted' \
          ORDER BY ts.id ASC, s.section_order ASC, q.question_order ASC",
        [examId],
      );

      responses.forEach((row) => {
        responsesSheet.addRow({
          student_username: row.student_username,
          session_id: row.test_session_id,
          section_name: row.section_name,
          question_order: row.question_order,
          question_id: row.question_id,
          question_text: row.question_text,
          selected_option: row.selected_option,
          correct_option: row.correct_option,
          awarded_marks:
            row.selected_option === row.correct_option ? row.marks : 0,
          question_marks: row.marks,
          saved_at: row.saved_at,
        });
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=exam-${examId}-${type === "full" ? "responses" : "summary"}.xlsx`,
    );

    return res.send(buffer);
  } catch (err) {
    return res.status(500).send({
      status: 500,
      success: false,
      message: err.message,
    });
  }
});

module.exports = router;
