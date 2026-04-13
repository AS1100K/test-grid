import { useState } from "react";
import {
  Box,
  Button,
  Container,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import useNotification from "../../contexts/useNotification";
import useAuth from "../../contexts/useAuth";
import { useNavigate } from "react-router";
import fetch_ from "../../utils";

export default function ExamsNew() {
  const { addNotification } = useNotification();
  const { token } = useAuth();
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [errors, setErrors] = useState({
    title: "",
    description: "",
    durationMinutes: "",
  });

  const validate = () => {
    const nextErrors = {
      title: "",
      description: "",
      durationMinutes: "",
    };
    let valid = true;

    if (!title.trim()) {
      nextErrors.title = "Title is required.";
      valid = false;
    }

    if (durationMinutes.trim()) {
      const value = Number(durationMinutes);
      if (Number.isNaN(value) || value <= 0) {
        nextErrors.durationMinutes = "Duration must be a positive number.";
        valid = false;
      }
    }

    setErrors(nextErrors);
    return valid;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validate()) return;

    setSubmitting(true);

    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        duration: durationMinutes.trim()
          ? Number(durationMinutes.trim())
          : null,
      };

      const res = await fetch_("POST", "/api/exams", payload, {
        Authorization: `Bearer ${token}`,
      });

      if (!res.success) {
        addNotification({
          type: "error",
          title: "Failed to create exam",
          description: res.message ?? "Unknown error",
        });
        return;
      }

      addNotification({
        type: "success",
        message: "The exam was created successfully.",
      });

      navigate(`/exams/${res.data.id}`);
    } catch (err) {
      addNotification({
        type: "error",
        message: `Failed to create Exam: ${err?.message ?? String(err)}`,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 600, mb: 0.5 }}>
          Create new exam
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Provide basic details for the exam. You can configure questions and
          other settings later.
        </Typography>
      </Box>

      <Paper
        elevation={1}
        sx={{
          p: 3,
          borderRadius: 3,
        }}
      >
        <Box component="form" onSubmit={handleSubmit} noValidate>
          <Stack spacing={2.5}>
            <TextField
              label="Title"
              fullWidth
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              error={Boolean(errors.title)}
              helperText={errors.title || "A short, clear name for this exam."}
            />

            <TextField
              label="Description"
              fullWidth
              multiline
              minRows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              error={Boolean(errors.description)}
              helperText={
                errors.description ||
                "Describe what this exam covers and any important notes."
              }
            />

            <TextField
              label="Duration (minutes)"
              fullWidth
              type="number"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value)}
              error={Boolean(errors.durationMinutes)}
              helperText={
                errors.durationMinutes ||
                "Optional. Leave blank for no time limit."
              }
            />

            <Box
              sx={{
                display: "flex",
                justifyContent: "flex-end",
                pt: 1,
                gap: 1.5,
              }}
            >
              <Button
                type="button"
                color="inherit"
                href="/exams"
                sx={{ textTransform: "none" }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={submitting}
                sx={{ textTransform: "none", borderRadius: 999 }}
              >
                {submitting ? "Creating..." : "Create exam"}
              </Button>
            </Box>
          </Stack>
        </Box>
      </Paper>
    </Container>
  );
}
