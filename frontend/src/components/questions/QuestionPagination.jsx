import { useState } from "react";
import {
  Box,
  Button,
  Chip,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
  Paper,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import SettingsIcon from "@mui/icons-material/Settings";

export default function QuestionPagination({
  is_saved,
  examInfo,
  currentSectionIndex,
  setCurrentSectionIndex,
  currentQuestionIndex,
  setCurrentQuestionIndex,
  questions,
}) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [draftExam, setDraftExam] = useState(() => ({
    title: examInfo?.title || "",
    description: examInfo?.description || "",
    is_active: !!examInfo?.is_active,
    duration_minutes:
      examInfo?.duration_minutes != null ? examInfo.duration_minutes : "",
  }));

  const handleOpenSettings = () => {
    setDraftExam({
      title: examInfo?.title || "",
      description: examInfo?.description || "",
      is_active: !!examInfo?.is_active,
      duration_minutes:
        examInfo?.duration_minutes != null ? examInfo.duration_minutes : "",
    });
    setSettingsOpen(true);
  };

  const handleCloseSettings = () => {
    setSettingsOpen(false);
  };

  const handleSettingsSave = () => {
    // TODO
    setSettingsOpen(false);
  };

  const handlePrevQuestion = () => {
    if (currentQuestionIndex === -1 && currentSectionIndex > 0) {
      const prevSectionIndex = currentSectionIndex - 1;
      setCurrentSectionIndex(prevSectionIndex);
      setCurrentQuestionIndex(questions[prevSectionIndex].questions.length - 1);
    } else if (currentQuestionIndex > -1) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleNextQuestion = () => {
    if (
      currentQuestionIndex ===
        questions[currentSectionIndex].questions.length - 1 &&
      currentSectionIndex < questions.length
    ) {
      setCurrentSectionIndex(currentSectionIndex + 1);
      setCurrentQuestionIndex(-1);
    } else if (
      currentQuestionIndex < questions[currentSectionIndex].questions.length
    ) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const isPrevDisabled =
    currentQuestionIndex === -1 && currentSectionIndex === 0;
  const isNextDisabled =
    currentQuestionIndex ===
      questions[currentSectionIndex].questions.length - 1 &&
    currentSectionIndex === questions.length - 1;

  return (
    <>
      <>
        <Paper
          sx={{
            px: 2.5,
            py: 1.5,
            borderRadius: 999,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
            backdropFilter: "blur(10px)",
          }}
        >
          {/* Left: exam title & section */}
          <Stack
            direction="row"
            spacing={2}
            sx={{ minWidth: 0, flex: 1, alignItems: "center" }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                <Typography
                  variant="subtitle1"
                  sx={{
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                    textOverflow: "ellipsis",
                    overflow: "hidden",
                  }}
                >
                  {examInfo?.title || "Untitled exam"}
                </Typography>
                <Chip
                  label={examInfo?.is_active ? "Active" : "Draft"}
                  color={examInfo?.is_active ? "success" : "default"}
                  size="small"
                  variant={examInfo?.is_active ? "filled" : "outlined"}
                />
              </Stack>

              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block" }}
              >
                Section {currentSectionIndex + 1}:{" "}
                {questions[currentSectionIndex].name}{" "}
                {currentQuestionIndex > -1 && (
                  <>• Q{currentQuestionIndex + 1}</>
                )}
              </Typography>
            </Box>
          </Stack>

          {/* Right: navigation + settings */}
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            {!is_saved && <Button variant="contained">Save</Button>}
            <Tooltip title="Previous question">
              <span>
                <IconButton
                  size="small"
                  onClick={handlePrevQuestion}
                  disabled={isPrevDisabled}
                >
                  <ArrowBackIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>

            <Tooltip title="Next question">
              <span>
                <IconButton
                  size="small"
                  onClick={handleNextQuestion}
                  disabled={isNextDisabled}
                >
                  <ArrowForwardIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>

            <Tooltip title="Exam settings">
              <IconButton size="small" onClick={handleOpenSettings}>
                <SettingsIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        </Paper>
      </>

      {/* Settings dialog */}
      <Dialog
        open={settingsOpen}
        onClose={handleCloseSettings}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Edit exam settings</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <TextField
              label="Exam title"
              fullWidth
              value={draftExam.title}
              onChange={(e) =>
                setDraftExam((prev) => ({ ...prev, title: e.target.value }))
              }
            />

            <TextField
              label="Description"
              fullWidth
              multiline
              minRows={3}
              value={draftExam.description}
              onChange={(e) =>
                setDraftExam((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
            />

            <TextField
              label="Duration (minutes)"
              fullWidth
              type="number"
              inputProps={{ min: 1 }}
              value={draftExam.duration_minutes}
              onChange={(e) =>
                setDraftExam((prev) => ({
                  ...prev,
                  duration_minutes: e.target.value,
                }))
              }
              helperText="Optional. Leave blank for no time limit."
            />

            <FormControlLabel
              control={
                <Switch
                  checked={draftExam.is_active}
                  onChange={(e) =>
                    setDraftExam((prev) => ({
                      ...prev,
                      is_active: e.target.checked,
                    }))
                  }
                  color="success"
                />
              }
              label="Exam is active"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseSettings} color="inherit">
            Cancel
          </Button>
          <Button
            onClick={handleSettingsSave}
            variant="contained"
            sx={{ textTransform: "none", borderRadius: 999 }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
