import {
  Box,
  Button,
  Chip,
  Container,
  Dialog,
  DialogContent,
  DialogTitle,
  LinearProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableSortLabel,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import useAuth from "../contexts/useAuth";
import useNotification from "../contexts/useNotification";
import fetch_ from "../utils";

const TABLE_COLUMN_COUNT = 6;
const EXPORT_KINDS = {
  summary: "summary",
  full: "full",
};

function SubmissionOverview() {
  const { exam_id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const { addNotification } = useNotification();

  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [sortBy, setSortBy] = useState("marks");
  const [sortOrder, setSortOrder] = useState("desc");
  const [submissionRows, setSubmissionRows] = useState([]);
  const [highestMarks, setHighestMarks] = useState(0);
  const [responseDialogOpen, setResponseDialogOpen] = useState(false);
  const [responseDialogTitle, setResponseDialogTitle] = useState("");
  const [responseRows, setResponseRows] = useState([]);

  useEffect(() => {
    let mounted = true;

    async function loadSubmissions() {
      setSubmissionsLoading(true);
      try {
        const res = await fetch_(
          "GET",
          `/api/exams/${exam_id}/submissions?sort_by=${sortBy}&sort_order=${sortOrder}`,
          null,
          {
            Authorization: `Bearer ${token}`,
          },
        );

        if (!mounted) return;
        if (!res.success) {
          addNotification({
            type: "error",
            title: "Failed to load submissions",
            description: res.message ?? "Unexpected server response.",
          });
          return;
        }

        setSubmissionRows(res.data?.rows ?? []);
        setHighestMarks(res.data?.highest_marks ?? 0);
      } catch (err) {
        if (!mounted) return;
        addNotification({
          type: "error",
          title: "Failed to load submissions",
          description: err?.message ?? String(err),
        });
      } finally {
        if (mounted) setSubmissionsLoading(false);
      }
    }

    loadSubmissions();

    return () => {
      mounted = false;
    };
  }, [exam_id, sortBy, sortOrder, token, addNotification]);

  function handleSort(column) {
    if (sortBy === column) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortBy(column);
    setSortOrder("desc");
  }

  async function handleViewResponses(studentUsername) {
    try {
      const res = await fetch_(
        "GET",
        `/api/exams/${exam_id}/submissions/${studentUsername}/responses`,
        null,
        {
          Authorization: `Bearer ${token}`,
        },
      );

      if (!res.success) {
        addNotification({
          type: "error",
          title: "Failed to load responses",
          description: res.message ?? "Unexpected server response.",
        });
        return;
      }

      setResponseDialogTitle(
        `${res.data.student_username} • ${res.data.marks ?? 0} marks • ${res.data.percentage ?? 0}%`,
      );
      setResponseRows(res.data.responses ?? []);
      setResponseDialogOpen(true);
    } catch (err) {
      addNotification({
        type: "error",
        title: "Failed to load responses",
        description: err?.message ?? String(err),
      });
    }
  }

  async function handleDownload(kind) {
    try {
      if (kind !== EXPORT_KINDS.summary && kind !== EXPORT_KINDS.full) {
        addNotification({
          type: "error",
          title: "Download failed",
          description: "Invalid export type.",
        });
        return;
      }

      const endpoint =
        kind === EXPORT_KINDS.summary
          ? `/api/exams/${exam_id}/submissions/export/summary`
          : `/api/exams/${exam_id}/submissions/export/full`;

      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}${endpoint}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        addNotification({
          type: "error",
          title: "Download failed",
          description: "Unable to export student data.",
        });
        return;
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `exam-${exam_id}-${kind}.xls`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      addNotification({
        type: "error",
        title: "Download failed",
        description: err?.message ?? "Unable to export student data.",
      });
    }
  }

  function formatPercent(value) {
    return value === null || value === undefined ? "-" : `${value}%`;
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Stack spacing={2}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
          }}
        >
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              Submission overview
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Exam ID: {exam_id}
            </Typography>
          </Box>
          <Button onClick={() => navigate(-1)} variant="outlined" size="small">
            Back
          </Button>
        </Box>

        <Paper elevation={1} sx={{ p: 2, borderRadius: 3 }}>
          <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
            <Chip
              label={`Highest Marks: ${highestMarks ?? 0}`}
              color="secondary"
              variant="filled"
            />
            <Button size="small" variant="outlined" onClick={() => handleDownload(EXPORT_KINDS.summary)}>
              Download Summary Excel
            </Button>
            <Button size="small" variant="outlined" onClick={() => handleDownload(EXPORT_KINDS.full)}>
              Download Full Excel
            </Button>
          </Stack>

          {submissionsLoading ? (
            <LinearProgress />
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>
                    <TableSortLabel
                      active={sortBy === "student_username"}
                      direction={sortBy === "student_username" ? sortOrder : "asc"}
                      onClick={() => handleSort("student_username")}
                    >
                      Username
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={sortBy === "marks"}
                      direction={sortBy === "marks" ? sortOrder : "asc"}
                      onClick={() => handleSort("marks")}
                    >
                      Marks
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={sortBy === "percentage"}
                      direction={sortBy === "percentage" ? sortOrder : "asc"}
                      onClick={() => handleSort("percentage")}
                    >
                      Percentage
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={sortBy === "percentile"}
                      direction={sortBy === "percentile" ? sortOrder : "asc"}
                      onClick={() => handleSort("percentile")}
                    >
                      Percentile
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {submissionRows.length === 0 ? (
                    <TableRow>
                    <TableCell colSpan={TABLE_COLUMN_COUNT} sx={{ textAlign: "center" }}>
                      No submissions found.
                    </TableCell>
                  </TableRow>
                ) : (
                  submissionRows.map((row) => (
                    <TableRow key={row.session_id}>
                      <TableCell>{row.student_username}</TableCell>
                      <TableCell>{row.status}</TableCell>
                      <TableCell>{row.marks ?? "-"}</TableCell>
                      <TableCell>{formatPercent(row.percentage)}</TableCell>
                      <TableCell>{formatPercent(row.percentile)}</TableCell>
                      <TableCell>
                        <Button
                          size="small"
                          variant="text"
                          onClick={() => handleViewResponses(row.student_username)}
                        >
                          View responses
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </Paper>
      </Stack>

      <Dialog
        open={responseDialogOpen}
        onClose={() => setResponseDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>{responseDialogTitle}</DialogTitle>
        <DialogContent>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Section</TableCell>
                <TableCell>Question</TableCell>
                <TableCell>Selected</TableCell>
                <TableCell>Correct</TableCell>
                <TableCell>Marks</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {responseRows.map((row) => (
                <TableRow key={`${row.section_order}-${row.question_order}`}>
                  <TableCell>{row.section_name}</TableCell>
                  <TableCell>{row.question_order}</TableCell>
                  <TableCell>{row.selected_option ?? "-"}</TableCell>
                  <TableCell>{row.correct_option}</TableCell>
                  <TableCell>{row.marks_awarded}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>
    </Container>
  );
}

export default SubmissionOverview;
