import { BrowserRouter, Routes, Route } from "react-router-dom";
import Register from "./pages/Register";
import Login from "./pages/Login";
import DashboardLayout from "./layouts/DashboardLayout";

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

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Register />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />

        {/* Private Routes (Wrapped in Dashboard Layout) */}
        <Route element={<DashboardLayout />}>
          <Route path="/test-cases" element={<TestCaseList />} />
          <Route path="/test-cases/create" element={<CreateTestCase />} />
          <Route path="/test-case/edit/:id" element={<EditTestCase />} />
          <Route path="/templates" element={<Templates />} />
          <Route path="/test-suites" element={<TestSuites />} />
          <Route path="/test-suites/:id" element={<TestSuiteDetails />} />
          <Route path="/test-runs" element={<TestRunListPage />} />
          <Route path="/test-runs/:id" element={<TestRunPage />} />
          <Route path="/execution/:id" element={<ExecutionPage />} />
          <Route path="/bugs" element={<BugListPage />} />
          <Route path="/bugs/create" element={<CreateBugPage />} />
          <Route path="/bugs/:id" element={<BugDetailsPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
