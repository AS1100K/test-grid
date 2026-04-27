import { Box, Button, Paper, Typography } from "@mui/material";
import QuestionStatusButton from "./QuestionStatusButton";

export default function ExamOverview({
  sections,
  setCurrentSectionIndex,
  setCurrentQuestionIndex,
}) {
  return (
    <Paper sx={{ p: 3 }}>
      {sections.map((section, i) => {
        return (
          <Box key={i} sx={{ mb: 2 }}>
            <Typography variant="overline">{section.name}</Typography>

            <br />
            {typeof section.instructions === "string" && (
              <Button
                size="small"
                fullWidth
                variant="outlined"
                sx={{ color: "gray", borderColor: "gray" }}
                onClick={() => {
                  setCurrentSectionIndex(i);
                  setCurrentQuestionIndex(-1);
                }}
              >
                Instructions
              </Button>
            )}
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(5, 40px)",
                gap: 1,
                alignItems: "center",
                mt: 1,
              }}
            >
              {section.questions.map((question, j) => (
                <QuestionStatusButton
                  key={j}
                  status={question.status}
                  label={j + 1}
                  onClick={() => {
                    setCurrentSectionIndex(i);
                    setCurrentQuestionIndex(j);
                  }}
                />
              ))}
            </Box>
          </Box>
        );
      })}
    </Paper>
  );
}
