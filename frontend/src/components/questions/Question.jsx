import { Box, Chip, Paper, Stack, Typography } from "@mui/material";

// TODO: Make this component versatile, and if the user is student
// make the student select option and save them.
export default function Question({
  is_admin,
  currentSectionIndex,
  currentQuestionIndex,
  questions,
}) {
  const section = Array.isArray(questions)
    ? questions[currentSectionIndex] || null
    : null;

  const question =
    section &&
    Array.isArray(section.questions) &&
    currentQuestionIndex >= 0 &&
    currentQuestionIndex < section.questions.length
      ? section.questions[currentQuestionIndex]
      : null;

  // Nothing to render if section doesn't exist
  if (!section) {
    return null;
  }

  const isIntroView = currentQuestionIndex === -1;

  return (
    <Paper
      elevation={1}
      sx={{
        p: 3,
        borderRadius: 3,
        mt: 2,
      }}
    >
      {isIntroView ? (
        // Section intro: name + instructions
        <Stack spacing={2}>
          <Box>
            <Chip
              label="Section overview"
              size="small"
              variant="outlined"
              color="primary"
            />
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
              {section.name || `Section ${currentSectionIndex + 1}`}
            </Typography>
          </Box>

          {section.instructions ? (
            <Typography
              variant="body1"
              color="text.secondary"
              sx={{ whiteSpace: "pre-line" }}
            >
              {section.instructions}
            </Typography>
          ) : (
            <Typography variant="body2" color="text.secondary">
              No specific instructions have been provided for this section.
            </Typography>
          )}
        </Stack>
      ) : question ? (
        // Actual question view
        <Stack spacing={2.5}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              gap: 2,
              alignItems: "center",
            }}
          >
            <Box>
              <Typography variant="overline" color="text.secondary">
                {section.name || `Section ${currentSectionIndex + 1}`}
              </Typography>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                Question {currentQuestionIndex + 1}
              </Typography>
            </Box>

            <Chip
              label={`${question.marks ?? 0} marks`}
              color="secondary"
              size="small"
              variant="filled"
            />
          </Box>

          <Typography variant="body1" sx={{ fontSize: 16 }}>
            {question.question_text}
          </Typography>

          <Stack spacing={1.5} sx={{ mt: 1 }}>
            {["a", "b", "c", "d"].map((optKey) => {
              const label =
                optKey === "a"
                  ? question.option_a
                  : optKey === "b"
                    ? question.option_b
                    : optKey === "c"
                      ? question.option_c
                      : question.option_d;

              if (!label) return null;

              const isCorrect = is_admin && question.correct_option === optKey;

              return (
                <Box
                  key={optKey}
                  sx={{
                    borderRadius: 2,
                    border: "1px solid",
                    borderColor: isCorrect ? "success.light" : "divider",
                    px: 1.5,
                    py: 1,
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    backgroundColor: isCorrect
                      ? "rgba(22,163,74,0.06)"
                      : "background.paper",
                  }}
                >
                  <Chip
                    label={optKey.toUpperCase()}
                    size="small"
                    variant={isCorrect ? "filled" : "outlined"}
                    color={isCorrect ? "success" : "default"}
                    sx={{ minWidth: 32 }}
                  />
                  <Typography variant="body2">{label}</Typography>
                </Box>
              );
            })}
          </Stack>

          {is_admin && question.correct_option && (
            <Typography variant="caption" color="success.main" sx={{ mt: 1 }}>
              Correct option: {question.correct_option.toUpperCase()}
            </Typography>
          )}
        </Stack>
      ) : (
        // Fallback for out-of-range index
        <Typography variant="body2" color="text.secondary">
          Question not found for this section.
        </Typography>
      )}
    </Paper>
  );
}
