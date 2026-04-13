import { Navigate, Route, Routes } from "react-router";
import ExamsNew from "./exams/New";
import EditExam from "./exams/EditExam";

export default function Exams() {
  return (
    <Routes>
      <Route index element={<Navigate to="/" replace />} />
      <Route path="/new" element={<ExamsNew />} />
      <Route path="/:exam_id" element={<EditExam />} />
    </Routes>
  );
}
