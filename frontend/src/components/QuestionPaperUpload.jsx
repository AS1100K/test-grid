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

  const handleDownloadTemplate = () => {
    window.alert("TODO: To be implemented.");
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

        {/* Instructions placeholder (to be filled in later) */}
        <Box
          sx={{
            borderRadius: 2,
            border: "1px dashed",
            borderColor: "divider",
            p: 2,
            backgroundColor: "background.default",
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
            Formatting instructions
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Instructions about how to format the question paper will go here.
            You can include examples, required styles, and supported question
            types later.
          </Typography>
        </Box>

        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          sx={{
            alignItems: { xs: "stretch", sm: "center" },
            justifyContent: "space-between",
          }}
        >
          <Button
            type="button"
            variant="outlined"
            startIcon={<FileDownloadIcon />}
            onClick={handleDownloadTemplate}
            sx={{
              textTransform: "none",
              borderRadius: 999,
              alignSelf: { xs: "stretch", sm: "flex-start" },
            }}
          >
            Download .docx template
          </Button>

          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ textAlign: { xs: "left", sm: "right" } }}
          >
            Accepted format: <strong>.docx</strong>
          </Typography>
        </Stack>

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
