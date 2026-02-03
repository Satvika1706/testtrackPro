import express from "express";
import cors from "cors";

const app = express();

// middleware
app.use(cors());
app.use(express.json());

// health check route
app.get("/health", (_req, res) => {
  res.json({ status: "Backend is running" });
});

export default app;
