import { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import DownloadIcon from "@mui/icons-material/Download";
import EditIcon from "@mui/icons-material/Edit";
import AddIcon from "@mui/icons-material/Add";
import QuizIcon from "@mui/icons-material/Quiz";
import { useNavigate } from "react-router";
import useAuth from "../../contexts/useAuth";
import useNotification from "../../contexts/useNotification";
import fetch_ from "../../utils";

const MANAGEABLE_ROLES = ["admin", "student"];
const initialEditState = {
  username: "",
  role: "",
  name: "",
  roll_number: "",
  dob: "",
  email_id: "",
  phone_number: "",
  assigned_exam_id: "",
  password: "",
};

function normalizeDob(value) {
  if (!value) {
    return "";
  }
  return String(value).slice(0, 10);
}

export default function AdminDashboard() {
  const { token, user } = useAuth();
  const { addNotification } = useNotification();
  const navigate = useNavigate();
  const uploadRef = useRef(null);

  const [users, setUsers] = useState([]);
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);

  const [editOpen, setEditOpen] = useState(false);
  const [editState, setEditState] = useState(initialEditState);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);

  const isSuperAdmin = user?.role === "super_admin";

  const visibleUsers = useMemo(
    () =>
      users.filter((u) =>
        isSuperAdmin ? MANAGEABLE_ROLES.includes(u.role) : u.role === "student",
      ),
    [users, isSuperAdmin],
  );

  async function loadData() {
    setLoading(true);
    try {
      const [usersRes, examsRes] = await Promise.all([
        fetch_("GET", "/api/users", null, {
          Authorization: `Bearer ${token}`,
        }),
        fetch_("GET", "/api/exams", null, {
          Authorization: `Bearer ${token}`,
        }),
      ]);

      if (!usersRes.success) {
        throw new Error(usersRes.message || "Failed to load users.");
      }
      if (!examsRes.success) {
        throw new Error(examsRes.message || "Failed to load exams.");
      }

      setUsers(usersRes.data ?? []);
      setExams(examsRes.data ?? []);
    } catch (err) {
      addNotification({
        type: "error",
        message: err?.message ?? String(err),
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const openEdit = (row) => {
    setEditState({
      username: row.username ?? "",
      role: row.role ?? "",
      name: row.name ?? "",
      roll_number: row.roll_number ?? "",
      dob: normalizeDob(row.dob),
      email_id: row.email_id ?? "",
      phone_number: row.phone_number ?? "",
      assigned_exam_id: row.assigned_exam_id ?? "",
      password: "",
    });
    setEditOpen(true);
  };

  const handleExport = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/users/export/students`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.message || "Failed to export students.");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "students-list.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      addNotification({
        type: "error",
        message: err?.message ?? String(err),
      });
    }
  };

  const handleImport = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const data = new FormData();
    data.append("users_sheet", file);

    setImporting(true);
    try {
      const res = await fetch_("POST", "/api/users/import/students", data, {
        Authorization: `Bearer ${token}`,
      });
      if (!res.success) {
        throw new Error(res.message || "Import failed.");
      }
      addNotification({
        type: "success",
        message: "Users imported successfully.",
      });
      await loadData();
    } catch (err) {
      addNotification({
        type: "error",
        message: err?.message ?? String(err),
      });
    } finally {
      setImporting(false);
    }
  };

  const submitEdit = async () => {
    setSaving(true);
    try {
      const payload = {};
      if (editState.role === "student") {
        payload.name = editState.name.trim();
        payload.roll_number = editState.roll_number.trim();
        payload.dob = editState.dob;
        payload.email_id = editState.email_id.trim();
        payload.phone_number = editState.phone_number.trim();
        payload.assigned_exam_id =
          editState.assigned_exam_id === "" ? null : Number(editState.assigned_exam_id);
      }
      if (editState.password.trim()) {
        payload.password = editState.password.trim();
      }

      const res = await fetch_(
        "PUT",
        `/api/users/${encodeURIComponent(editState.username)}`,
        payload,
        {
          Authorization: `Bearer ${token}`,
        },
      );

      if (!res.success) {
        throw new Error(res.message || "Update failed.");
      }

      addNotification({
        type: "success",
        message: "User updated successfully.",
      });
      setEditOpen(false);
      await loadData();
    } catch (err) {
      addNotification({
        type: "error",
        message: err?.message ?? String(err),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Stack spacing={2.5}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            Admin Dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary">
            View, create, edit, export, and bulk import users.
          </Typography>
        </Box>

        <Stack direction="row" spacing={1.5} flexWrap="wrap">
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate("/new-user")}>
            Create User
          </Button>
          <Button variant="outlined" startIcon={<DownloadIcon />} onClick={handleExport}>
            Export Students
          </Button>
          <Button
            variant="outlined"
            startIcon={<CloudUploadIcon />}
            disabled={importing}
            onClick={() => uploadRef.current?.click()}
          >
            {importing ? "Importing..." : "Bulk Import"}
          </Button>
          {isSuperAdmin && (
            <Button variant="outlined" startIcon={<QuizIcon />} onClick={() => navigate("/exams")}>
              Manage Exams
            </Button>
          )}
          <input
            ref={uploadRef}
            hidden
            type="file"
            accept=".csv,.xls,.xlsx,text/csv,application/vnd.ms-excel"
            onChange={handleImport}
          />
        </Stack>

        <Paper sx={{ borderRadius: 3, overflow: "hidden" }}>
          {loading ? (
            <Box sx={{ p: 3 }}>
              <Typography variant="body2" color="text.secondary">
                Loading users...
              </Typography>
            </Box>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Username</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Roll Number</TableCell>
                  <TableCell>Email ID</TableCell>
                  <TableCell>Phone Number</TableCell>
                  <TableCell>DOB</TableCell>
                  <TableCell>Assigned Exam</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {visibleUsers.map((row) => (
                  <TableRow key={row.username}>
                    <TableCell>{row.username}</TableCell>
                    <TableCell>{row.role}</TableCell>
                    <TableCell>{row.name || "-"}</TableCell>
                    <TableCell>{row.roll_number || "-"}</TableCell>
                    <TableCell>{row.email_id || "-"}</TableCell>
                    <TableCell>{row.phone_number || "-"}</TableCell>
                    <TableCell>{normalizeDob(row.dob) || "-"}</TableCell>
                    <TableCell>{row.assigned_exam_id ?? "-"}</TableCell>
                    <TableCell align="right">
                      <Button size="small" startIcon={<EditIcon />} onClick={() => openEdit(row)}>
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {visibleUsers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} align="center">
                      No users available.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </Paper>
      </Stack>

      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit User</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Username" value={editState.username} disabled fullWidth />
            <TextField label="Role" value={editState.role} disabled fullWidth />
            {editState.role === "student" && (
              <>
                <TextField
                  label="Name"
                  value={editState.name}
                  onChange={(e) => setEditState((prev) => ({ ...prev, name: e.target.value }))}
                  fullWidth
                />
                <TextField
                  label="Roll Number"
                  value={editState.roll_number}
                  onChange={(e) => setEditState((prev) => ({ ...prev, roll_number: e.target.value }))}
                  fullWidth
                />
                <TextField
                  label="DOB"
                  type="date"
                  value={editState.dob}
                  onChange={(e) => setEditState((prev) => ({ ...prev, dob: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />
                <TextField
                  label="Email ID"
                  value={editState.email_id}
                  onChange={(e) => setEditState((prev) => ({ ...prev, email_id: e.target.value }))}
                  fullWidth
                />
                <TextField
                  label="Phone Number"
                  value={editState.phone_number}
                  onChange={(e) => setEditState((prev) => ({ ...prev, phone_number: e.target.value }))}
                  fullWidth
                />
                <FormControl fullWidth>
                  <InputLabel id="edit-assigned-exam-label">Assigned Exam</InputLabel>
                  <Select
                    labelId="edit-assigned-exam-label"
                    label="Assigned Exam"
                    value={editState.assigned_exam_id}
                    onChange={(e) =>
                      setEditState((prev) => ({
                        ...prev,
                        assigned_exam_id: e.target.value,
                      }))
                    }
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
            <TextField
              label="New Password (optional)"
              type="password"
              value={editState.password}
              onChange={(e) => setEditState((prev) => ({ ...prev, password: e.target.value }))}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>Cancel</Button>
          <Button onClick={submitEdit} disabled={saving} variant="contained">
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
