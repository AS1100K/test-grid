const { isSessionExpired } = require("../services/sessionGrading");

describe("session grading helpers", () => {
  test("returns false for invalid duration", () => {
    expect(isSessionExpired(new Date().toISOString(), null)).toBe(false);
    expect(isSessionExpired(new Date().toISOString(), "30")).toBe(false);
  });

  test("returns true when elapsed time exceeds exam duration", () => {
    const thirtyOneMinutesAgo = new Date(Date.now() - 31 * 60 * 1000);
    expect(isSessionExpired(thirtyOneMinutesAgo.toISOString(), 30)).toBe(true);
  });

  test("returns false when session is still active", () => {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    expect(isSessionExpired(tenMinutesAgo.toISOString(), 30)).toBe(false);
  });
});
