const { parseUsersList, normalizeDob } = require("../routes/api/users");
const fs = require("fs");

describe("users helpers", () => {
  test("parseCsv supports quoted commas and escaped quotes", async () => {
    const buffer = fs.readFileSync("./tests/sample_students_list.xlsx");
    const users = await parseUsersList(buffer);

    expect(users).toEqual([
      {
        assigned_exam_id: 1,
        dob: "2006-12-09",
        email_id: "abc@gmail.com",
        name: "Aditya Kumar",
        phone_number: "1234567890",
        roll_number: 1,
      },
      {
        assigned_exam_id: 1,
        dob: "1983-12-09",
        email_id: "abc@gmail.com",
        name: "ABC 2",
        phone_number: "1234567890",
        roll_number: 2,
      },
    ]);
  });

  test("normalizeDob returns yyyy-mm-dd values", () => {
    expect(normalizeDob("20-10-2000")).toBe("2000-10-20");
    expect(normalizeDob("38972.0")).toBe("2006-09-12");
    expect(normalizeDob("invalid")).toBeNull();
  });
});
