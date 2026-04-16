import { useState } from "react";
import { Paper, Stack, Typography, LinearProgress } from "@mui/material";
import ExamNavigation from "./student/ExamNavigation";
import { ExamInfo } from "./student/ExamInfo";
import ExamQuestion from "./student/ExamQuestion";

export default function StudentExam() {
  const [examStatus, setExamStatus] = useState("not_started");
  const [startTime, setStartTime] = useState(null);
  const [examInfo, setExamInfo] = useState(null);
  const [examError, setExamError] = useState(null);

  const [sections, setSections] = useState([]);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

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
          />
        );
      case "in_progress":
        console.log(startTime);
        console.log(sections);
        return (
          <ExamQuestion
            sections={sections}
            currentSectionIndex={currentSectionIndex}
            currentQuestionIndex={currentQuestionIndex}
            loading={loading}
            setLoading={setLoading}
          />
        );
      case "submitted":
        return "Your exam has been submitted";
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
        hasStarted={examStatus}
      />

      {renderExamContent()}
    </>
  );
}
