import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import TestCaseList from "./pages/TestCaseList";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/test-cases" element={<TestCaseList />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
