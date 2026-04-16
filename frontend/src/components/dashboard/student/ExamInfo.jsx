import { Button, Container, Typography } from "@mui/material";
import PlayIcon from "@mui/icons-material/PlayArrow";

export function ExamInfo({ setHasStarted }) {
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
        onClick={() => setHasStarted(true)}
      >
        Start Exam
      </Button>
    </Container>
  );
}
