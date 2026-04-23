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
  const [name, setName] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [dob, setDob] = useState("");
  const [emailId, setEmailId] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [assignedExamId, setAssignedExamId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [errors, setErrors] = useState({
    username: "",
    password: "",
    name: "",
    rollNumber: "",
    dob: "",
    emailId: "",
    phoneNumber: "",
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
      name: "",
      rollNumber: "",
      dob: "",
      emailId: "",
      phoneNumber: "",
      role: "",
      assignedExamId: "",
    };
    let valid = true;

    if (!role) {
      nextErrors.role = "Role is required.";
      valid = false;
    }

    if (role === "admin" && !username.trim()) {
      nextErrors.username = "Username is required.";
      valid = false;
    }

    if (role === "admin" && !password.trim()) {
      nextErrors.password = "Password is required.";
      valid = false;
    }

    if (role === "student" && !name.trim()) {
      nextErrors.name = "Name is required.";
      valid = false;
    }

    if (role === "student" && !rollNumber.trim()) {
      nextErrors.rollNumber = "Roll number is required.";
      valid = false;
    }

    if (role === "student" && !dob) {
      nextErrors.dob = "DOB is required.";
      valid = false;
    }

    if (role === "student" && !emailId.trim()) {
      nextErrors.emailId = "Email ID is required.";
      valid = false;
    }

    if (role === "student" && !phoneNumber.trim()) {
      nextErrors.phoneNumber = "Phone number is required.";
      valid = false;
    }

    setErrors(nextErrors);
    return valid;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validate()) return;

    setSubmitting(true);

    try {
      const payload =
        role === "student"
          ? {
              role,
              name: name.trim(),
              roll_number: rollNumber.trim(),
              dob,
              email_id: emailId.trim(),
              phone_number: phoneNumber.trim(),
              assigned_exam_id: assignedExamId === "" ? null : assignedExamId,
            }
          : {
              username: username.trim(),
              password: password.trim(),
              role,
              assigned_exam_id: null,
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
    setName("");
    setRollNumber("");
    setDob("");
    setEmailId("");
    setPhoneNumber("");
    setAssignedExamId("");
    setErrors({
      username: "",
      password: "",
      name: "",
      rollNumber: "",
      dob: "",
      emailId: "",
      phoneNumber: "",
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
          Create admin or student users. For students, the default password is
          their email id.
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

            {!isStudent && (
              <>
                <TextField
                  label="Username"
                  fullWidth
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  error={Boolean(errors.username)}
                  helperText={
                    errors.username || "Unique identifier for this admin user."
                  }
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
                    errors.password || "Choose a secure password for the admin."
                  }
                />
              </>
            )}

            {isStudent && (
              <>
                <TextField
                  label="Name"
                  fullWidth
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  error={Boolean(errors.name)}
                  helperText={errors.name}
                />
                <TextField
                  label="Roll Number"
                  fullWidth
                  required
                  value={rollNumber}
                  onChange={(e) => setRollNumber(e.target.value)}
                  error={Boolean(errors.rollNumber)}
                  helperText={errors.rollNumber}
                />
                <TextField
                  label="DOB"
                  type="date"
                  fullWidth
                  required
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  error={Boolean(errors.dob)}
                  helperText={errors.dob}
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  label="Email ID"
                  fullWidth
                  required
                  value={emailId}
                  onChange={(e) => setEmailId(e.target.value)}
                  error={Boolean(errors.emailId)}
                  helperText={errors.emailId || "This will be the default password."}
                />
                <TextField
                  label="Phone Number"
                  fullWidth
                  required
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  error={Boolean(errors.phoneNumber)}
                  helperText={errors.phoneNumber}
                />

              <FormControl
                fullWidth
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
                  <MenuItem value="">
                    <em>None</em>
                  </MenuItem>
                  {exams.map((exam) => (
                    <MenuItem key={exam.id} value={exam.id}>
                      {exam.id}: {exam.title}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              </>
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
