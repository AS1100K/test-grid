import { useEffect, useState } from "react";
import { useParams } from "react-router";
import {
  Box,
  Container,
  LinearProgress,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import useAuth from "../../contexts/useAuth";
import useNotification from "../../contexts/useNotification";
import fetch_ from "../../utils";
import QuestionPaperUpload from "../../components/QuestionPaperUpload";

export default function EditExam() {
  const { exam_id } = useParams();
  const { token } = useAuth();
  const { addNotification } = useNotification();

  const [loading, setLoading] = useState(true);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [questions, setQuestions] = useState(null); // null = not loaded yet
  const [parsedData, setParsedData] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function loadQuestions() {
      setLoading(true);
      try {
        const res = await fetch_(
          "GET",
          `/api/exams/questions/${exam_id}`,
          null,
          {
            Authorization: `Bearer ${token}`,
          },
        );

        if (!mounted) return;

        if (res && res.success === false) {
          addNotification({
            type: "error",
            message: res.message,
          });
          setQuestions([]);
          return;
        }

        setQuestions(res?.data ?? []);
      } catch (err) {
        if (!mounted) return;

        addNotification({
          type: "error",
          message: err?.message ?? String(err),
        });
        setQuestions([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadQuestions();

    return () => {
      mounted = false;
    };
  }, [token, exam_id, addNotification]);

  const renderLoading = () => (
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
          Loading exam questions…
        </Typography>
        <LinearProgress />
      </Stack>
    </Paper>
  );

  const renderQuestions = () => (
    <Paper
      elevation={1}
      sx={{
        p: 3,
        borderRadius: 3,
      }}
    >
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
        Existing questions
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Placeholder: questions already exist for this exam. The detailed
        management UI for existing questions will be implemented here.
      </Typography>
    </Paper>
  );

  const showUploadFlow =
    Array.isArray(questions) && questions.length === 0 && !parsedData;

  const showQuestionsPlaceholder =
    (Array.isArray(questions) && questions.length > 0) ||
    (!!parsedData && !showUploadFlow);

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Box
        sx={{
          mb: 3,
          display: "flex",
          flexDirection: "column",
          gap: 0.5,
        }}
      >
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          Edit exam
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Exam ID: {exam_id}
        </Typography>
      </Box>

      <Stack spacing={3}>
        {loading && renderLoading()}
        {!loading && showUploadFlow && (
          <QuestionPaperUpload
            examId={exam_id}
            setParsedData={setParsedData}
            file={uploadedFile}
            setFile={setUploadedFile}
          />
        )}
        {!loading && showQuestionsPlaceholder && renderQuestions()}
      </Stack>
    </Container>
  );
}
