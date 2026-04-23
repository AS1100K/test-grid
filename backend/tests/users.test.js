const { parseCsv, normalizeDob } = require("../routes/api/users");

describe("users helpers", () => {
  test("parseCsv supports quoted commas and escaped quotes", () => {
    const rows = parseCsv('name,notes\n"Alice","hello, world"\n"Bob","He said ""Hi"""');
    expect(rows).toEqual([
      ["name", "notes"],
      ["Alice", "hello, world"],
      ["Bob", 'He said "Hi"'],
    ]);
  });

  test("normalizeDob returns yyyy-mm-dd values", () => {
    expect(normalizeDob("2000-10-20")).toBe("2000-10-20");
    expect(normalizeDob("20 Oct 2000")).toBe("2000-10-20");
    expect(normalizeDob("invalid")).toBeNull();
  });
});
