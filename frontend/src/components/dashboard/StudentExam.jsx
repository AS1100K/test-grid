import { useState } from "react";
import { Paper, Stack, Typography, LinearProgress } from "@mui/material";
import ExamNavigation from "./student/ExamNavigation";
import { ExamInfo } from "./student/ExamInfo";

export default function StudentExam() {
  const [hasStarted, setHasStarted] = useState(false);
  const [examInfo, setExamInfo] = useState(null);
  const [examError, setExamError] = useState(null);

  const [loading, setLoading] = useState(false);

  if (examError !== null) {
    return (
      <Paper
        elevation={0}
        sx={{
          p: 3,
          borderRadius: 3,
          border: "1px dashed",
          borderColor: "divider",
          textAlign: "center",
        }}
      >
        <Typography variant="subtitle1" gutterBottom>
          {examError.message}
        </Typography>
      </Paper>
    );
  }

  return (
    <>
      {examInfo === null && (
        <Paper
          elevation={0}
          sx={{
            p: 3,
            borderRadius: 3,
            border: "1px solid",
            borderColor: "divider",
          }}
        >
          <Stack spacing={2}>
            <Typography variant="body1" color="textPrimary">
              Loading Exam…
            </Typography>
            <LinearProgress />
          </Stack>
        </Paper>
      )}

      <ExamNavigation
        examInfo={examInfo}
        setExamInfo={setExamInfo}
        setExamError={setExamError}
        hasStarted={hasStarted}
      />

      {hasStarted ? (
        "TODO: To be implemented"
      ) : (
        <ExamInfo
          setHasStarted={setHasStarted}
          loading={loading}
          setLoading={setLoading}
        />
      )}
    </>
  );
}
