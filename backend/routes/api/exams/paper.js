const express = require("express");
const pool = require("../../../services/db");
const { hasPermissions } = require("../../../utils");

const router = express.Router();

router.put("/:exam_id", async function (req, res, _) {
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

  if (!Array.isArray(req.body.sections) || req.body.sections.length === 0) {
    return res.status(400).send({
      status: 400,
      success: false,
      message: "There must be atleast one section in the paper.",
    });
  }

  const sections = req.body.sections;

  const [oldSections] = await pool.query(
    "SELECT id FROM sections WHERE exam_id=?",
    [exam_id],
  );

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    for (let i = 0; i < oldSections.length; i++) {
      await connection.query("DELETE FROM questions WHERE section_id=?", [
        oldSections[i].id,
      ]);

      await connection.query("DELETE FROM sections WHERE id=?", [
        oldSections[i].id,
      ]);
    }

    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];

      if (!Array.isArray(section.questions) || section.questions.length === 0) {
        await connection.rollback();
        return res.status(400).send({
          status: 400,
          success: false,
          message: `There must be atleast one question in section ${i + 1}.`,
        });
      }

      const [insertedSection] = await connection.query(
        "INSERT INTO sections (exam_id, name, instructions, section_order) VALUES (?, ?, ?, ?)",
        [exam_id, section.name, section.instructions, i],
      );
      const insertedId = insertedSection.insertId;

      for (let j = 0; j < section.questions.length; j++) {
        const question = section.questions[j];
        await connection.query(
          "INSERT INTO questions (section_id, question_order, question_text, marks, option_a, option_b, option_c, option_d, correct_option) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
          [
            insertedId,
            j,
            question.question_text,
            question.marks,
            question.option_a,
            question.option_b,
            question.option_c,
            question.option_d,
            question.correct_option,
          ],
        );
      }
    }

    await connection.commit();
  } catch (error) {
    connection.rollback();
    return res.status(500).send({
      status: 500,
      success: false,
      message: `Internal Server Error: ${error.message}`,
    });
  } finally {
    connection.release();
  }

  return res.status(200).send({
    status: 200,
    success: true,
  });
});

module.exports = router;
