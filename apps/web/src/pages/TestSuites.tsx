import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";



interface TestSuite {
  id: string;
  name: string;
  description?: string;
  module?: string;
}

const TestSuites = () => {
  const [suites, setSuites] = useState<TestSuite[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [module, setModule] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    fetchSuites();
  }, []);

  const fetchSuites = async () => {
    try {
      const res = await api.get("/api/test-suites");
      setSuites(res.data);
    } catch (error) {
      console.error("Failed to fetch suites", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <p>Loading...</p>;
  const handleCreateSuite = async () => {
  if (!name) {
    alert("Suite name is required");
    return;
  }

  try {
    await api.post("/api/test-suites", {
      name,
      description,
      module,
    });

    alert("Suite created successfully");

    // Reset form
    setName("");
    setDescription("");
    setModule("");
    setShowForm(false);

    // Refresh list
    fetchSuites();
  } catch (error) {
    console.error("Create suite failed", error);
    alert("Failed to create suite");
  }
};
return (
  <div style={{ padding: 20 }}>
    <h2>Test Suites</h2>

    {/* Create Button */}
    <button
      onClick={() => setShowForm(!showForm)}
      style={{ marginBottom: 20 }}
    >
      {showForm ? "Cancel" : "Create Suite"}
    </button>

    {/* Create Form */}
    {showForm && (
      <div
        style={{
          border: "1px solid #ccc",
          padding: 15,
          marginBottom: 20,
          width: 300,
        }}
      >
        <h3>Create New Suite</h3>

        <input
          placeholder="Suite Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <br /><br />

        <input
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <br /><br />

        <input
          placeholder="Module"
          value={module}
          onChange={(e) => setModule(e.target.value)}
        />
        <br /><br />

        <button onClick={handleCreateSuite}>
          Save Suite
        </button>
      </div>
    )}

    {/* Loading */}
    {loading && <p>Loading...</p>}

    {/* Suite List */}
    {!loading && suites.length === 0 && (
      <p>No test suites available</p>
    )}

    {!loading && suites.length > 0 && (
      <ul>
        {suites.map((suite) => (
          <li key={suite.id} style={{ marginBottom: 15 }}>
            <strong>{suite.name}</strong>
            <br />
            <button
                 onClick={() => navigate(`/test-suites/${suite.id}`)}
                    >
                         View
            </button>

            <br />
            {suite.description}
            <br />
            Module: {suite.module}
            <hr />
          </li>
        ))}
      </ul>
    )}
  </div>
);
};

export default TestSuites;