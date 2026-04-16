import {
  Box,
  Button,
  Chip,
  FormControlLabel,
  Paper,
  Radio,
  RadioGroup,
  Stack,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import fetch_ from "../../../utils";
import useAuth from "../../../contexts/useAuth";
import useNotification from "../../../contexts/useNotification";

export default function ExamQuestion({
  sections,
  currentSectionIndex,
  currentQuestionIndex,
  loading,
  setLoading,
}) {
  const { token } = useAuth();
  const { addNotification } = useNotification();

  const currentSection = sections[currentSectionIndex];
  const currentQuestion = currentSection.questions[currentQuestionIndex];

  function loadSelectedOption() {
    const sessionResponse = sessionStorage.getItem(
      `response-${currentQuestion.id}`,
    );

    if (sessionResponse !== null) {
      return sessionResponse === "null" ? null : sessionResponse;
    }

    if (currentQuestion.selected_option !== null) {
      return currentQuestion.selected_option;
    }

    return null;
  }

  const [selectedOption, setSelectedOption] = useState(() =>
    loadSelectedOption(),
  );

  useEffect(() => {
    setSelectedOption(loadSelectedOption());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSectionIndex, currentQuestionIndex]);

  async function handleSaveNNext() {
    setLoading(true);

    const res = await fetch_(
      "POST",
      "/api/student/save_response",
      {
        question_id: currentQuestion.id,
        selected_option: selectedOption,
      },
      {
        Authorization: `Bearer ${token}`,
      },
    );

    if (!res.success) {
      addNotification({
        type: "error",
        message: res.message,
      });

      setLoading(false);
      return;
    }

    sessionStorage.setItem(`response-${currentQuestion.id}`, selectedOption);
    setLoading(false);
  }

  async function handleNext() {}

  return (
    <Paper sx={{ p: 3, width: { md: "100%" }, minWidth: { md: "50%" } }}>
      {currentQuestionIndex === -1 ? (
        <Stack spacing={2}>
          <Box>
            <Chip
              label="Section Overview"
              size="small"
              variant="outlined"
              color="primary"
            />

            <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
              {currentSection.name || `Section ${currentSectionIndex + 1}`}
            </Typography>
          </Box>

          {currentSection.instructions ? (
            <Typography variant="body1" sx={{ whiteSpace: "pre-line" }}>
              {currentSection.instructions}
            </Typography>
          ) : (
            <Typography variant="body2">
              No specific instructions have been provided for this section.
            </Typography>
          )}
        </Stack>
      ) : (
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
              <Typography variant="overline" color="textSecondary">
                {currentSection.name || `Section ${currentSectionIndex + 1}`}
              </Typography>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                Question {currentQuestionIndex + 1}
              </Typography>
            </Box>

            <Chip
              label={`${currentQuestion.marks ?? 0} Marks`}
              color="secondary"
              size="small"
              variant="filled"
            />
          </Box>

          <Typography variant="body1" sx={{ fontSize: 16 }}>
            {currentQuestion.question_text}
          </Typography>

          <RadioGroup
            onChange={(e) => setSelectedOption(e.target.value)}
            value={selectedOption}
          >
            <FormControlLabel
              value="a"
              control={<Radio />}
              label={currentQuestion.option_a}
            />
            <FormControlLabel
              value="b"
              control={<Radio />}
              label={currentQuestion.option_b}
            />
            <FormControlLabel
              value="c"
              control={<Radio />}
              label={currentQuestion.option_c}
            />
            <FormControlLabel
              value="d"
              control={<Radio />}
              label={currentQuestion.option_d}
            />
          </RadioGroup>

          <Stack
            direction="row"
            sx={{ justifyContent: "space-between", alignItems: "center" }}
          >
            <Button
              variant="contained"
              color="inherit"
              onClick={() => setSelectedOption(null)}
            >
              Clear Response
            </Button>

            <Stack direction="row" spacing={1}>
              <Button
                variant="contained"
                loading={loading}
                onClick={handleSaveNNext}
              >
                Save & Next
              </Button>
              <Button variant="outlined" onClick={handleNext}>
                Next
              </Button>
            </Stack>
          </Stack>
        </Stack>
      )}
    </Paper>
  );
}
