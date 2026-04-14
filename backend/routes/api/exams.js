const express = require("express");
const pool = require("../../services/db");
const { hasPermissions } = require("../../utils");
const parsePaperRouter = require("./exams/parse_paper");
const questionsRouter = require("./exams/questions");
const paperRouter = require("./exams/paper");

const router = express.Router();

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
  const permission = await hasPermissions(
    req.headers.authorization,
    "super_admin",
  );

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

module.exports = router;
