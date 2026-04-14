const express = require("express");
const pool = require("../../../services/db");
const officeParser = require("officeparser");
const { hasPermissions } = require("../../../utils");

const router = express.Router();

router.post("/", async function (req, res, _) {
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
    if (!questions.success) {
      return res.status(questions.status).send(questions);
    }

    const validatedQuestions = validateParsedQuestionPaper(questions.data);
    return res.status(validatedQuestions.status).send(validatedQuestions);
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
        question_text: text.replace(/^Q\d+\.\s*/, ""),
        options: [],
        correct_option: null,
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
        currentQuestion.correct_option = text
          .replace("ANSWER:", "")
          .trim()
          .toLowerCase();
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

function validateParsedQuestionPaper(sections) {
  const validated = [];

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];

    if (typeof section.name !== "string" || section.name === "") {
      return {
        status: 400,
        success: false,
        message: "The section name can't be empty for section " + i,
      };
    }

    if (section.questions.length === 0) {
      return {
        status: 400,
        success: false,
        message: `The section ${i + 1}: ${section.name} can't be empty i.e. have no questions.`,
      };
    }

    const currentSection = {
      name: section.name,
      instructions: section.instructions === "" ? null : section.instructions,
      questions: [],
    };

    for (let j = 0; j < section.questions.length; j++) {
      const question = section.questions[j];

      if (
        typeof question.question_text !== "string" ||
        question.question_text === ""
      ) {
        return {
          status: 400,
          success: false,
          message: `The question text can't be empty in Q ${j + 1} in Section ${i + 1}: ${section.name}`,
        };
      }

      if (
        typeof question.marks !== "number" ||
        !Number.isSafeInteger(question.marks)
      ) {
        return {
          status: 400,
          success: false,
          message: `The marks needs to be a valid integer in Q ${j + 1} in Section ${i + 1}: ${section.name}`,
        };
      }

      if (question.options.length !== 4) {
        return {
          status: 400,
          success: false,
          message: `The question Q ${j + 1} in Section ${i + 1}: ${section.name} must have exactly 4 options.`,
        };
      }

      if (
        typeof question.correct_option !== "string" ||
        !["a", "b", "c", "d"].includes(question.correct_option)
      ) {
        return {
          status: 400,
          success: false,
          message: `Invalid correct option (Valid values are: A, B, C, D) in question Q ${j + 1} in Section ${i + 1}: ${section.name}`,
        };
      }

      currentSection.questions.push({
        question_text: question.question_text,
        marks: question.marks,
        correct_option: question.correct_option,
        option_a: question.options[0],
        option_b: question.options[1],
        option_c: question.options[2],
        option_d: question.options[3],
      });
    }

    validated.push(currentSection);
  }

  return {
    status: 200,
    success: true,
    data: validated,
  };
}

module.exports = router;
module.exports.parseQuestionPaper = parseQuestionPaper;
module.exports.validateParsedQuestionPaper = validateParsedQuestionPaper;
