import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
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
import QuestionPagination from "../../components/questions/QuestionPagination";
import Question from "../../components/questions/Question";

export default function EditExam() {
  const { exam_id } = useParams();
  const { token } = useAuth();
  const { addNotification } = useNotification();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [examInfo, setExamInfo] = useState({
    title: null,
    description: null,
    is_active: null,
    exam_id,
  });
  const [questions, setQuestions] = useState(null); // null = not loaded yet

  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(-1);

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
          navigate("/");
          return;
        }

        setExamInfo({
          title: res.data.title,
          description: res.data.description,
          is_active: res.data.is_active,
        });
        setQuestions(res.data.sections ?? []);
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
  }, [token, exam_id, addNotification, navigate]);

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
    <>
      <QuestionPagination
        is_saved={false}
        examInfo={examInfo}
        currentSectionIndex={currentSectionIndex}
        setCurrentSectionIndex={setCurrentSectionIndex}
        currentQuestionIndex={currentQuestionIndex}
        setCurrentQuestionIndex={setCurrentQuestionIndex}
        questions={questions}
      />
      <Question
        is_admin={true}
        currentSectionIndex={currentSectionIndex}
        currentQuestionIndex={currentQuestionIndex}
        questions={questions}
      />
    </>
  );

  const showUploadFlow = Array.isArray(questions) && questions.length === 0;

  const showQuestions = Array.isArray(questions) && questions.length > 0;

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Stack spacing={3}>
        {loading && renderLoading()}
        {!loading && showUploadFlow && (
          <QuestionPaperUpload
            examId={exam_id}
            setParsedData={setQuestions}
            file={uploadedFile}
            setFile={setUploadedFile}
          />
        )}
        {!loading && showQuestions && renderQuestions()}
      </Stack>
    </Container>
  );
}
