import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.routes";
import protectedRoutes from "./routes/protected.routes";
import testCaseRoutes from "./modules/testcases/testcase.routes";

import testSuiteRoutes from "./routes/test-suites/testsuite.routes";

import testRunRoutes from "./modules/testrun/testrun.routes";
import executionRoutes from "./modules/execution/execution.routes";
import bugRoutes from "./modules/bug/bug.routes";
import notificationRoutes from "./modules/notification/notification.routes";
import reportRoutes from "./modules/reports/report.routes";
import adminRoutes from "./modules/admin/admin.routes";








const app = express();

app.use(cors());
app.use(express.json());

app.use("/auth", authRoutes);
app.use("/protected", protectedRoutes);
app.get("/health", (_req, res) => {
  res.json({ status: "Backend is running" });
});
app.use("/api", testCaseRoutes);
app.use("/api", testSuiteRoutes);
app.use("/api/test-runs", testRunRoutes);
app.use("/api", executionRoutes);
app.use("/api/bugs", bugRoutes); 
app.use("/api/notifications", notificationRoutes);
app.use("/reports", reportRoutes);
app.use("/api/admin", adminRoutes);
export default app;
