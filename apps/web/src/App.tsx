import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import TestCaseList from "./pages/TestCaseList";
import EditTestCase from "./pages/EditTestCase";
import Templates from "./pages/Templates";
import CreateTestCase from "./pages/CreateTestCase";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/test-cases" element={<TestCaseList />} />
        <Route path="/test-cases" element={<TestCaseList />} />
        <Route path="/test-cases/:id" element={<EditTestCase />} />
        <Route path="/templates" element={<Templates />} />
        <Route path="/test-cases/new" element={<CreateTestCase />} />


      </Routes>
    </BrowserRouter>
  );
}





export default App;
