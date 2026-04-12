import { useContext } from "react";
import { createContext } from "react";

export const NotificationContext = createContext(null);

export default function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotification must be used within NotificationProvider.",
    );
  }

  return context;
}
