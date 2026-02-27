import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Register from "./pages/Register";
import Login from "./pages/Login";
import VerifyEmailPage from "./pages/VerifyEmailPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import DashboardLayout from "./layouts/DashboardLayout";
import RoleGuard from "./components/RoleGuard";

import TestCaseList from "./pages/TestCaseList";
import EditTestCase from "./pages/EditTestCase";
import Templates from "./pages/Templates";
import CreateTestCase from "./pages/CreateTestCase";
import TestSuites from "./pages/TestSuites";
import TestSuiteDetails from "./pages/TestSuiteDetails";
import ExecutionPage from "./pages/ExecutionPage";
import TestRunPage from "./pages/TestRunPage";
import TestRunListPage from "./pages/TestRunListPage";
import BugListPage from "./pages/BugListPage";
import CreateBugPage from "./pages/CreateBugPage";
import BugDetailsPage from "./pages/BugDetailsPage";
import NotificationsPage from "./pages/NotificationsPage";
import ReportsPage from "./pages/ReportsPage";
import TestExecutionReportPage from "./pages/TestExecutionReportPage";
import BugReportPage from "./pages/BugReportPage";
import DeveloperPerformanceReportPage from "./pages/DeveloperPerformanceReportPage";
import TesterPerformanceReportPage from "./pages/TesterPerformanceReportPage";
import DeveloperDashboardPage from "./pages/DeveloperDashboardPage";

const TESTER_ONLY = ["TESTER"] as const;
const DEVELOPER_ONLY = ["DEVELOPER"] as const;
const ALL_ROLES = ["TESTER", "DEVELOPER", "ADMIN", "TRIAGE"] as const;
const DEV_BUG_ROLES = ["DEVELOPER", "TESTER", "ADMIN", "TRIAGE"] as const;

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Register />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* Private Routes (Wrapped in Dashboard Layout) */}
        <Route
          element={(
            <RoleGuard allowedRoles={[...ALL_ROLES]} redirectTo="/login">
              <DashboardLayout />
            </RoleGuard>
          )}
        >
          <Route
            path="/developer/dashboard"
            element={(
              <RoleGuard allowedRoles={[...DEVELOPER_ONLY]} redirectTo="/bugs">
                <DeveloperDashboardPage />
              </RoleGuard>
            )}
          />
          <Route
            path="/test-cases"
            element={(
              <RoleGuard allowedRoles={[...TESTER_ONLY]} redirectTo="/developer/dashboard">
                <TestCaseList />
              </RoleGuard>
            )}
          />
          <Route
            path="/test-cases/create"
            element={(
              <RoleGuard allowedRoles={[...TESTER_ONLY]} redirectTo="/developer/dashboard">
                <CreateTestCase />
              </RoleGuard>
            )}
          />
          <Route
            path="/test-case/edit/:id"
            element={(
              <RoleGuard allowedRoles={[...TESTER_ONLY]} redirectTo="/developer/dashboard">
                <EditTestCase />
              </RoleGuard>
            )}
          />
          <Route
            path="/templates"
            element={(
              <RoleGuard allowedRoles={[...TESTER_ONLY]} redirectTo="/developer/dashboard">
                <Templates />
              </RoleGuard>
            )}
          />
          <Route
            path="/test-suites"
            element={(
              <RoleGuard allowedRoles={[...TESTER_ONLY]} redirectTo="/developer/dashboard">
                <TestSuites />
              </RoleGuard>
            )}
          />
          <Route
            path="/test-suites/:id"
            element={(
              <RoleGuard allowedRoles={[...TESTER_ONLY]} redirectTo="/developer/dashboard">
                <TestSuiteDetails />
              </RoleGuard>
            )}
          />
          <Route
            path="/test-runs"
            element={(
              <RoleGuard allowedRoles={[...TESTER_ONLY]} redirectTo="/developer/dashboard">
                <TestRunListPage />
              </RoleGuard>
            )}
          />
          <Route
            path="/test-runs/:id"
            element={(
              <RoleGuard allowedRoles={[...TESTER_ONLY]} redirectTo="/developer/dashboard">
                <TestRunPage />
              </RoleGuard>
            )}
          />
          <Route
            path="/execution/:id"
            element={(
              <RoleGuard allowedRoles={[...TESTER_ONLY]} redirectTo="/developer/dashboard">
                <ExecutionPage />
              </RoleGuard>
            )}
          />
          <Route
            path="/bugs"
            element={(
              <RoleGuard allowedRoles={[...DEV_BUG_ROLES]} redirectTo="/login">
                <BugListPage />
              </RoleGuard>
            )}
          />
          <Route
            path="/bugs/create"
            element={(
              <RoleGuard allowedRoles={["TESTER", "ADMIN"]} redirectTo="/bugs">
                <CreateBugPage />
              </RoleGuard>
            )}
          />
          <Route
            path="/bugs/:id"
            element={(
              <RoleGuard allowedRoles={[...DEV_BUG_ROLES]} redirectTo="/login">
                <BugDetailsPage />
              </RoleGuard>
            )}
          />
          <Route
            path="/notifications"
            element={(
              <RoleGuard allowedRoles={["TESTER", "DEVELOPER", "ADMIN", "TRIAGE"]} redirectTo="/developer/dashboard">
                <NotificationsPage />
              </RoleGuard>
            )}
          />
          <Route
            path="/reports"
            element={(
              <RoleGuard allowedRoles={[...ALL_ROLES]} redirectTo="/login">
                <ReportsPage />
              </RoleGuard>
            )}
          />
          <Route
            path="/reports/test-execution"
            element={(
              <RoleGuard allowedRoles={[...ALL_ROLES]} redirectTo="/login">
                <TestExecutionReportPage />
              </RoleGuard>
            )}
          />
          <Route
            path="/reports/bugs"
            element={(
              <RoleGuard allowedRoles={[...ALL_ROLES]} redirectTo="/login">
                <BugReportPage />
              </RoleGuard>
            )}
          />
          <Route
            path="/reports/developer-performance"
            element={(
              <RoleGuard allowedRoles={["ADMIN", "DEVELOPER"]} redirectTo="/reports">
                <DeveloperPerformanceReportPage />
              </RoleGuard>
            )}
          />
          <Route
            path="/reports/tester-performance"
            element={(
              <RoleGuard allowedRoles={["TESTER", "ADMIN", "TRIAGE"]} redirectTo="/reports">
                <TesterPerformanceReportPage />
              </RoleGuard>
            )}
          />
        </Route>
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
