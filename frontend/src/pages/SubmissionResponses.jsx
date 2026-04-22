import {
  Box,
  Button,
  Container,
  LinearProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import useAuth from "../contexts/useAuth";
import useNotification from "../contexts/useNotification";
import fetch_ from "../utils";

function SubmissionResponses() {
  const { exam_id, student_username } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const { addNotification } = useNotification();

  const [loading, setLoading] = useState(true);
  const [responseRows, setResponseRows] = useState([]);
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function loadResponses() {
      try {
        const res = await fetch_(
          "GET",
          `/api/exams/${exam_id}/submissions/${student_username}/responses`,
          null,
          {
            Authorization: `Bearer ${token}`,
          },
        );

        if (!mounted) return;
        if (!res.success) {
          addNotification({
            type: "error",
            title: "Failed to load responses",
            description: res.message ?? "Unexpected server response.",
          });
          return;
        }

        setSummary({
          student_username: res.data.student_username,
          marks: res.data.marks,
          percentage: res.data.percentage,
        });
        setResponseRows(res.data.responses ?? []);
      } catch (err) {
        if (!mounted) return;
        addNotification({
          type: "error",
          title: "Failed to load responses",
          description: err?.message ?? String(err),
        });
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadResponses();
    return () => {
      mounted = false;
    };
  }, [exam_id, student_username, token, addNotification]);

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
              Submission responses
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {summary
                ? `${summary.student_username} • ${summary.marks ?? 0} marks • ${summary.percentage ?? 0}%`
                : "Loading response details..."}
            </Typography>
          </Box>
          <Button onClick={() => navigate(-1)} variant="outlined" size="small">
            Back
          </Button>
        </Box>

        <Paper elevation={1} sx={{ p: 2, borderRadius: 3 }}>
          {loading ? (
            <LinearProgress />
          ) : (
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
                {responseRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} sx={{ textAlign: "center" }}>
                      No responses found.
                    </TableCell>
                  </TableRow>
                ) : (
                  responseRows.map((row) => (
                    <TableRow key={`${row.section_order}-${row.question_order}`}>
                      <TableCell>{row.section_name}</TableCell>
                      <TableCell>{row.question_order}</TableCell>
                      <TableCell>{row.selected_option ?? "-"}</TableCell>
                      <TableCell>{row.correct_option}</TableCell>
                      <TableCell>{row.marks_awarded}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </Paper>
      </Stack>
    </Container>
  );
}

export default SubmissionResponses;
