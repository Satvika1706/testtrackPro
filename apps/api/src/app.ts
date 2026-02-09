import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.routes";
import protectedRoutes from "./routes/protected.routes";
import testCaseRoutes from "./modules/testcases/testcase.routes";






const app = express();

app.use(cors());
app.use(express.json());

app.use("/auth", authRoutes);
app.use("/protected", protectedRoutes);
app.get("/health", (_req, res) => {
  res.json({ status: "Backend is running" });
});
app.use("/api", testCaseRoutes);
export default app;
