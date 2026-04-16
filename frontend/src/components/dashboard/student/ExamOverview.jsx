import {
  Box,
  Button,
  IconButton,
  Paper,
  Stack,
  Typography,
} from "@mui/material";

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
            {section.instructions !== null && (
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
              {section.questions.map((question, j) => {
                return (
                  <Button
                    key={j}
                    variant="outlined"
                    sx={{
                      borderRadius: 999,
                      width: 40,
                      height: 40,
                      minWidth: 0,
                    }}
                    onClick={() => {
                      setCurrentSectionIndex(i);
                      setCurrentQuestionIndex(j);
                    }}
                  >
                    {j + 1}
                  </Button>
                );
              })}
            </Box>
          </Box>
        );
      })}
    </Paper>
  );
}
