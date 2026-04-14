const { parseQuestionPaper } = require("../routes/api/exams/parse_paper");
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
            question_text: "This is the first question?",
            options: [
              "First Option",
              "Second Option",
              "Thrid Option",
              "Fourth Option",
            ],
            correct_option: "c",
            marks: 4,
          },
          {
            question_text: "What is 3+3?",
            options: ["5", "6", "7", "8"],
            correct_option: "b",
            marks: 4,
          },
        ],
      },
      {
        name: "Maths",
        instructions: "",
        questions: [
          {
            question_text: "This is the third question?",
            options: [
              "First Option",
              "Second Option",
              "Thrid Option",
              "Fourth Option",
            ],
            correct_option: "d",
            marks: 5,
          },
        ],
      },
    ],
  };

  expect(response).toStrictEqual(expected);
});
