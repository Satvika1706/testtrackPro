import { io, type Socket } from "socket.io-client";

export interface NotificationPayload {
  id: string;
  type: string;
  referenceId: string;
  message: string;
  createdAt: string;
   isRead: boolean;
}

let socket: Socket | null = null;

export const connectNotificationSocket = (
  token: string,
  userId: number,
  role: string,
  onNotification: (notification: NotificationPayload) => void
) => {
  if (socket) {
    socket.disconnect();
  }

  socket = io("http://localhost:5000", {
    auth: { token },
    transports: ["websocket"],
  });

  socket.on("connect", () => {
    socket?.emit("join", { userId, role });
  });

  socket.on("notification:new", onNotification);

  return socket;
};

export const disconnectNotificationSocket = () => {
  if (!socket) return;
  socket.disconnect();
  socket = null;
};