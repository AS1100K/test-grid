import { Navigate, Route, Routes } from "react-router";
import ExamsNew from "./exams/New";
import EditExam from "./exams/EditExam";
import ExamResults from "./exams/Results";

export default function Exams() {
  return (
    <Routes>
      <Route index element={<Navigate to="/" replace />} />
      <Route path="/new" element={<ExamsNew />} />
      <Route path="/:exam_id" element={<EditExam />} />
      <Route path="/:exam_id/results" element={<ExamResults />} />
    </Routes>
  );
}
