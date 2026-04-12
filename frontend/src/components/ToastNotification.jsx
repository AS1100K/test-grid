import { Alert, Container } from "@mui/material";
import useNotification from "../contexts/useNotification";

export default function ToastNotification() {
  const { notificationList, removeNotification } = useNotification();

  return (
    <Container
      fixed
      maxWidth="xs"
      sx={{
        position: "fixed",
        right: 0,
        maxHeight: "90vh",
        overflowY: "scroll",
      }}
    >
      {notificationList.map((notification) => {
        return (
          <Alert
            severity={notification.type}
            onClose={() => removeNotification(notification.id)}
            key={notification.id}
            sx={{ mb: 1 }}
          >
            {notification.message}
          </Alert>
        );
      })}
    </Container>
  );
}
