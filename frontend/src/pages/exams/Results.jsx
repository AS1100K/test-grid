import { useEffect, useMemo, useState } from "react";
import { Link as RouterLink, useParams } from "react-router";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
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
import VisibilityIcon from "@mui/icons-material/Visibility";
import DownloadIcon from "@mui/icons-material/Download";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import fetch_ from "../../utils";
import useAuth from "../../contexts/useAuth";
import useNotification from "../../contexts/useNotification";

export default function ExamResults() {
  const { exam_id } = useParams();
  const { token } = useAuth();
  const { addNotification } = useNotification();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [sortBy, setSortBy] = useState("marks");
  const [order, setOrder] = useState("desc");

  const [selectedSession, setSelectedSession] = useState(null);
  const [responses, setResponses] = useState([]);
  const [responsesLoading, setResponsesLoading] = useState(false);

  const fetchResults = async () => {
    setLoading(true);
    try {
      const res = await fetch_(
        "GET",
        `/api/exams/${exam_id}/results?sort_by=${sortBy}&order=${order}`,
        null,
        {
          Authorization: `Bearer ${token}`,
        },
      );

      if (!res.success) {
        addNotification({
          type: "error",
          title: "Failed to load results",
          description: res.message,
        });
        setData(null);
        return;
      }

      setData(res.data);
    } catch (err) {
      addNotification({
        type: "error",
        title: "Failed to load results",
        description: err?.message ?? String(err),
      });
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResults();
  }, [exam_id, sortBy, order, token]);

  const resultRows = useMemo(() => data?.results ?? [], [data]);

  const handleSort = (field) => {
    const isSame = sortBy === field;
    const nextOrder = isSame && order === "desc" ? "asc" : "desc";
    setSortBy(field);
    setOrder(nextOrder);
  };

  const handleDownload = async (type) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/exams/${exam_id}/results/export?type=${type}&sort_by=${sortBy}&order=${order}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Failed to download file");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download =
        type === "full"
          ? `exam-${exam_id}-responses.xlsx`
          : `exam-${exam_id}-summary.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      addNotification({
        type: "error",
        title: "Download failed",
        description: err?.message ?? String(err),
      });
    }
  };

  const handleViewResponses = async (session) => {
    setSelectedSession(session);
    setResponses([]);
    setResponsesLoading(true);
    try {
      const res = await fetch_(
        "GET",
        `/api/exams/${exam_id}/results/${session.id}/responses`,
        null,
        {
          Authorization: `Bearer ${token}`,
        },
      );

      if (!res.success) {
        throw new Error(res.message);
      }

      setResponses(res.data.responses ?? []);
      setSelectedSession((prev) =>
        prev
          ? {
              ...prev,
              ...res.data.session,
            }
          : res.data.session,
      );
    } catch (err) {
      addNotification({
        type: "error",
        title: "Failed to load responses",
        description: err?.message ?? String(err),
      });
    } finally {
      setResponsesLoading(false);
    }
  };

  const closeDialog = () => {
    setSelectedSession(null);
    setResponses([]);
  };

  const renderTable = () => {
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
          <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
            <CircularProgress size={20} />
            <Typography variant="body2" color="text.secondary">
              Loading results…
            </Typography>
          </Stack>
        </Paper>
      );
    }

    if (!resultRows.length) {
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
            No submissions yet
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Results will appear once students submit their exams or their time
            expires.
          </Typography>
        </Paper>
      );
    }

    return (
      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          border: "1px solid",
          borderColor: "divider",
          overflow: "hidden",
        }}
      >
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>
                <TableSortLabel
                  active={sortBy === "username"}
                  direction={order}
                  onClick={() => handleSort("username")}
                >
                  Student
                </TableSortLabel>
              </TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">
                <TableSortLabel
                  active={sortBy === "marks"}
                  direction={order}
                  onClick={() => handleSort("marks")}
                >
                  Marks
                </TableSortLabel>
              </TableCell>
              <TableCell align="right">
                <TableSortLabel
                  active={sortBy === "percentage"}
                  direction={order}
                  onClick={() => handleSort("percentage")}
                >
                  Percentage
                </TableSortLabel>
              </TableCell>
              <TableCell align="right">
                <TableSortLabel
                  active={sortBy === "percentile"}
                  direction={order}
                  onClick={() => handleSort("percentile")}
                >
                  Percentile
                </TableSortLabel>
              </TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {resultRows.map((row) => (
              <TableRow key={row.id} hover>
                <TableCell sx={{ fontWeight: 600 }}>
                  {row.student_username}
                </TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={row.status}
                    color={
                      row.status === "submitted"
                        ? "success"
                        : row.status === "in_progress"
                          ? "warning"
                          : "default"
                    }
                  />
                </TableCell>
                <TableCell align="right">
                  {row.total_marks != null ? row.total_marks : "—"}
                  {data?.total_possible_marks != null &&
                    row.total_marks != null && (
                      <Typography
                        variant="caption"
                        component="span"
                        color="text.secondary"
                        sx={{ ml: 0.5 }}
                      >
                        / {data.total_possible_marks}
                      </Typography>
                    )}
                </TableCell>
                <TableCell align="right">
                  {row.percentage != null ? `${row.percentage}%` : "—"}
                </TableCell>
                <TableCell align="right">
                  {row.percentile != null ? `${row.percentile}%` : "—"}
                </TableCell>
                <TableCell align="center">
                  <IconButton
                    size="small"
                    disabled={row.status !== "submitted"}
                    onClick={() => handleViewResponses(row)}
                    aria-label={`View responses for ${row.student_username}`}
                  >
                    <VisibilityIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    );
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Stack spacing={3}>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          flexWrap="wrap"
          rowGap={2}
        >
          <Stack spacing={0.5}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Button
                startIcon={<ArrowBackIcon />}
                component={RouterLink}
                to="/"
                variant="text"
                sx={{ textTransform: "none" }}
              >
                Back
              </Button>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                {data?.exam?.title ?? "Exam Results"}
              </Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary">
              Highest marks: {data?.highest_marks ?? 0} • Total possible:{" "}
              {data?.total_possible_marks ?? "—"}
            </Typography>
          </Stack>

          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={() => handleDownload("summary")}
              sx={{ textTransform: "none" }}
            >
              Download summary
            </Button>
            <Button
              variant="contained"
              startIcon={<DownloadIcon />}
              onClick={() => handleDownload("full")}
              sx={{ textTransform: "none" }}
            >
              Download full
            </Button>
          </Stack>
        </Stack>

        {renderTable()}
      </Stack>

      <Dialog
        open={Boolean(selectedSession)}
        onClose={closeDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedSession
            ? `Responses • ${selectedSession.student_username}`
            : "Responses"}
        </DialogTitle>
        <DialogContent dividers>
          {responsesLoading && (
            <Stack
              direction="row"
              spacing={2}
              alignItems="center"
              justifyContent="center"
              sx={{ py: 3 }}
            >
              <CircularProgress size={20} />
              <Typography variant="body2" color="text.secondary">
                Loading responses…
              </Typography>
            </Stack>
          )}

          {!responsesLoading && selectedSession && (
            <Stack spacing={2}>
              <Stack direction="row" spacing={3} flexWrap="wrap">
                <Stack spacing={0.25}>
                  <Typography variant="caption" color="text.secondary">
                    Marks
                  </Typography>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    {selectedSession.total_marks ?? 0} /{" "}
                    {data?.total_possible_marks ?? "—"}
                  </Typography>
                </Stack>
                <Stack spacing={0.25}>
                  <Typography variant="caption" color="text.secondary">
                    Percentage
                  </Typography>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    {selectedSession.percentage != null
                      ? `${selectedSession.percentage}%`
                      : "—"}
                  </Typography>
                </Stack>
                <Stack spacing={0.25}>
                  <Typography variant="caption" color="text.secondary">
                    Percentile
                  </Typography>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    {selectedSession.percentile != null
                      ? `${selectedSession.percentile}%`
                      : "—"}
                  </Typography>
                </Stack>
              </Stack>

              {responses.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  No responses recorded for this session.
                </Typography>
              )}

              <Stack spacing={2}>
                {responses.map((resp) => (
                  <Paper
                    key={`${resp.section_order}-${resp.question_order}`}
                    variant="outlined"
                    sx={{ p: 2, borderRadius: 2 }}
                  >
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                      spacing={1}
                    >
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        {resp.section_name} • Q{resp.question_order}
                      </Typography>
                      <Chip
                        size="small"
                        label={
                          resp.selected_option === resp.correct_option
                            ? "Correct"
                            : "Incorrect"
                        }
                        color={
                          resp.selected_option === resp.correct_option
                            ? "success"
                            : "error"
                        }
                      />
                    </Stack>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      {resp.question_text}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: "block", mt: 0.5 }}
                    >
                      Marks: {resp.awarded_marks} / {resp.marks}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: "block", mt: 0.5 }}
                    >
                      Selected: {resp.selected_option?.toUpperCase()} • Correct:{" "}
                      {resp.correct_option?.toUpperCase()}
                    </Typography>
                  </Paper>
                ))}
              </Stack>
            </Stack>
          )}
        </DialogContent>
      </Dialog>
    </Container>
  );
}
