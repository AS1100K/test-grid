import { useState } from "react";
import {
  Box,
  Button,
  Chip,
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
  Divider,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import SettingsIcon from "@mui/icons-material/Settings";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import fetch_ from "../../utils";
import useNotification from "../../contexts/useNotification";
import useAuth from "../../contexts/useAuth";

export default function QuestionPagination({
  is_saved,
  exam_id,
  examInfo,
  setExamInfo,
  currentSectionIndex,
  setCurrentSectionIndex,
  currentQuestionIndex,
  setCurrentQuestionIndex,
  questions,
  setUploadedFile,
}) {
  const { addNotification } = useNotification();
  const { token } = useAuth();

  const [savingSettings, setSavingSettings] = useState(false);
  const [uploadingPaper, setUploadingPaper] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [draftExam, setDraftExam] = useState(() => ({
    title: examInfo?.title || "",
    description: examInfo?.description || "",
    is_active: !!examInfo?.is_active,
    duration: examInfo?.duration != null ? examInfo.duration : "",
  }));

  const [aliases, setAliases] = useState([]);
  const [loadingAliases, setLoadingAliases] = useState(false);
  const [newAlias, setNewAlias] = useState("");
  const [addingAlias, setAddingAlias] = useState(false);

  const handleUploadPaper = async () => {
    setUploadingPaper(true);

    const res = await fetch_(
      "PUT",
      `/api/exams/paper/${exam_id}`,
      {
        sections: questions,
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

      return setUploadingPaper(false);
    }

    setUploadedFile(null);
    setUploadingPaper(false);
  };

  const handleOpenSettings = () => {
    setDraftExam({
      title: examInfo?.title || "",
      description: examInfo?.description || "",
      is_active: !!examInfo?.is_active,
      duration: examInfo?.duration != null ? examInfo.duration : "",
    });
    setNewAlias("");
    setSettingsOpen(true);
    loadAliases();
  };

  async function loadAliases() {
    setLoadingAliases(true);
    try {
      const res = await fetch_(
        "GET",
        `/api/exams/${exam_id}/aliases`,
        null,
        { Authorization: `Bearer ${token}` },
      );
      if (res && res.success) {
        setAliases(res.data ?? []);
      }
    } finally {
      setLoadingAliases(false);
    }
  }

  const handleAddAlias = async () => {
    const alias = newAlias.trim();
    if (!alias) return;
    setAddingAlias(true);
    try {
      const res = await fetch_(
        "POST",
        `/api/exams/${exam_id}/aliases`,
        { alias },
        { Authorization: `Bearer ${token}` },
      );
      if (!res.success) {
        addNotification({ type: "error", message: res.message });
        return;
      }
      setNewAlias("");
      await loadAliases();
    } catch (err) {
      addNotification({ type: "error", message: err?.message ?? String(err) });
    } finally {
      setAddingAlias(false);
    }
  };

  const handleDeleteAlias = async (alias) => {
    try {
      const res = await fetch_(
        "DELETE",
        `/api/exams/${exam_id}/aliases/${encodeURIComponent(alias)}`,
        null,
        { Authorization: `Bearer ${token}` },
      );
      if (!res.success) {
        addNotification({ type: "error", message: res.message });
        return;
      }
      setAliases((prev) => prev.filter((a) => a.alias !== alias));
    } catch (err) {
      addNotification({ type: "error", message: err?.message ?? String(err) });
    }
  };

  const handleCloseSettings = () => {
    setSettingsOpen(false);
  };

  const handleSettingsSave = async () => {
    setSavingSettings(true);

    const res = await fetch_(
      "PUT",
      "/api/exams",
      {
        ...draftExam,
        exam_id: parseInt(exam_id, 10),
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
    }

    setExamInfo(draftExam);
    setSettingsOpen(false);
    setSavingSettings(false);
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
                {!is_saved && (
                  <Chip
                    size="small"
                    label="Not Uploaded"
                    color="error"
                    variant="outlined"
                  />
                )}
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
            {!is_saved && (
              <Button
                variant="contained"
                onClick={handleUploadPaper}
                loading={uploadingPaper}
              >
                Upload Paper
              </Button>
            )}

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
              value={draftExam.duration}
              onChange={(e) =>
                setDraftExam((prev) => ({
                  ...prev,
                  duration: e.target.value,
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

            <Divider />

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Exam Aliases
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                Aliases can be used in place of the numeric exam ID when bulk importing students.
              </Typography>

              {loadingAliases ? (
                <Typography variant="body2" color="text.secondary">
                  Loading aliases…
                </Typography>
              ) : (
                <Stack spacing={1}>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {aliases.length === 0 && (
                      <Typography variant="body2" color="text.secondary">
                        No aliases yet.
                      </Typography>
                    )}
                    {aliases.map((a) => (
                      <Chip
                        key={a.id}
                        label={a.alias}
                        onDelete={() => handleDeleteAlias(a.alias)}
                        deleteIcon={<DeleteIcon />}
                        size="small"
                        variant="outlined"
                      />
                    ))}
                  </Stack>

                  <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                    <TextField
                      size="small"
                      label="New alias"
                      value={newAlias}
                      onChange={(e) => setNewAlias(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddAlias();
                        }
                      }}
                      error={/\s/.test(newAlias)}
                      helperText={
                        /\s/.test(newAlias)
                          ? "Spaces are not allowed in an alias."
                          : "No spaces allowed (e.g. B_TECH_1)"
                      }
                      sx={{ flex: 1 }}
                    />
                    <Button
                      variant="outlined"
                      startIcon={<AddIcon />}
                      onClick={handleAddAlias}
                      disabled={addingAlias || !newAlias.trim() || /\s/.test(newAlias)}
                      sx={{ alignSelf: "flex-start", mt: 0.5 }}
                    >
                      Add
                    </Button>
                  </Stack>
                </Stack>
              )}
            </Box>
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
            loading={savingSettings}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
