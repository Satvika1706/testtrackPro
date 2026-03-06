import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { getCurrentUser } from "./utils/auth";
import Register from "./pages/Register";
import Login from "./pages/Login";
import VerifyEmailPage from "./pages/VerifyEmailPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import Dashboard from "./pages/Dashboard";
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
import ManageUsersPage from "./pages/ManageUsersPage";
import ManageRolesPage from "./pages/ManageRolesPage";
import ManageWebhooksPage from "./pages/ManageWebhooksPage";
import AdminAuditLogsPage from "./pages/AdminAuditLogsPage";
import AdminSystemSettingsPage from "./pages/AdminSystemSettingsPage";
import AdminBackupManagementPage from "./pages/AdminBackupManagementPage";
import GlobalSearchPage from "./pages/GlobalSearchPage";
import ProjectManagementPage from "./pages/ProjectManagementPage";
import { ProjectProvider } from "./context/ProjectContext";

const TESTER_ONLY = ["TESTER"] as const;
const ALL_ROLES = ["TESTER", "DEVELOPER", "ADMIN", "TRIAGE"] as const;
const DEV_BUG_ROLES = ["DEVELOPER", "TESTER", "ADMIN", "TRIAGE"] as const;
const ADMIN_ONLY = ["ADMIN"] as const;

const DashboardEntry = () => {
  const user = getCurrentUser();
  if (user?.role === "ADMIN") {
    return <Navigate to="/admin/users" replace />;
  }
  return <Dashboard />;
};

const AppFallback = () => {
  const user = getCurrentUser();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <Navigate to={user.role === "ADMIN" ? "/admin/users" : "/dashboard"} replace />;
};

function App() {
  return (
    <ProjectProvider>
      <BrowserRouter>
        <Routes>
        
        <Route path="/" element={<Register />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

     
        <Route
          element={(
            <RoleGuard allowedRoles={[...ALL_ROLES]} redirectTo="/login">
              <DashboardLayout />
            </RoleGuard>
          )}
        >
          <Route
            path="/dashboard"
            element={(
              <RoleGuard allowedRoles={[...ALL_ROLES]} redirectTo="/login">
                <DashboardEntry />
              </RoleGuard>
            )}
          />
          <Route
            path="/developer/dashboard"
            element={<Navigate to="/dashboard" replace />}
          />
          <Route
            path="/test-cases"
            element={(
              <RoleGuard allowedRoles={[...TESTER_ONLY]} redirectTo="/dashboard">
                <TestCaseList />
              </RoleGuard>
            )}
          />
          <Route
            path="/test-cases/create"
            element={(
              <RoleGuard allowedRoles={[...TESTER_ONLY]} redirectTo="/dashboard">
                <CreateTestCase />
              </RoleGuard>
            )}
          />
          <Route
            path="/test-cases/new"
            element={<Navigate to="/test-cases/create" replace />}
          />
          <Route
            path="/test-case/edit/:id"
            element={(
              <RoleGuard allowedRoles={[...TESTER_ONLY]} redirectTo="/dashboard">
                <EditTestCase />
              </RoleGuard>
            )}
          />
          <Route
            path="/templates"
            element={(
              <RoleGuard allowedRoles={[...TESTER_ONLY]} redirectTo="/dashboard">
                <Templates />
              </RoleGuard>
            )}
          />
          <Route
            path="/test-suites"
            element={(
              <RoleGuard allowedRoles={[...TESTER_ONLY]} redirectTo="/dashboard">
                <TestSuites />
              </RoleGuard>
            )}
          />
          <Route
            path="/test-suites/:id"
            element={(
              <RoleGuard allowedRoles={[...TESTER_ONLY]} redirectTo="/dashboard">
                <TestSuiteDetails />
              </RoleGuard>
            )}
          />
          <Route
            path="/test-runs"
            element={(
              <RoleGuard allowedRoles={[...TESTER_ONLY]} redirectTo="/dashboard">
                <TestRunListPage />
              </RoleGuard>
            )}
          />
          <Route
            path="/test-runs/:id"
            element={(
              <RoleGuard allowedRoles={[...TESTER_ONLY]} redirectTo="/dashboard">
                <TestRunPage />
              </RoleGuard>
            )}
          />
          <Route
            path="/execution/:id"
            element={(
              <RoleGuard allowedRoles={[...TESTER_ONLY]} redirectTo="/dashboard">
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
              <RoleGuard allowedRoles={["TESTER", "DEVELOPER", "ADMIN", "TRIAGE"]} redirectTo="/dashboard">
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
          <Route
            path="/admin/users"
            element={(
              <RoleGuard allowedRoles={[...ADMIN_ONLY]} redirectTo="/reports">
                <ManageUsersPage />
              </RoleGuard>
            )}
          />
          <Route
            path="/admin/roles"
            element={(
              <RoleGuard allowedRoles={[...ADMIN_ONLY]} redirectTo="/reports">
                <ManageRolesPage />
              </RoleGuard>
            )}
          />
          <Route
            path="/admin/webhooks"
            element={(
              <RoleGuard allowedRoles={[...ADMIN_ONLY]} redirectTo="/reports">
                <ManageWebhooksPage />
              </RoleGuard>
            )}
          />
          <Route
            path="/admin/audit-logs"
            element={(
              <RoleGuard allowedRoles={[...ADMIN_ONLY]} redirectTo="/reports">
                <AdminAuditLogsPage />
              </RoleGuard>
            )}
          />
          <Route path="/admin/auditlogs" element={<Navigate to="/admin/audit-logs" replace />} />
          <Route
            path="/admin/system-settings"
            element={(
              <RoleGuard allowedRoles={[...ADMIN_ONLY]} redirectTo="/reports">
                <AdminSystemSettingsPage />
              </RoleGuard>
            )}
          />
          <Route path="/admin/system-config" element={<Navigate to="/admin/system-settings" replace />} />
          <Route
            path="/admin/backups"
            element={(
              <RoleGuard allowedRoles={[...ADMIN_ONLY]} redirectTo="/reports">
                <AdminBackupManagementPage />
              </RoleGuard>
            )}
          />
          <Route path="/admin/backup-management" element={<Navigate to="/admin/backups" replace />} />
          <Route
            path="/projects"
            element={(
              <RoleGuard allowedRoles={["TESTER", "DEVELOPER", "ADMIN", "TRIAGE"]} redirectTo="/dashboard">
                <ProjectManagementPage />
              </RoleGuard>
            )}
          />
          <Route
            path="/search"
            element={(
              <RoleGuard allowedRoles={[...ALL_ROLES]} redirectTo="/login">
                <GlobalSearchPage />
              </RoleGuard>
            )}
          />
        </Route>
        <Route path="*" element={<AppFallback />} />
        </Routes>
      </BrowserRouter>
    </ProjectProvider>
  );
}

export default App;
