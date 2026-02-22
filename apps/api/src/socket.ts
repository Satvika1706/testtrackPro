import { Server } from "socket.io";
import type { Server as HTTPServer } from "http";

let io: Server;

export const initializeSocket = (server: HTTPServer) => {
  io = new Server(server, {
    cors: {
      origin: "http://localhost:5173",
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    console.log("🔌 User connected:", socket.id);

    socket.on("join", ({ userId, role }) => {
      socket.join(`user:${userId}`);
      socket.join(`role:${role}`);

      console.log(`User ${userId} joined room`);
    });

    socket.on("disconnect", () => {
      console.log("❌ User disconnected:", socket.id);
    });
  });
};

export const getIO = () => {
  if (!io) throw new Error("Socket not initialized");
  return io;
};

export const emitToUser = (userId: number, event: string, payload: any) => {
  if (!io) return;
  io.to(`user:${userId}`).emit(event, payload);
};

export const emitToRole = (role: string, event: string, payload: any) => {
  if (!io) return;
  io.to(`role:${role}`).emit(event, payload);
};