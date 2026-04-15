import { useState } from "react";
import {
  Box,
  Button,
  Container,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import useNotification from "../contexts/useNotification";
import useAuth from "../contexts/useAuth";
import fetch_ from "../utils";
import { useEffect } from "react";

export default function NewUser() {
  const { addNotification } = useNotification();
  const { token, user } = useAuth();

  const [exams, setExams] = useState([]);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("student");
  const [assignedExamId, setAssignedExamId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [errors, setErrors] = useState({
    username: "",
    password: "",
    role: "",
    assignedExamId: "",
  });

  useEffect(() => {
    async function getExams() {
      const res = await fetch_("GET", "/api/exams", null, {
        Authorization: `Bearer ${token}`,
      });

      if (!res.success) {
        addNotification({
          type: "error",
          message: res.message,
        });

        return;
      }

      setExams(res.data);
    }

    getExams();
  }, [user, token, addNotification]);

  const validate = () => {
    const nextErrors = {
      username: "",
      password: "",
      role: "",
      assignedExamId: "",
    };
    let valid = true;

    if (!username.trim()) {
      nextErrors.username = "Username is required.";
      valid = false;
    }

    if (!password.trim()) {
      nextErrors.password = "Password is required.";
      valid = false;
    }

    if (!role) {
      nextErrors.role = "Role is required.";
      valid = false;
    }

    // assigned_exam_id is only relevant for student and is optional,
    // so no validation needed unless you decide otherwise later.

    setErrors(nextErrors);
    return valid;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validate()) return;

    setSubmitting(true);

    try {
      const payload = {
        username: username.trim(),
        password: password.trim(),
        role,
        assigned_exam_id: role === "student" ? assignedExamId : null,
      };

      const res = await fetch_("POST", "/api/users", payload, {
        Authorization: `Bearer ${token}`,
      });

      if (!res.success) {
        addNotification({
          type: "error",
          message: res.message ?? "Unknown error",
        });
        return;
      }

      addNotification({
        type: "success",
        message: "User Created",
      });
    } catch (err) {
      addNotification({
        type: "error",
        message: err?.message ?? String(err),
      });
      setSubmitting(false);
      return;
    } finally {
      setSubmitting(false);
      handleReset();
    }
  };

  const handleReset = () => {
    setUsername("");
    setPassword("");
    setRole("student");
    setAssignedExamId("");
    setErrors({
      username: "",
      password: "",
      role: "",
      assignedExamId: "",
    });
  };

  const isStudent = role === "student";

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 600, mb: 0.5 }}>
          Create new user
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Add a new user to the system and assign them a role. For students, you
          can optionally assign an exam.
        </Typography>
      </Box>

      <Paper
        elevation={1}
        sx={{
          p: 3,
          borderRadius: 3,
        }}
      >
        <Box component="form" noValidate onSubmit={handleSubmit}>
          <Stack spacing={2.5}>
            <TextField
              label="Username"
              fullWidth
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              error={Boolean(errors.username)}
              helperText={errors.username || "Unique identifier for this user."}
            />

            <TextField
              label="Password"
              fullWidth
              required
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={Boolean(errors.password)}
              helperText={
                errors.password || "Choose a secure password for the user."
              }
            />

            <FormControl fullWidth required error={Boolean(errors.role)}>
              <InputLabel id="role-label">Role</InputLabel>
              <Select
                labelId="role-label"
                label="Role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <MenuItem value="admin" disabled={user?.role !== "super_admin"}>
                  Admin
                </MenuItem>
                <MenuItem value="student">Student</MenuItem>
              </Select>
            </FormControl>

            {isStudent && (
              <FormControl
                fullWidth
                required
                error={Boolean(errors.assignedExamId)}
              >
                <InputLabel id="assigned-exam-id-label">
                  Assigned Exam
                </InputLabel>
                <Select
                  labelId="assigned-exam-id-label"
                  label="Assigned Exam"
                  value={assignedExamId}
                  onChange={(e) => setAssignedExamId(e.target.value)}
                >
                  {exams.map((exam) => (
                    <MenuItem value={exam.id}>
                      {exam.id}: {exam.title}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            <Box
              sx={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 1.5,
                pt: 1,
              }}
            >
              <Button
                type="button"
                color="inherit"
                onClick={handleReset}
                sx={{ textTransform: "none" }}
              >
                Reset
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={submitting}
                sx={{ textTransform: "none", borderRadius: 999 }}
              >
                {submitting ? "Creating..." : "Create user"}
              </Button>
            </Box>
          </Stack>
        </Box>
      </Paper>
    </Container>
  );
}
