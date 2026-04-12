import { useState } from "react";
import { NotificationContext } from "./useNotification";

export default function NotificationProvider({ children }) {
  const [notificationList, setNotificationList] = useState([]);

  const removeNotification = (id) => {
    setNotificationList((prev) =>
      prev.filter((notification) => notification.id !== id),
    );
  };

  const addNotification = (notification) => {
    setNotificationList((prev) => {
      const id = prev.length ? prev[prev.length - 1].id + 1 : 0;

      const newNotification = {
        duration: 5000,
        type: "error",
        ...notification,
        id,
      };

      setTimeout(() => {
        removeNotification(id);
      }, newNotification.duration);

      return [...prev, newNotification];
    });
  };

  return (
    <NotificationContext.Provider
      value={{
        notificationList,
        addNotification,
        removeNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}
