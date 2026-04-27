import { Button, Container, Divider, Paper, Typography } from "@mui/material";
import PlayIcon from "@mui/icons-material/PlayArrow";
import fetch_ from "../../../utils";
import useAuth from "../../../contexts/useAuth";

export function ExamInfo({
  setExamStatus,
  setStartTime,
  loading,
  setLoading,
  setExamError,
  setSections,
}) {
  const { token } = useAuth();

  async function handleExamStart() {
    setLoading(true);

    const res = await fetch_("POST", "/api/student/start_exam", null, {
      Authorization: `Bearer ${token}`,
    });

    if (!res.success) {
      setExamError(res.message);
      setLoading(false);
      return;
    }

    setExamStatus(res.data.status);
    setStartTime(new Date(res.data.start_time));
    setSections(res.data.data ?? []);

    setLoading(false);
  }

  return (
    <Container maxWidth="md" sx={{ mt: 2 }}>
      <Paper sx={{ p: 3 }} variant="outlined">
        <Typography variant="h5" component="h1" gutterBottom>
          Exam Instructions
        </Typography>

        <Divider sx={{ mb: 2 }} />

        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
          General Guidelines
        </Typography>
        <Typography variant="body2" component="ul" sx={{ pl: 2, mb: 2 }}>
          <li>Read each question carefully before selecting your answer.</li>
          <li>All questions are multiple-choice (single correct answer).</li>
          <li>
            You can navigate between questions freely using the question grid on
            the right-hand side.
          </li>
          <li>
            Your exam will be submitted automatically when the timer expires.
          </li>
          <li>
            Do not refresh the page or close the browser during the exam.
          </li>
        </Typography>

        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
          Question Status Legend
        </Typography>
        <Typography variant="body2" component="ul" sx={{ pl: 2, mb: 2 }}>
          <li>
            <strong>Blue (outlined)</strong> — Not Attempted: you have not
            selected or saved an answer for this question.
          </li>
          <li>
            <strong>Green (filled)</strong> — Saved: your answer has been saved
            successfully.
          </li>
          <li>
            <strong>Purple (filled)</strong> — Marked for Review: you have
            flagged this question to revisit later. The answer is cleared when a
            question is marked for review.
          </li>
        </Typography>

        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
          Buttons &amp; Actions
        </Typography>
        <Typography variant="body2" component="ul" sx={{ pl: 2, mb: 2 }}>
          <li>
            <strong>Save &amp; Next</strong> — Saves your selected answer to the
            server and moves to the next question.
          </li>
          <li>
            <strong>Save</strong> — Appears on the last question; saves your
            answer without navigating away.
          </li>
          <li>
            <strong>Clear Response</strong> — Removes your saved answer for the
            current question from the server and resets the selection.
          </li>
          <li>
            <strong>Mark for Review</strong> — Flags the question for later
            review and clears any saved answer.
          </li>
          <li>
            <strong>Next</strong> — Navigates to the next question without
            saving.
          </li>
        </Typography>

        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
          Saving Your Responses
        </Typography>
        <Typography variant="body2" sx={{ mb: 2 }}>
          Selecting an option does <strong>not</strong> automatically save it.
          You must click <strong>Save &amp; Next</strong> (or{" "}
          <strong>Save</strong> on the last question) to persist your answer. A{" "}
          <em>Not Saved</em> badge will appear next to the question number
          whenever your current selection has not yet been saved.
        </Typography>

        <Button
          variant="contained"
          startIcon={<PlayIcon />}
          onClick={handleExamStart}
          loading={loading}
          sx={{ mt: 1 }}
        >
          Start Exam
        </Button>
      </Paper>
    </Container>
  );
}
