const { parseQuestionPaper } = require("../routes/api/exams");
const fs = require("fs");

test("Question Paper Parsing", async () => {
  const buffer = fs.readFileSync("./tests/sample_question_paper.docx");
  const response = await parseQuestionPaper(buffer);
  const expected = {
    status: 200,
    success: true,
    data: [
      {
        name: "Physics",
        instructions:
          "This is a very long instruction This is a very long instruction This is a very long instruction This is a very long instruction This is a very long instruction This is a very long instructionThis is a very long instruction This is a very long instruction This is a very long instruction This is a very long instruction This is a very long instruction This is a very long instruction",
        questions: [
          {
            question: "This is the first question?",
            options: [
              "First Option",
              "Second Option",
              "Thrid Option",
              "Fourth Option",
            ],
            answer: "C",
            marks: 4,
          },
          {
            question: "What is 3+3?",
            options: ["5", "6", "7", "8"],
            answer: "B",
            marks: 4,
          },
        ],
      },
      {
        name: "Maths",
        instructions: "",
        questions: [
          {
            question: "This is the third question?",
            options: [
              "First Option",
              "Second Option",
              "Thrid Option",
              "Fourth Option",
            ],
            answer: "D",
            marks: 5,
          },
        ],
      },
    ],
  };

  expect(response).toStrictEqual(expected);
});
