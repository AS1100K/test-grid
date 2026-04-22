const pool = require("./db");

function isSessionExpired(startTime, durationMinutes) {
  if (!durationMinutes || typeof durationMinutes !== "number") {
    return false;
  }

  const start = new Date(startTime);
  if (Number.isNaN(start.getTime())) {
    return false;
  }

  const elapsedMinutes = (Date.now() - start.getTime()) / 60_000;
  return elapsedMinutes >= durationMinutes;
}

async function getExamTotalMarks(examId) {
  const [rows] = await pool.query(
    "SELECT COALESCE(SUM(COALESCE(q.marks, 0)), 0) AS total_exam_marks FROM sections s INNER JOIN questions q ON q.section_id = s.id WHERE s.exam_id=?;",
    [examId],
  );

  return Number(rows?.[0]?.total_exam_marks ?? 0);
}

async function gradeSessionById(sessionId) {
  const [sessions] = await pool.query(
    "SELECT id, exam_id, student_username FROM test_sessions WHERE id=? LIMIT 1;",
    [sessionId],
  );

  if (sessions.length !== 1) {
    throw new Error("Invalid test session.");
  }

  const session = sessions[0];

  const [scoreRows] = await pool.query(
    "SELECT COALESCE(SUM(CASE WHEN sr.selected_option = q.correct_option THEN COALESCE(q.marks, 0) ELSE 0 END), 0) AS total_marks FROM sections s INNER JOIN questions q ON q.section_id = s.id LEFT JOIN student_response sr ON sr.question_id = q.id AND sr.test_session_id = ? WHERE s.exam_id=?;",
    [session.id, session.exam_id],
  );

  const totalMarks = Number(scoreRows?.[0]?.total_marks ?? 0);
  await pool.query(
    "UPDATE test_sessions SET status=?, total_marks=? WHERE id=?;",
    ["submitted", totalMarks, session.id],
  );

  const totalExamMarks = await getExamTotalMarks(session.exam_id);
  const percentage =
    totalExamMarks > 0
      ? Number(((totalMarks * 100) / totalExamMarks).toFixed(2))
      : 0;

  return {
    session_id: session.id,
    exam_id: session.exam_id,
    student_username: session.student_username,
    marks: totalMarks,
    percentage,
  };
}

async function autoSubmitExpiredSession(session) {
  if (!session || session.status !== "in_progress") {
    return null;
  }

  if (!isSessionExpired(session.start_time, session.duration)) {
    return null;
  }

  return gradeSessionById(session.id);
}

module.exports = {
  autoSubmitExpiredSession,
  getExamTotalMarks,
  gradeSessionById,
  isSessionExpired,
};
