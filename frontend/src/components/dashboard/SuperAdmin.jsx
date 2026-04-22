import {
  Box,
  Button,
  Chip,
  Container,
  IconButton,
  LinearProgress,
  Paper,
  Stack,
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadExams() {
      try {
        const res = await fetch_("GET", "/api/exams", null, {
          Authorization: `Bearer ${token}`,
        });
        if (!mounted) return;

        if (res && res.success === false) {
          const message =
            res.message ||
            "Failed to load exams due to an unexpected server response.";

          addNotification({
            type: "error",
            title: "Failed to load exams",
            description: message,
          });

          setExams([]);
          return;
        }

        setExams(res.data ?? []);
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
                variant="outlined"
                onClick={() => navigate(`/submissions/${exam.id}`)}
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
