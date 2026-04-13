import { Navigate, Route, Routes } from "react-router";
import ExamsNew from "./exams/new";
import EditExam from "./exams/editExam";

export default function Exams() {
  return (
    <Routes>
      <Route index element={<Navigate to="/" replace />} />
      <Route path="/new" element={<ExamsNew />} />
      <Route path="/:exam_id" element={<EditExam />} />
    </Routes>
  );
}
