import { useEffect, useState } from "react";
import fetch_ from "../../../utils";
import useAuth from "../../../contexts/useAuth";
import { Box, Container, Stack, Typography } from "@mui/material";
import AlarmIcon from "@mui/icons-material/Alarm";

export default function ExamNavigation({
  examInfo,
  setExamInfo,
  setExamError,
  hasStarted,
  startTime,
}) {
  const { token, user } = useAuth();
  const [timeLeftMs, setTimeLeftMs] = useState(null);

  useEffect(() => {
    if (!hasStarted || !startTime || !examInfo?.duration) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTimeLeftMs(null);
      return;
    }

    const examDurationMs = examInfo.duration * 60 * 1000;
    const startMs = new Date(startTime).getTime();
    const endMs = startMs + examDurationMs;

    function updateTimeLeft() {
      const remaining = Math.max(endMs - Date.now(), 0);
      setTimeLeftMs(remaining);
    }

    updateTimeLeft();
    const intervalId = setInterval(updateTimeLeft, 1000);

    return () => clearInterval(intervalId);
  }, [hasStarted, startTime, examInfo?.duration]);

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

  const formattedTime = (() => {
    if (timeLeftMs === null) return null;
    const totalSeconds = Math.ceil(timeLeftMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  })();

  if (examInfo === null) return null;

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
              <Typography
                variant="subtitle1"
                sx={{
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {formattedTime ?? "00:00"}
              </Typography>
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
