const express = require("express");
const pool = require("../../../services/db");
const { hasPermissions } = require("../../../utils");

const router = express.Router();

router.get("/:exam_id", async function (req, res, _) {
  const permission = await hasPermissions(
    req.headers.authorization,
    "super_admin",
  );

  if (!permission.success) {
    return res.status(permission.status).send(permission);
  }

  const exam_id = parseInt(req.params.exam_id);
  if (typeof exam_id !== "number" || Number.isNaN(exam_id)) {
    return res.status(400).send({
      status: 400,
      success: false,
      message: "Invalid Exam ID.",
    });
  }

  try {
    const [exams] = await pool.query(
      "SELECT title, description, is_active, duration from exams WHERE id=?",
      [exam_id],
    );

    if (exams.length !== 1) {
      return res.status(404).send({
        status: 404,
        success: false,
        message: "Invalid Exam ID.",
      });
    }

    const [sections] = await pool.query(
      "SELECT id, name, instructions FROM sections WHERE exam_id=? ORDER BY section_order ASC",
      [exam_id],
    );

    if (sections.length === 0) {
      return res.status(200).send({
        status: 200,
        success: true,
        data: {
          title: exams[0].title,
          description: exams[0].description,
          is_active: exams[0].is_active,
          duration: exams[0].duration,
          sections: [],
        },
      });
    }

    const paper = [];

    for (const section of sections) {
      const [questions] = await pool.query(
        "SELECT question_text, marks, option_a, option_b, option_c, option_d, correct_option FROM questions WHERE section_id=? ORDER BY question_order ASC;",
        [section.id],
      );

      const paper_section = {
        name: section.name,
        instructions: section.instructions,
        questions,
      };

      paper.push(paper_section);
    }

    return res.status(200).send({
      status: 200,
      success: true,
      data: {
        title: exams[0].title,
        description: exams[0].description,
        is_active: exams[0].is_active,
        duration: exams[0].duration,
        sections: paper,
      },
    });
  } catch (err) {
    return res.status(500).send({
      status: 500,
      success: false,
      message: `Internal Server Error: ${err.message}`,
    });
  }
});

module.exports = router;
