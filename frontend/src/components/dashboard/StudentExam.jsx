import { useState } from "react";
import {
  Paper,
  Stack,
  Typography,
  LinearProgress,
  Container,
} from "@mui/material";
import ExamNavigation from "./student/ExamNavigation";
import { ExamInfo } from "./student/ExamInfo";
import ExamQuestion from "./student/ExamQuestion";
import ExamOverview from "./student/ExamOverview";

export default function StudentExam() {
  const [examStatus, setExamStatus] = useState("not_started");
  const [startTime, setStartTime] = useState(null);
  const [examInfo, setExamInfo] = useState(null);
  const [examError, setExamError] = useState(null);
  const [submissionResult, setSubmissionResult] = useState(null);

  const [sections, setSections] = useState([]);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(-1);

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
          {examError}
        </Typography>
      </Paper>
    );
  }

  function renderExamContent() {
    switch (examStatus) {
      case "not_started":
        return (
          <ExamInfo
            setExamStatus={setExamStatus}
            setStartTime={setStartTime}
            loading={loading}
            setLoading={setLoading}
            setExamError={setExamError}
            setSections={setSections}
            setSubmissionResult={setSubmissionResult}
          />
        );
      case "in_progress":
        return (
          <Container
            maxWidth="lg"
            sx={{
              mt: 3,
              display: "flex",
              flexDirection: {
                xs: "column-reverse",
                md: "row",
              },
              gap: 2,
            }}
          >
            <ExamQuestion
              sections={sections}
              setSections={setSections}
              currentSectionIndex={currentSectionIndex}
              setCurrentSectionIndex={setCurrentSectionIndex}
              currentQuestionIndex={currentQuestionIndex}
              setCurrentQuestionIndex={setCurrentQuestionIndex}
              loading={loading}
              setLoading={setLoading}
              setExamStatus={setExamStatus}
              setSubmissionResult={setSubmissionResult}
            />

            <ExamOverview
              sections={sections}
              setCurrentSectionIndex={setCurrentSectionIndex}
              setCurrentQuestionIndex={setCurrentQuestionIndex}
            />
          </Container>
        );
      case "submitted":
        return (
          <Container maxWidth="md" sx={{ mt: 4 }}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 1 }}>
                Your exam has been submitted
              </Typography>
            </Paper>
          </Container>
        );
      case "terminated":
        return "Your exam has been terminated";
      default:
        return "Unknown Exam Status";
    }
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
        hasStarted={examStatus === "in_progress"}
        setExamStatus={setExamStatus}
        startTime={startTime}
        setSubmissionResult={setSubmissionResult}
      />

      {renderExamContent()}
    </>
  );
}
