import { useState } from "react";
import { Box, Button, Paper, Stack, Typography } from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import DescriptionIcon from "@mui/icons-material/Description";
import useNotification from "../contexts/useNotification";
import fetch_ from "../utils";
import useAuth from "../contexts/useAuth";

export default function QuestionPaperUpload({
  examId,
  setParsedData,
  file,
  setFile,
}) {
  const { addNotification } = useNotification();
  const { token } = useAuth();

  const [uploading, setUploading] = useState(false);

  const templateText = `SECTION: <SECTION_NAME>
INSTRUCTIONS: <INSTRUCTIONS_HERE OR EMPTY>

Q1. <QUESTION_TEXT>

A. <OPTION_A_TEXT>

B. <OPTION_B_TEXT>

C. <OPTION_C_TEXT>

D. <OPTION_D_TEXT>

ANSWER: <A | B | C | D>

MARKS: <INTEGER>
`;

  const handleCopyTemplate = async () => {
    try {
      await navigator.clipboard.writeText(templateText);
      addNotification({
        type: "info",
        message: "Template copied to clipboard.",
      });
    } catch (err) {
      addNotification({
        type: "error",
        message: "Failed to copy template to clipboard: " + err.message,
      });
    }
  };

  const handleDownloadTemplate = () => {
    try {
      const blob = new Blob([templateText], {
        type: "text/plain;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "question_paper_template.txt";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      addNotification({ type: "info", message: "Template downloaded." });
    } catch (err) {
      addNotification({
        type: "error",
        message: "Failed to download template: " + err.message,
      });
    }
  };

  const handleFileChange = (event) => {
    const selected = event.target.files?.[0];
    if (!selected) return;

    // Basic extension check
    if (!selected.name.toLowerCase().endsWith(".docx")) {
      addNotification({
        type: "error",
        message: "Invalid file type. Please upload a .docx file.",
      });
      event.target.value = "";
      setFile(null);
      return;
    }

    setFile(selected);
  };

  const handleUpload = async (event) => {
    event.preventDefault();
    if (!file) {
      addNotification({
        type: "error",
        message: "Please choose a .docx question paper to upload.",
      });
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("question_paper", file);
      formData.append("exam_id", examId);

      const res = await fetch_("POST", "/api/exams/parse_paper", formData, {
        Authorization: `Bearer ${token}`,
      });

      if (!res.success) {
        addNotification({
          type: "error",
          message: res.message ?? "Unknown error occurred.",
        });
        return;
      }

      setParsedData(res.data);

      addNotification({
        type: "info",
        message: "Question Paper Parsed.",
      });
    } catch (err) {
      addNotification({
        type: "error",
        message: err?.message ?? String(err),
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Paper
      elevation={1}
      sx={{
        p: 3,
        borderRadius: 3,
      }}
    >
      <Stack spacing={3}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
            Upload question paper
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Upload a .docx file containing all questions for this exam. The
            system will parse the document and extract questions automatically.
          </Typography>
        </Box>

        {/* Formatting instructions and template */}
        <Box
          sx={{
            borderRadius: 2,
            border: "1px dashed",
            borderColor: "divider",
            p: 2,
            backgroundColor: "background.default",
          }}
        >
          <Stack spacing={1}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
              Formatting instructions
            </Typography>
            <Typography variant="body2" color="text.secondary">
              The parser expects exact tokens and structure. Please follow these
              rules exactly:
            </Typography>
            <Typography variant="body2" component="div" color="text.secondary">
              <ul style={{ margin: "8px 0 0 18px", padding: 0 }}>
                <li>
                  <strong>SECTION:</strong> Line must start with{" "}
                  <code>SECTION:</code> followed by the section name (cannot be
                  empty).
                </li>
                <li>
                  <strong>INSTRUCTIONS:</strong> Line must start with{" "}
                  <code>INSTRUCTIONS:</code>. It may be empty but the token and
                  colon must be present on the same line.
                </li>
                <li>
                  <strong>Questions</strong> must start with{" "}
                  <code>Q&lt;number&gt;.</code> (example: <code>Q1.</code>),
                  followed by the question text on the same line.
                </li>
                <li>
                  <strong>Options</strong> must be exactly four lines starting
                  with <code>A.</code>, <code>B.</code>, <code>C.</code>,{" "}
                  <code>D.</code> (uppercase letter, dot, then space).
                </li>
                <li>
                  <strong>ANSWER:</strong> Line must be{" "}
                  <code>ANSWER: &lt;A|B|C|D&gt;</code> (single letter, no dot).
                </li>
                <li>
                  <strong>MARKS:</strong> Line must be{" "}
                  <code>MARKS: &lt;integer&gt;</code> (a whole number).
                </li>
              </ul>
            </Typography>

            <Box
              component="pre"
              sx={{
                whiteSpace: "pre-wrap",
                fontSize: 13,
                backgroundColor: "background.paper",
                p: 1,
                borderRadius: 1,
                overflow: "auto",
              }}
            >
              {`SECTION: Physics - Multiple Choice
INSTRUCTIONS: Answer all questions. Use the given marks.

Q1. What is the SI unit of force?

A. Joule

B. Newton

C. Pascal

D. Watt

ANSWER: B

MARKS: 2
`}
            </Box>

            <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
              <Button
                size="small"
                variant="outlined"
                onClick={handleCopyTemplate}
                startIcon={<FileDownloadIcon />}
                sx={{ textTransform: "none" }}
              >
                Copy template
              </Button>
              <Button
                size="small"
                variant="outlined"
                onClick={handleDownloadTemplate}
                startIcon={<FileDownloadIcon />}
                sx={{ textTransform: "none" }}
              >
                Download template (.txt)
              </Button>
            </Stack>
          </Stack>
        </Box>

        <Box
          component="form"
          onSubmit={handleUpload}
          noValidate
          sx={{
            borderRadius: 2,
            border: "1px dashed",
            borderColor: file ? "primary.light" : "divider",
            p: 3,
            textAlign: "center",
            backgroundColor: "background.default",
          }}
        >
          <Stack spacing={2} sx={{ alignItems: "center" }}>
            <CloudUploadIcon
              color={file ? "primary" : "disabled"}
              sx={{ fontSize: 40 }}
            />
            <Typography variant="subtitle1">
              {file ? file.name : "Choose a .docx question paper to upload"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Drag and drop is not enabled yet. Use the button below to select a
              file from your computer.
            </Typography>

            <Button
              variant="outlined"
              component="label"
              startIcon={<DescriptionIcon />}
              sx={{ textTransform: "none", borderRadius: 999 }}
            >
              {file ? "Change file" : "Select file"}
              <input
                type="file"
                hidden
                accept=".docx"
                onChange={handleFileChange}
              />
            </Button>

            <Box sx={{ mt: 1 }}>
              <Button
                type="submit"
                variant="contained"
                disabled={uploading || !file}
                sx={{ textTransform: "none", borderRadius: 999 }}
              >
                {uploading ? "Uploading..." : "Upload and parse"}
              </Button>
            </Box>
          </Stack>
        </Box>
      </Stack>
    </Paper>
  );
}
