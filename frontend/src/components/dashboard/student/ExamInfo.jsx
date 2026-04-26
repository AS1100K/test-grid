import { Button, Container, Typography } from "@mui/material";
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
    <Container maxWidth="lg" sx={{ mt: 1 }}>
      <Typography variant="h5" component="h1">
        Exam Instructions
      </Typography>

      <Typography variant="body1">Exam Instructions goes here.</Typography>

      <Button
        variant="contained"
        startIcon={<PlayIcon />}
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        onClick={handleExamStart}
        loading={loading}
      >
        Start Exam
      </Button>
    </Container>
  );
}
