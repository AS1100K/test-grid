const pool = require("./db");

async function getExamById(examId) {
  const [rows] = await pool.query(
    "SELECT id, title, description, duration, is_active FROM exams WHERE id=?",
    [examId],
  );

  if (rows.length === 0) {
    return null;
  }

  return rows[0];
}

async function getTotalExamMarks(examId) {
  const [rows] = await pool.query(
    "SELECT COALESCE(SUM(q.marks), 0) AS total_marks \
    FROM questions q \
    INNER JOIN sections s ON q.section_id = s.id \
    WHERE s.exam_id = ?",
    [examId],
  );

  const value = rows[0]?.total_marks;
  return typeof value === "number" ? value : 0;
}

async function computeSessionMarks(testSessionId) {
  const [rows] = await pool.query(
    "SELECT COALESCE(SUM(q.marks), 0) AS total_marks \
    FROM student_response sr \
    INNER JOIN questions q ON sr.question_id = q.id \
    WHERE sr.test_session_id = ? AND sr.selected_option = q.correct_option",
    [testSessionId],
  );

  const value = rows[0]?.total_marks;
  return typeof value === "number" ? value : 0;
}

async function finalizeSession(session, examDurationMinutes) {
  if (!session) return session;

  // If already submitted/terminated, make sure marks are available.
  if (session.status !== "in_progress") {
    if (session.total_marks == null) {
      const totalMarks = await computeSessionMarks(session.id);
      await pool.query(
        "UPDATE test_sessions SET total_marks=? WHERE id=?",
        [totalMarks, session.id],
      );
      return { ...session, total_marks: totalMarks };
    }

    return session;
  }

  const start = new Date(session.start_time);
  const hasDuration = typeof examDurationMinutes === "number";
  const isStartValid = !isNaN(start.getTime());
  const elapsedMinutes = hasDuration
    ? (Date.now() - start.getTime()) / 60_000
    : null;

  const isExpired =
    hasDuration && isStartValid && elapsedMinutes >= examDurationMinutes;

  if (isExpired) {
    const totalMarks = await computeSessionMarks(session.id);
    await pool.query(
      "UPDATE test_sessions SET status='submitted', total_marks=? WHERE id=?",
      [totalMarks, session.id],
    );

    return {
      ...session,
      status: "submitted",
      total_marks: totalMarks,
    };
  }

  return session;
}

async function finalizeSessionsForExam(examId, examDurationMinutes) {
  const [sessions] = await pool.query(
    "SELECT id, student_username, status, start_time, total_marks FROM test_sessions WHERE exam_id=?",
    [examId],
  );

  return Promise.all(
    sessions.map((session) => finalizeSession(session, examDurationMinutes)),
  );
}

async function getExamResults(examId) {
  const exam = await getExamById(examId);
  if (!exam) return null;

  const totalPossibleMarks = await getTotalExamMarks(examId);
  const sessions = await finalizeSessionsForExam(examId, exam.duration);

  const submittedSessions = sessions.filter(
    (session) => session.status === "submitted",
  );

  const sortedByMarks = [...submittedSessions].sort(
    (a, b) => (b.total_marks ?? 0) - (a.total_marks ?? 0),
  );

  const rankByMarks = new Map();
  sortedByMarks.forEach((session, idx) => {
    const marks = session.total_marks ?? 0;
    if (!rankByMarks.has(marks)) {
      rankByMarks.set(marks, idx + 1);
    }
  });

  const submittedCount = sortedByMarks.length;
  const highestMarks = sortedByMarks[0]?.total_marks ?? 0;

  const results = sessions.map((session) => {
    const marks = session.total_marks ?? null;
    const percentage =
      marks != null && totalPossibleMarks > 0
        ? Number(((marks / totalPossibleMarks) * 100).toFixed(2))
        : marks != null
          ? 0
          : null;

    let percentile = null;
    if (marks != null && submittedCount > 0) {
      if (submittedCount === 1) {
        percentile = 100;
      } else {
        const rank = rankByMarks.get(marks);
        if (rank != null) {
          percentile = Number(
            (((submittedCount - rank) / (submittedCount - 1)) * 100).toFixed(2),
          );
        }
      }
    }

    return {
      ...session,
      total_marks: marks,
      percentage,
      percentile,
    };
  });

  return {
    exam,
    total_possible_marks: totalPossibleMarks,
    highest_marks: highestMarks,
    results,
  };
}

module.exports = {
  computeSessionMarks,
  finalizeSession,
  finalizeSessionsForExam,
  getExamById,
  getExamResults,
  getTotalExamMarks,
};
