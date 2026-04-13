const express = require("express");
const pool = require("../../services/db");
const officeParser = require("officeparser");
const { hasPermissions } = require("../../utils");

const router = express.Router();

router.post("/", async function (req, res, _) {
  const permission = await hasPermissions(
    req.headers.authorization,
    "super_admin",
  );

  if (!permission.success) {
    return res.status(permission.status).send(permission);
  }

  const { title } = req.body;
  let { description, duration } = req.body;

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

  try {
    const [result] = await pool.query(
      "INSERT INTO exams (title, description, duration) VALUES (?, ?, ?)",
      [cleanTitle, description, duration],
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

router.post("/parse_paper", async function (req, res, _) {
  const permission = await hasPermissions(
    req.headers.authorization,
    "super_admin",
  );

  if (!permission.success) {
    return res.status(permission.status).send(permission);
  }

  const exam_id = req.body.exam_id;
  if (
    exam_id == null ||
    (typeof exam_id !== "string" && typeof exam_id !== "number")
  ) {
    return res.status(400).send({
      status: 400,
      success: false,
      message: "exam_id is required.",
    });
  }

  const [result] = await pool.query("SELECT is_active FROM exams WHERE id=?", [
    exam_id,
  ]);

  if (result.length !== 1) {
    return res.status(400).send({
      status: 400,
      success: false,
      message: "Invalid Exam ID.",
    });
  }

  if (result[0].is_active === true) {
    return res.status(403).send({
      status: 403,
      success: false,
      message: "Can't modify questions of a active exam.",
    });
  }

  if (req.files && Object.keys(req.files).length !== 0) {
    const question_paper = req.files.question_paper;
    if (question_paper === undefined) {
      return res.status(400).send({
        status: 400,
        success: false,
        message: "Missing `question_paper` field in form data as the file.",
      });
    }

    const questions = await parseQuestionPaper(question_paper.data);
    res.send(questions);
  }
});

async function parseQuestionPaper(file_data) {
  const ast = await officeParser.parseOffice(file_data);

  if (ast.type !== "docx") {
    return {
      status: 400,
      success: false,
      message: "The question paper must be in a `.docx` file only.",
    };
  }

  const sections = [];

  let currentSection = null;
  let currentQuestion = null;

  const pushQuestion = () => {
    if (currentSection && currentQuestion) {
      currentSection.questions.push(currentQuestion);
      currentQuestion = null;
    }
  };

  const pushSection = () => {
    if (currentSection) {
      pushQuestion();
      sections.push(currentSection);
    }
  };

  for (const node of ast.content) {
    const text = (node.text || "").trim();
    if (!text) {
      continue;
    }

    // Section
    if (text.startsWith("SECTION:")) {
      pushSection();

      currentSection = {
        name: text.replace("SECTION:", "").trim(),
        instructions: "",
        questions: [],
      };
      continue;
    }

    // Instructions
    if (text.startsWith("INSTRUCTIONS:")) {
      if (currentSection) {
        currentSection.instructions = text.replace("INSTRUCTIONS:", "").trim();
      }
      continue;
    }

    // Questions
    if (/^Q\d+\./.test(text)) {
      pushQuestion();

      currentQuestion = {
        question: text.replace(/^Q\d+\.\s*/, ""),
        options: [],
        answer: null,
        marks: null,
      };

      continue;
    }

    // Options (List Based)
    if (node.type === "list") {
      if (currentQuestion) {
        currentQuestion.options.push(text);
      }
      continue;
    }

    // Options (A., B., C., D.)
    if (/^[A-D]\./.test(text)) {
      if (currentQuestion) {
        currentQuestion.options.push(text.slice(2).trim());
      }
      continue;
    }

    // Answer
    if (text.startsWith("ANSWER:")) {
      if (currentQuestion) {
        currentQuestion.answer = text.replace("ANSWER:", "").trim();
      }
      continue;
    }

    // Marks
    if (text.startsWith("MARKS:")) {
      if (currentQuestion) {
        currentQuestion.marks = parseInt(text.replace("MARKS:", "").trim(), 10);
      }
      continue;
    }
  }

  pushSection();
  return {
    status: 200,
    success: true,
    data: sections,
  };
}

module.exports = router;
module.exports.parseQuestionPaper = parseQuestionPaper;
