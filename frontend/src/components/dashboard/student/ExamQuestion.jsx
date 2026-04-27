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
import FlagIcon from "@mui/icons-material/Flag";
import { useEffect, useMemo, useState } from "react";
import fetch_ from "../../../utils";
import useAuth from "../../../contexts/useAuth";
import useNotification from "../../../contexts/useNotification";

export default function ExamQuestion({
  sections,
  setSections,
  currentSectionIndex,
  setCurrentSectionIndex,
  currentQuestionIndex,
  setCurrentQuestionIndex,
  loading,
  setLoading,
  setExamStatus,
}) {
  const { token } = useAuth();
  const { addNotification } = useNotification();

  const currentSection = useMemo(
    () => sections[currentSectionIndex],
    [sections, currentSectionIndex],
  );
  const currentQuestion = useMemo(
    () => currentSection?.questions?.[currentQuestionIndex],
    [currentSection, currentQuestionIndex],
  );

  const [selectedOption, setSelectedOption] = useState(
    currentQuestion?.selected_option || null,
  );

  useEffect(() => {
    setSelectedOption(currentQuestion?.selected_option || null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSectionIndex, currentQuestionIndex]);

  // isNotSaved: true when the local selection differs from the persisted one.
  // The marked_for_review check is intentional: marking for review clears the
  // persisted selected_option to null, but we deliberately leave the RadioGroup
  // visual selection intact so the student can still see which option they had
  // chosen. Without this exclusion, the "Not Saved" chip would appear for every
  // marked-for-review question that had a prior selection.
  const isNotSaved =
    currentQuestion !== undefined &&
    selectedOption !== (currentQuestion?.selected_option ?? null) &&
    currentQuestion?.status !== "marked_for_review";

  function updateQuestionStatus(status) {
    if (!setSections || !currentQuestion) {
      return;
    }

    setSections((prevSections) =>
      prevSections.map((section, sectionIdx) => {
        if (sectionIdx !== currentSectionIndex) {
          return section;
        }

        const updatedQuestions = section.questions.map(
          (question, questionIdx) =>
            questionIdx === currentQuestionIndex
              ? {
                  ...question,
                  status: status
                    ? status
                    : selectedOption !== null
                      ? "saved"
                      : "not_attempted",
                  selected_option:
                    status === "marked_for_review"
                      ? null
                      : (selectedOption ?? null),
                }
              : question,
        );

        return { ...section, questions: updatedQuestions };
      }),
    );
  }

  // Deletes the saved response for the current question from the server.
  // Returns true on success, false on failure (error notification already shown).
  async function clearResponseOnServer() {
    setLoading(true);

    const res = await fetch_(
      "POST",
      "/api/student/save_response",
      {
        question_id: currentQuestion.id,
        selected_option: null,
      },
      {
        Authorization: `Bearer ${token}`,
      },
    );

    setLoading(false);

    if (!res.success) {
      addNotification({
        type: "error",
        message: res.message,
      });
      return false;
    }

    return true;
  }

  async function handleMarkForReview() {
    if (!currentQuestion) {
      return;
    }

    // If the question has a saved response in the DB, delete it first so
    // marked-for-review answers are never submitted for grading.
    if (currentQuestion.selected_option !== null) {
      const ok = await clearResponseOnServer();
      if (!ok) return;
    }

    // Update local state: mark as reviewed and clear the persisted option.
    // The radio-group selection (selectedOption) is intentionally left intact
    // so the student can still see which option they had chosen locally.
    updateQuestionStatus("marked_for_review");
  }

  async function handleClearResponse() {
    if (!currentQuestion) {
      return;
    }

    const ok = await clearResponseOnServer();
    if (!ok) return;

    setSelectedOption(null);
    setSections((prevSections) =>
      prevSections.map((section, sectionIdx) => {
        if (sectionIdx !== currentSectionIndex) return section;
        return {
          ...section,
          questions: section.questions.map((question, questionIdx) =>
            questionIdx === currentQuestionIndex
              ? { ...question, status: "not_attempted", selected_option: null }
              : question,
          ),
        };
      }),
    );
    setLoading(false);
  }

  async function handleSaveNNext() {
    if (!currentQuestion) {
      return;
    }

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

    if (res.data?.status === "submitted") {
      setExamStatus("submitted");
      setLoading(false);
      return;
    }

    updateQuestionStatus();
    handleNext();
    setLoading(false);
  }

  async function handleNext() {
    if (isNextDisabled) {
      return;
    }

    if (
      currentQuestionIndex === currentSection.questions.length - 1 &&
      currentSectionIndex < sections.length
    ) {
      setCurrentSectionIndex(currentSectionIndex + 1);
      setCurrentQuestionIndex(-1);
    } else if (currentQuestionIndex < currentSection.questions.length) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  }

  const isNextDisabled =
    currentQuestionIndex === currentSection.questions.length - 1 &&
    currentSectionIndex === sections.length - 1;

  if (!currentSection) {
    return null;
  }

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

          <Button
            variant="contained"
            onClick={handleNext}
            disabled={isNextDisabled}
          >
            Next
          </Button>
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
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "flex-start",
                  alignItems: "center",
                  gap: 1,
                }}
              >
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  Question {currentQuestionIndex + 1}
                </Typography>
                {currentQuestion.status === "marked_for_review" && (
                  <Chip
                    color="secondary"
                    icon={<FlagIcon style={{ width: 20, height: 20 }} />}
                    label="Marked for Review"
                  />
                )}
                {isNotSaved && (
                  <Chip
                    color="warning"
                    size="small"
                    label="Not Saved"
                    variant="outlined"
                  />
                )}
              </Box>
            </Box>

            <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
              <Chip
                label={`${currentQuestion?.marks ?? 0} Marks`}
                color="secondary"
                size="small"
                variant="filled"
              />

              <Button
                variant="contained"
                color="secondary"
                size="small"
                onClick={handleMarkForReview}
              >
                <FlagIcon style={{ width: 15, height: 15, marginRight: 3 }} />
                Mark for Review
              </Button>
            </Stack>
          </Box>

          <Typography variant="body1" sx={{ fontSize: 16 }}>
            {currentQuestion?.question_text}
          </Typography>

          <RadioGroup
            onChange={(e) => setSelectedOption(e.target.value)}
            value={selectedOption}
          >
            <FormControlLabel
              value="a"
              control={<Radio />}
              label={currentQuestion?.option_a}
            />
            <FormControlLabel
              value="b"
              control={<Radio />}
              label={currentQuestion?.option_b}
            />
            <FormControlLabel
              value="c"
              control={<Radio />}
              label={currentQuestion?.option_c}
            />
            <FormControlLabel
              value="d"
              control={<Radio />}
              label={currentQuestion?.option_d}
            />
          </RadioGroup>

          <Stack
            direction="row"
            sx={{ justifyContent: "space-between", alignItems: "center" }}
          >
            <Button
              variant="contained"
              color="inherit"
              loading={loading}
              onClick={handleClearResponse}
            >
              Clear Response
            </Button>

            <Stack direction="row" spacing={1}>
              <Button
                variant="contained"
                loading={loading}
                onClick={handleSaveNNext}
              >
                {isNextDisabled ? "Save" : "Save & Next"}
              </Button>
              <Button
                variant="outlined"
                onClick={handleNext}
                disabled={isNextDisabled}
              >
                Next
              </Button>
            </Stack>
          </Stack>
        </Stack>
      )}
    </Paper>
  );
}
