const express = require("express");
const pool = require("../../services/db");
const officeParser = require("officeparser");
const { hasPermissions } = require("../../utils");

var router = express.Router();

router.post("/parse_paper", async function (req, res, _) {
  var permission = await hasPermissions(
    req.headers.authorization,
    "super_admin",
  );

  if (!permission.success) {
    return res.status(permission.status).send(permission);
  }

  console.log(req.body);
  var exam_id = req.body.exam_id;
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

  var [result, _] = await pool.query("SELECT is_active FROM exams WHERE id=?", [
    exam_id,
  ]);

  if (result.length !== 1) {
    return res.status(400).send({
      status: 400,
      success: false,
      message: "Invalid Exam ID.",
    });
  }

  if (result[0].is_active == true) {
    return res.status(403).send({
      status: 403,
      success: false,
      message: "Can't modify questions of a active exam.",
    });
  }

  if (req.files && Object.keys(req.files).length !== 0) {
    var question_paper = req.files.question_paper;
    if (question_paper == undefined) {
      return res.status(400).send({
        status: 400,
        success: false,
        message: "Missing `question_paper` field in form data as the file.",
      });
    }

    var questions = await parseQuestionPaper(question_paper.data);
    res.send(questions);
  }
});

async function parseQuestionPaper(file_data) {
  var ast = await officeParser.parseOffice(file_data);

  if (ast.type != "docx") {
    return {
      status: 400,
      success: false,
      message: "The question paper must be in a `.docx` file only.",
    };
  }

  var sections = [];

  var currentSection = null;
  var currentQuestion = null;

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
    var text = (node.text || "").trim();
    if (!text) continue;

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
