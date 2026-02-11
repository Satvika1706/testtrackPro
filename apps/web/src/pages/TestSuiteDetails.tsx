import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../api/axios";
import { useNavigate } from "react-router-dom";

interface TestCase {
  id: string;
  title: string;
}

interface SuiteDetails {
  id: string;
  name: string;
  description?: string;
  module?: string;
  testCases: {
    id: string;
    order: number;
    testCase: TestCase;
  }[];
}

const TestSuiteDetails = () => {
  const { id } = useParams();
  const [suite, setSuite] = useState<SuiteDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [allTestCases, setAllTestCases] = useState<TestCase[]>([]);
  const [selectedTestCaseId, setSelectedTestCaseId] = useState("");
  const navigate = useNavigate();


  useEffect(() => {
    fetchSuite();
    fetchAllTestCases();
  }, []);

  const fetchSuite = async () => {
    try {
      const res = await api.get(`/api/test-suites/${id}`);
      setSuite(res.data);
    } catch (error) {
      console.error("Failed to fetch suite", error);
    } finally {
      setLoading(false);
    }
  };
  const fetchAllTestCases = async () => {
  try {
    const res = await api.get("/api/test-cases");
    setAllTestCases(res.data);
  } catch (error) {
    console.error("Failed to fetch test cases", error);
  }
};
const handleAddTestCase = async () => {
  if (!selectedTestCaseId) {
    alert("Select a test case");
    return;
  }

  try {
    await api.post(`/api/test-suites/${id}/test-cases`, {
      testCaseId: selectedTestCaseId,
    });

    alert("Test case added");
    setSelectedTestCaseId("");
    fetchSuite(); // refresh suite
  } catch (error) {
    console.error("Failed to add test case", error);
    alert("Failed to add test case");
  }
};
const handleRemoveTestCase = async (testCaseId: string) => {
  try {
    await api.delete(
      `/api/test-suites/${id}/test-cases/${testCaseId}`
    );

    alert("Test case removed");
    fetchSuite(); // refresh list
  } catch (error) {
    console.error("Failed to remove test case", error);
    alert("Failed to remove test case");
  }
};
const handleCloneSuite = async () => {
  try {
    await api.post(`/api/test-suites/${id}/clone`);

    alert("Suite cloned successfully");

    // Go back to list page
    navigate("/test-suites");

  } catch (error) {
    console.error("Failed to clone suite", error);
    alert("Failed to clone suite");
  }
};
const handleArchiveSuite = async () => {
  const confirmArchive = window.confirm(
    "Are you sure you want to archive this suite?"
  );

  if (!confirmArchive) return;

  try {
    await api.put(`/api/test-suites/${id}/archive`);

    alert("Suite archived successfully");

    navigate("/test-suites");

  } catch (error) {
    console.error("Failed to archive suite", error);
    alert("Failed to archive suite");
  }
};
const handleReorder = async (updatedOrder: string[]) => {
  try {
    await api.put(`/api/test-suites/${id}/reorder`, {
      testCaseIds: updatedOrder,
    });

    fetchSuite();
  } catch (error) {
    console.error("Reorder failed", error);
    alert("Failed to reorder");
  }
};
const moveTestCase = (index: number, direction: "up" | "down") => {
  if (!suite) return;

  const relations = [...suite.testCases];

  if (direction === "up" && index === 0) return;
  if (direction === "down" && index === relations.length - 1) return;

  const newIndex = direction === "up" ? index - 1 : index + 1;

  // swap
  [relations[index], relations[newIndex]] = 
    [relations[newIndex], relations[index]];

  // extract ids in new order
  const updatedIds = relations.map(r => r.testCase.id);

  handleReorder(updatedIds);
};



  if (loading) return <p>Loading...</p>;
  if (!suite) return <p>Suite not found</p>;

  return (
    <div style={{ padding: 20 }}>
      <h2>{suite.name}</h2>
      <button
  onClick={handleCloneSuite}
  style={{ marginRight: 10 }}
>
  Clone Suite
</button>
<button
  onClick={handleArchiveSuite}
  style={{ backgroundColor: "red", color: "white" }}
>
  Archive Suite
</button>

      <p>{suite.description}</p>
      <p>Module: {suite.module}</p>

      <h3>Test Cases in this Suite</h3>
      <h4>Add Test Case</h4>

<select
  value={selectedTestCaseId}
  onChange={(e) => setSelectedTestCaseId(e.target.value)}
>
  <option value="">Select Test Case</option>
  {allTestCases.map((tc) => (
    <option key={tc.id} value={tc.id}>
      {tc.title}
    </option>
  ))}
</select>

<button onClick={handleAddTestCase}>
  Add
</button>

<br /><br />


      {suite.testCases.length === 0 ? (
        <p>No test cases added</p>
      ) : (
        <ul>
         {[...suite.testCases]
  .sort((a, b) => a.order - b.order)
  .map((relation, index) => (

            <li key={relation.id}>
  {relation.order}. {relation.testCase.title}


  <button
    onClick={() => moveTestCase(index, "up")}
    style={{ marginLeft: 10 }}
  >
    ↑
  </button>

  <button
    onClick={() => moveTestCase(index, "down")}
  >
    ↓
  </button>

  <button
    onClick={() => handleRemoveTestCase(relation.testCase.id)}
    style={{ marginLeft: 10 }}
  >
    Remove
  </button>
</li>

  


          ))}
        </ul>
      )}
    </div>
  );
};

export default TestSuiteDetails;
