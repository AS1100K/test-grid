jest.mock("../services/db", () => ({
  query: jest.fn(),
}));

const pool = require("../services/db");
const { reconcileExamSessions } = require("../services/sessionGrading");

describe("reconcileExamSessions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("grades submitted sessions with NULL marks and expired in-progress sessions", async () => {
    pool.query
      .mockResolvedValueOnce([
        [
          {
            id: 10,
            status: "submitted",
            total_marks: null,
            start_time: new Date().toISOString(),
            duration: 30,
          },
          {
            id: 11,
            status: "in_progress",
            total_marks: null,
            start_time: new Date(Date.now() - 31 * 60 * 1000).toISOString(),
            duration: 30,
          },
          {
            id: 12,
            status: "in_progress",
            total_marks: null,
            start_time: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
            duration: 30,
          },
        ],
      ])
      .mockResolvedValueOnce([[{ id: 10, exam_id: 1, student_username: "alice" }]])
      .mockResolvedValueOnce([[{ total_marks: 15 }]])
      .mockResolvedValueOnce([{}])
      .mockResolvedValueOnce([[{ total_exam_marks: 20 }]])
      .mockResolvedValueOnce([[{ id: 11, exam_id: 1, student_username: "bob" }]])
      .mockResolvedValueOnce([[{ total_marks: 10 }]])
      .mockResolvedValueOnce([{}])
      .mockResolvedValueOnce([[{ total_exam_marks: 20 }]]);

    const result = await reconcileExamSessions(1);
    expect(result).toEqual({ updated_sessions: 2 });
    expect(pool.query).toHaveBeenCalled();
  });
});
