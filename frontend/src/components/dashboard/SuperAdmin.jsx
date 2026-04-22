import {
  Box,
  Button,
  Chip,
  Container,
  IconButton,
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
import EditIcon from "@mui/icons-material/Edit";
import QuizIcon from "@mui/icons-material/Quiz";
import AddIcon from "@mui/icons-material/Add";
import fetch_ from "../../utils";
import useAuth from "../../contexts/useAuth";
import useNotification from "../../contexts/useNotification";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";

function SuperAdmin() {
  const { token } = useAuth();
  const { addNotification } = useNotification();
  const navigate = useNavigate();

  const [exams, setExams] = useState([]);
  const [selectedExamId, setSelectedExamId] = useState(null);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [sortBy, setSortBy] = useState("marks");
  const [sortOrder, setSortOrder] = useState("desc");
  const [submissionRows, setSubmissionRows] = useState([]);
  const [highestMarks, setHighestMarks] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadExams() {
      try {
        const res = await fetch_("GET", "/api/exams", null, {
          Authorization: `Bearer ${token}`,
        });
        if (!mounted) return;

        // Handle API-level error: success === false
        if (res && res.success === false) {
          const message =
            res.message ||
            "Failed to load exams due to an unexpected server response.";

          addNotification({
            type: "error",
            title: "Failed to load exams",
            description: message,
          });

          setExams([]); // clear data on failure
          return;
        }

        // Normal success path
        const examList = res.data ?? [];
        setExams(examList);
        if (examList.length > 0) {
          setSelectedExamId(examList[0].id);
        }
      } catch (err) {
        if (!mounted) return;

        const message = err?.message ?? String(err);

        addNotification({
          type: "error",
          title: "Failed to load exams",
          description: message,
        });
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadExams();
    return () => {
      mounted = false;
    };
  }, [token, addNotification]);

  useEffect(() => {
    if (!selectedExamId) {
      setSubmissionRows([]);
      setHighestMarks(0);
      return;
    }

    let mounted = true;

    async function loadSubmissions() {
      setSubmissionsLoading(true);
      try {
        const res = await fetch_(
          "GET",
          `/api/exams/${selectedExamId}/submissions?sort_by=${sortBy}&sort_order=${sortOrder}`,
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
  }, [selectedExamId, sortBy, sortOrder, token, addNotification]);

  async function handleSort(column) {
    if (sortBy === column) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortBy(column);
    setSortOrder("desc");
  }

  async function handleDownload(kind) {
    if (!selectedExamId) return;

    const endpoint =
      kind === "summary"
        ? `/api/exams/${selectedExamId}/submissions/export/summary`
        : `/api/exams/${selectedExamId}/submissions/export/full`;

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
    anchor.download = `exam-${selectedExamId}-${kind}.xls`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function formatPercent(value) {
    return value == null ? "-" : `${value}%`;
  }

  const renderContent = () => {
    if (loading) {
      return (
        <Paper
          elevation={0}
          sx={{
            p: 3,
            borderRadius: 3,
            border: "1px solid",
            borderColor: "divider",
          }}
        >
          <Stack spacing={2}>
            <Typography variant="body1" color="text.secondary">
              Loading exams…
            </Typography>
            <LinearProgress />
          </Stack>
        </Paper>
      );
    }

    if (exams.length === 0) {
      return (
        <Paper
          elevation={0}
          sx={{
            p: 3,
            borderRadius: 3,
            border: "1px dashed",
            borderColor: "divider",
            textAlign: "center",
          }}
        >
          <Typography variant="subtitle1" gutterBottom>
            No exams available
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Once exams are created, they will appear here for quick management.
          </Typography>
        </Paper>
      );
    }

    return (
      <Stack spacing={2}>
        {exams.map((exam) => (
          <Paper
            key={exam.id}
            elevation={1}
            sx={{
              p: 2,
              borderRadius: 3,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 2,
            }}
          >
            <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 2,
                  background:
                    "linear-gradient(135deg, rgba(59,130,246,0.12), rgba(59,130,246,0.03))",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "primary.main",
                }}
              >
                <QuizIcon fontSize="small" />
              </Box>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  {exam.title}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  ID: {exam.id}
                </Typography>
              </Box>
            </Stack>

            <Stack
              direction="row"
              spacing={2}
              sx={{
                minWidth: { xs: "auto", sm: 260 },
                justifyContent: "flex-end",
                alignItems: "center",
              }}
            >
              <Chip
                label={exam.is_active ? "Active" : "Draft"}
                color={exam.is_active ? "success" : "default"}
                size="small"
                variant={exam.is_active ? "filled" : "outlined"}
              />

              <Button
                size="small"
                variant={selectedExamId === exam.id ? "contained" : "outlined"}
                onClick={() => setSelectedExamId(exam.id)}
              >
                View submissions
              </Button>

              <IconButton
                href={`/exams/${exam.id}`}
                color="primary"
                size="small"
                sx={{ display: { xs: "inline-flex", sm: "none" } }}
              >
                <EditIcon fontSize="small" />
              </IconButton>

              <Button
                href={`/exams/${exam.id}`}
                variant="outlined"
                size="small"
                startIcon={<EditIcon />}
                sx={{
                  textTransform: "none",
                  borderRadius: 999,
                  display: { xs: "none", sm: "inline-flex" },
                }}
              >
                Edit exam
              </Button>
            </Stack>
          </Paper>
        ))}

        {selectedExamId && (
          <Paper elevation={1} sx={{ p: 2, borderRadius: 3 }}>
            <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
              <Chip
                label={`Highest Marks: ${highestMarks ?? 0}`}
                color="secondary"
                variant="filled"
              />
              <Button
                size="small"
                variant="outlined"
                onClick={() => handleDownload("summary")}
              >
                Download Summary Excel
              </Button>
              <Button
                size="small"
                variant="outlined"
                onClick={() => handleDownload("full")}
              >
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
                  {submissionRows.map((row) => (
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
                          onClick={() =>
                            navigate(
                              `/submissions/${selectedExamId}/${encodeURIComponent(row.student_username)}/responses`,
                            )
                          }
                        >
                          View responses
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Paper>
        )}
      </Stack>
    );
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Box
        sx={{
          mb: 3,
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          alignItems: { xs: "flex-start", sm: "center" },
          justifyContent: "space-between",
          gap: 2,
        }}
      >
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            Exams
          </Typography>
          <Typography variant="body2" color="text.secondary">
            View and manage all exams in the system.
          </Typography>
        </Box>

        <Button
          href="/exams/new"
          variant="contained"
          startIcon={<AddIcon />}
          sx={{
            textTransform: "none",
            borderRadius: 999,
          }}
        >
          Create new exam
        </Button>
      </Box>

      {renderContent()}
    </Container>
  );
}

export default SuperAdmin;
