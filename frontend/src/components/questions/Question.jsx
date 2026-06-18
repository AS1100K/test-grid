import {
  Box,
  Button,
  Chip,
  IconButton,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextareaAutosize,
  TextField,
  Typography,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import { useState } from "react";
import { useEffect } from "react";

const DEFAULT_SECTION_EDITING_STATE = {
  name: null,
  instructions: null,
};

const DEFAULT_QUESTION_EDITING_STATE = {
  question_text: null,
  marks: null,
  correct_option: null,
  option_a: null,
  option_b: null,
  option_c: null,
  option_d: null,
};

// TODO: Make this component versatile, and if the user is student
// make the student select option and save them.
export default function Question({
  is_admin,
  currentSectionIndex,
  currentQuestionIndex,
  questions,
  setQuestions,
  is_saved,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [sectionEditing, setSectionEditing] = useState(
    DEFAULT_SECTION_EDITING_STATE,
  );
  const [questionEditing, setQuestionEditing] = useState(
    DEFAULT_QUESTION_EDITING_STATE,
  );

  const resetEditing = () => {
    setIsEditing(false);
    setSectionEditing(DEFAULT_SECTION_EDITING_STATE);
    setQuestionEditing(DEFAULT_QUESTION_EDITING_STATE);
  };

  useEffect(() => {
    const handleSelectionChange = () => resetEditing;
    handleSelectionChange();
  }, [currentSectionIndex, currentQuestionIndex]);

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

  const handleEdit = () => {
    if (isIntroView) {
      // Update the Section
      if (is_saved) {
        // TODO: Make the API Call
      }

      setQuestions((prevQues) =>
        prevQues.map((prev, index) =>
          index === currentSectionIndex ? { ...prev, ...sectionEditing } : prev,
        ),
      );
    } else {
      // Update the Question
      if (is_saved) {
        // TODO: Make the API Call
      }

      setQuestions((prevQues) =>
        prevQues.map((prev, index) => {
          if (index !== currentSectionIndex) return prev;

          return {
            ...prev,
            questions: prev.questions.map((ques, qIndex) =>
              qIndex === currentQuestionIndex ? questionEditing : ques,
            ),
          };
        }),
      );
    }

    resetEditing();
  };

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
            <Stack
              direction="row"
              sx={{ justifyContent: "space-between", alignItems: "center" }}
            >
              <Chip
                label="Section overview"
                size="small"
                variant="outlined"
                color="primary"
              />

              <IconButton
                onClick={() => {
                  setIsEditing(!isEditing);
                  setSectionEditing({
                    name: section.name,
                    instructions: section.instructions,
                  });
                }}
              >
                <EditIcon />
              </IconButton>
            </Stack>

            {isEditing ? (
              <TextField
                variant="filled"
                label="Section Name"
                value={sectionEditing.name}
                onChange={(e) => {
                  setSectionEditing({
                    ...sectionEditing,
                    name: e.target.value,
                  });
                }}
              />
            ) : (
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                {section.name || `Section ${currentSectionIndex + 1}`}
              </Typography>
            )}
          </Box>

          {isEditing ? (
            <TextareaAutosize
              minRows={3}
              placeholder="Section Instructions"
              style={{ width: "100%", fontFamily: "inherit" }}
              value={sectionEditing.instructions}
              onChange={(e) => {
                setSectionEditing({
                  ...sectionEditing,
                  instructions: e.target.value,
                });
              }}
            />
          ) : section.instructions ? (
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

            <Stack direction="row" sx={{ alignItems: "center", gap: 2 }}>
              {isEditing ? (
                <TextField
                  variant="filled"
                  label="Marks"
                  type="number"
                  value={questionEditing.marks}
                  onChange={(e) => {
                    setQuestionEditing({
                      ...questionEditing,
                      marks: Number(e.target.value),
                    });
                  }}
                />
              ) : (
                <Chip
                  label={`${question.marks ?? 0} marks`}
                  color="secondary"
                  size="small"
                  variant="filled"
                />
              )}

              <IconButton
                onClick={() => {
                  setQuestionEditing(question);
                  setIsEditing(!isEditing);
                }}
              >
                <EditIcon />
              </IconButton>
            </Stack>
          </Box>

          {isEditing ? (
            <TextField
              variant="filled"
              label="Question Text"
              value={questionEditing.question_text}
              onChange={(e) => {
                setQuestionEditing({
                  ...questionEditing,
                  question_text: e.target.value,
                });
              }}
            />
          ) : (
            <Typography variant="body1" sx={{ fontSize: 16 }}>
              {question.question_text}
            </Typography>
          )}

          <Stack spacing={1.5} sx={{ mt: 1 }}>
            {["a", "b", "c", "d"].map((optKey) => {
              const isCorrect = isEditing
                ? questionEditing.correct_option === optKey
                : question.correct_option === optKey;

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
                  {isEditing ? (
                    <TextField
                      variant="standard"
                      label={"Option " + optKey.toUpperCase()}
                      size="small"
                      value={questionEditing[`option_${optKey}`]}
                      onChange={(e) => {
                        setQuestionEditing({
                          ...questionEditing,
                          [`option_${optKey}`]: e.target.value,
                        });
                      }}
                    />
                  ) : (
                    <Typography variant="body2">
                      {question[`option_${optKey}`]}
                    </Typography>
                  )}
                </Box>
              );
            })}
          </Stack>

          {is_admin && question.correct_option && (
            <Typography variant="caption" color="success.main" sx={{ mt: 1 }}>
              Correct option:{" "}
              {isEditing ? (
                <Select
                  label="Correct Option"
                  variant="standard"
                  size="small"
                  value={questionEditing.correct_option}
                  onChange={(e) => {
                    setQuestionEditing({
                      ...questionEditing,
                      correct_option: e.target.value,
                    });
                  }}
                >
                  <MenuItem value="a">A</MenuItem>
                  <MenuItem value="b">B</MenuItem>
                  <MenuItem value="c">C</MenuItem>
                  <MenuItem value="d">D</MenuItem>
                </Select>
              ) : (
                question.correct_option.toUpperCase()
              )}{" "}
            </Typography>
          )}
        </Stack>
      ) : (
        // Fallback for out-of-range index
        <Typography variant="body2" color="text.secondary">
          Question not found for this section.
        </Typography>
      )}

      {isEditing && (
        <>
          <Button
            variant="contained"
            sx={{ mt: 2, mr: 2 }}
            onClick={resetEditing}
            color="inherit"
          >
            Cancel
          </Button>
          <Button variant="contained" sx={{ mt: 2 }} onClick={handleEdit}>
            Update
          </Button>
        </>
      )}
    </Paper>
  );
}
