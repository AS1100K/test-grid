import { Box, Button, Paper, Typography } from "@mui/material";

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
                let color;
                let variant;
                let sx;

                if (question.status === "not_attempted") {
                  color = "primary";
                  variant = "outlined";
                } else if (question.status === "saved") {
                  color = "success";
                  variant = "contained";
                } else if (question.status === "marked_for_review") {
                  sx = {
                    backgroundColor: "purple",
                    "&:hover": { backgroundColor: "rebeccapurple" },
                  };
                  variant = "contained";
                }

                return (
                  <Button
                    key={j}
                    variant={variant}
                    sx={{
                      borderRadius: 999,
                      width: 40,
                      height: 40,
                      minWidth: 0,
                      ...sx,
                    }}
                    onClick={() => {
                      setCurrentSectionIndex(i);
                      setCurrentQuestionIndex(j);
                    }}
                    color={color}
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
