import { Box, Button, Container, Divider, Paper, Typography } from "@mui/material";
import PlayIcon from "@mui/icons-material/PlayArrow";
import fetch_ from "../../../utils";
import useAuth from "../../../contexts/useAuth";
import QuestionStatusButton from "./QuestionStatusButton";

const LEGEND = [
  {
    status: "not_attempted",
    description:
      "Not Attempted — you have not selected or saved an answer for this question.",
  },
  {
    status: "saved",
    description: "Saved — your answer has been saved successfully.",
  },
  {
    status: "marked_for_review",
    description:
      "Marked for Review — flagged for later review. Any saved answer is removed from the server and will NOT be considered for evaluation.",
  },
];

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
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, mb: 2 }}>
          {LEGEND.map(({ status, description }) => (
            <Box
              key={status}
              sx={{ display: "flex", alignItems: "center", gap: 2 }}
            >
              <QuestionStatusButton status={status} label="1" />
              <Typography variant="body2">{description}</Typography>
            </Box>
          ))}
        </Box>

        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
          Buttons & Actions
        </Typography>
        <Typography variant="body2" component="ul" sx={{ pl: 2, mb: 2 }}>
          <li>
            <strong>Save & Next</strong> — Saves your selected answer to the
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
            review. If a response was already saved, it is deleted from the
            server. <strong>Marked-for-review questions are not considered
            for evaluation.</strong> Your local selection remains visible so
            you can save it again before submitting.
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
          You must click <strong>Save & Next</strong> (or{" "}
          <strong>Save</strong> on the last question) to persist your answer. A{" "}
          <em>Not Saved</em> indicator will appear next to the question number
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
