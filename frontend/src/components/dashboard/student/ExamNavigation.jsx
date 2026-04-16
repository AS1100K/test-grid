import { useEffect } from "react";
import fetch_ from "../../../utils";
import useAuth from "../../../contexts/useAuth";
import { Box, Container, Stack, Typography } from "@mui/material";
import AlarmIcon from "@mui/icons-material/Alarm";

export default function ExamNavigation({
  examInfo,
  setExamInfo,
  setExamError,
  hasStarted,
}) {
  const { token, user } = useAuth();

  useEffect(() => {
    async function loadExamInfo() {
      const res = await fetch_("GET", "/api/student/exam_info", null, {
        Authorization: `Bearer ${token}`,
      });

      if (!res.success) {
        setExamError(res);
        return;
      }

      setExamInfo(res.data);
    }

    loadExamInfo();
  }, [token, setExamError, setExamInfo]);

  if (examInfo === null) return;

  return (
    <Box
      sx={{
        position: "sticky",
        top: 0,
        zIndex: 10,
        backgroundColor: "background.paper",
        borderBottom: "1px solid",
        borderColor: "divider",
      }}
    >
      <Container maxWidth="lg">
        <Box
          sx={{
            py: 1.5,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 600,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {examInfo?.title}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              Candidate: {user?.username}
            </Typography>
          </Box>

          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <AlarmIcon />

            {hasStarted ? (
              "TODO: Implement Timer"
            ) : (
              <Typography
                variant="subtitle1"
                sx={{
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {examInfo?.duration} minutes
              </Typography>
            )}
          </Stack>
        </Box>
      </Container>
    </Box>
  );
}
