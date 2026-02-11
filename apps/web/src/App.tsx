import { BrowserRouter, Routes, Route } from "react-router-dom";
import Register from "./pages/Register";

import Login from "./pages/Login";
import TestCaseList from "./pages/TestCaseList";
import EditTestCase from "./pages/EditTestCase";
import Templates from "./pages/Templates";
import CreateTestCase from "./pages/CreateTestCase";
import TestSuites from "./pages/TestSuites";
import TestSuiteDetails from "./pages/TestSuiteDetails";





function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/register" element={<Register />} />

        <Route path="/" element={<Login />} />

        <Route path="/test-cases" element={<TestCaseList />} />
        <Route path="/test-cases/create" element={<CreateTestCase />} />

        {/* NON-OVERLAPPING EDIT ROUTE */}
        <Route path="/test-case/edit/:id" element={<EditTestCase />} />

        <Route path="/templates" element={<Templates />} />
        <Route path="/test-suites" element={<TestSuites />} />
        <Route path="/test-suites/:id" element={<TestSuiteDetails />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
