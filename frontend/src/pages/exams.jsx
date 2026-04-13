import { Navigate, Route, Routes } from "react-router";
import ExamsNew from "./exams/new";

export default function Exams() {
  return (
    <Routes>
      <Route index element={<Navigate to="/" replace />} />
      <Route path="/new" element={<ExamsNew />} />
    </Routes>
  );
}
